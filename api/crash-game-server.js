const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      process.env.FRONTEND_URL_ALT || 'http://localhost:3000',
    ],
    credentials: true,
  },
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const SERVER_SECRET = process.env.GAME_SERVER_SECRET || 'your-secret-key';
const PORT = process.env.GAME_SERVER_PORT || 5000;

// ========================
// СОСТОЯНИЕ ИГРЫ
// ========================

class GameRoom {
  constructor() {
    this.gameId = uuidv4();
    this.status = 'waiting'; // waiting, in_progress, crashed
    this.players = new Map();
    this.startTime = null;
    this.crashPoint = null;
    this.multiplier = 1.0;
    this.gameLoopInterval = null;
    this.countdownTimer = 5;
    this.roundKeys = this.generateRoundKeys();
  }

  generateRoundKeys() {
    return {
      serverSeed: crypto.randomBytes(32).toString('hex'),
      clientSeed: crypto.randomBytes(16).toString('hex'),
      serverSeedHash: null,
    };
  }

  // 🔴 ИСПРАВЛЕНО: Корректная генерация Crash Point из хеша
 generateCrashPoint() {
    const combined = this.roundKeys.serverSeed + this.roundKeys.clientSeed;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');

    const hex = hash.substring(0, 13);
    const hmac = parseInt(hex, 16);
    const MAX_HEX_VALUE = 0x10000000000000; // 2^52
    let U = hmac / MAX_HEX_VALUE; // U in [0, 1)

    // 1. ВВЕДЕНИЕ ХАУСКАУНТА (House Edge) 
    // Для реального казино (RTP 97-99%):
    const HOUSE_EDGE_RTP_PERCENT = 94; // 97% RTP (3% House Edge)
    const SAFE_MAX = 100 / (100 + (100 - HOUSE_EDGE_RTP_PERCENT)); // 100 / 103 ≈ 0.9708

    // Проверяем, попадает ли U в невыигрышный диапазон (от 0.9708 до 1.00)
    // Если U больше максимального выигрышного шанса
    if (U >= SAFE_MAX) { 
        return 1.00; // Мгновенное падение, не даем выигрыша
    }

    // 2. Нормализация U и применение формулы
    // Нормализуем U, чтобы оно снова было в диапазоне [0, 1)
    U = U / SAFE_MAX; 

    // Защита от Math.log(0)
    if (U === 0) { 
        U = 1 / MAX_HEX_VALUE;
    }
    
    // Формула для Crash: X = 100 / (100 - U * 100)
    // Чтобы получить экспоненциальное распределение с заданным Хаускаунтом.
    const final_crash = 100 / (100 - U * 100); 

    // Используем Math.max для гарантии 1.01x
    const crashPoint = Math.max(1.01, parseFloat(final_crash.toFixed(2)));
    return crashPoint;
}

  async startRound() {
    this.gameId = uuidv4();
    this.roundKeys = this.generateRoundKeys();
    this.roundKeys.serverSeedHash = crypto
      .createHash('sha256')
      .update(this.roundKeys.serverSeed)
      .digest('hex');

    this.crashPoint = this.generateCrashPoint();
    this.startTime = Date.now();
    this.status = 'in_progress';
    this.multiplier = 1.0;

    this.players.forEach(p => (p.cashed_out = false));
    
    // 🟢 НОВОЕ: Сохраняем информацию о новом раунде в БД
    await this.saveRoundInfoToBackend();

    console.log(`🎮 Раунд начат: ${this.gameId}, Crash: ${this.crashPoint}x`);

    // Отправляем всем что раунд начался
    io.to('crash-room').emit('roundStarted', {
      gameId: this.gameId,
      serverSeedHash: this.roundKeys.serverSeedHash,
      clientSeed: this.roundKeys.clientSeed,
    });

    // Game loop
    this.gameLoopInterval = setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;
      this.multiplier = Math.pow(1.1, elapsed);

      io.to('crash-room').emit('multiplierUpdate', {
        multiplier: parseFloat(this.multiplier.toFixed(2)),
        gameId: this.gameId,
      });

      if (this.multiplier >= this.crashPoint) {
        this.crash();
      }
    }, 50);
  }

  async crash() {
    clearInterval(this.gameLoopInterval);
    this.status = 'crashed';
    this.multiplier = this.crashPoint;

    const losers = [];
    const winners = [];

    this.players.forEach(player => {
      if (!player.cashed_out) {
        player.result = 'lost';
        losers.push(player);
      } else {
        player.result = 'won';
        winners.push(player);
      }
    });

    // 🟢 ИСПРАВЛЕНО: Финализируем результаты раунда
    await this.finalizeRoundResults(losers, winners);

    io.to('crash-room').emit('gameCrashed', {
      crashPoint: this.crashPoint,
      gameId: this.gameId,
      winners: winners.map(w => ({
        userId: w.userId,
        bet: w.bet,
        multiplier: w.multiplier,
        winnings: w.winnings,
      })),
      losersCount: losers.length,
    });

    // Таймер до следующего раунда
    setTimeout(() => {
      this.status = 'waiting';
      this.countdownTimer = 5;
      this.countdown();
    }, 3000);
  }

  countdown() {
    const timer = setInterval(() => {
      io.to('crash-room').emit('countdownUpdate', {
        seconds: this.countdownTimer,
      });

      if (this.countdownTimer <= 0) {
        clearInterval(timer);
        this.startRound();
      }
      this.countdownTimer--;
    }, 1000);
  }

  // 🟢 НОВОЕ: Сохранение метаданных раунда в начале
  async saveRoundInfoToBackend() {
    try {
        await axios.post(
            `${BACKEND_URL}/api/v1/crash/start-round`,
            { 
                gameId: this.gameId,
                crashPoint: this.crashPoint,
                serverSeedHash: this.roundKeys.serverSeedHash,
                clientSeed: this.roundKeys.clientSeed,
            },
            {
                headers: { 'X-Server-Secret': SERVER_SECRET },
            }
        );
    } catch (error) {
        console.error('❌ Ошибка сохранения информации о раунде:', error.message);
    }
  }

  // 🟢 ПЕРЕИМЕНОВАНО: Финализация результатов и зачисление выигрышей
  async finalizeRoundResults(losers, winners) {
    try {
      // 1. Отправляем результаты на backend для каждого игрока
      for (const player of this.players.values()) {
        const isWinner = winners.find(w => w.userId === player.userId);

        // 2. Обновляем статус ставки в БД и зачисляем выигрыш (для победителей)
        await axios.post(
          `${BACKEND_URL}/api/v1/crash/cashout-result`,
          {
            userId: player.userId,
            tokenId: player.tokenId,
            betId: player.betId, // Используем сохраненный betId
            winnings: isWinner ? parseFloat(player.winnings) : 0,
            exitMultiplier: isWinner ? player.multiplier : null,
            gameId: this.gameId,
            result: isWinner ? 'won' : 'lost',
          },
          {
            headers: {
              'X-Server-Secret': SERVER_SECRET,
            },
          }
        );

        console.log(
          `${isWinner ? '✅' : '❌'} User ${player.userId}: ${
            isWinner
              ? `Won ${player.winnings} on ${player.multiplier}x`
              : 'Lost bet'
          }`
        );
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения результатов раунда:', error.message);
    }
  }
}

let gameRoom = new GameRoom();

// ========================
// WebSocket СОБЫТИЯ
// ========================

io.on('connection', socket => {
  console.log(`👤 Новое подключение: ${socket.id}`);

  socket.on('joinGame', data => {
    const { userId, userName } = data;
    // ... (остальной код joinGame без изменений)
    
    socket.join('crash-room');

    gameRoom.players.set(socket.id, {
      socketId: socket.id,
      userId,
      userName,
      bet: 0,
      tokenId: 0,
      multiplier: null,
      winnings: 0,
      cashed_out: false,
      result: null,
      betId: null, // Инициализируем betId
    });

    console.log(`👥 Всего: ${gameRoom.players.size} игроков`);

    socket.emit('gameStatus', {
      status: gameRoom.status,
      multiplier: gameRoom.multiplier,
      gameId: gameRoom.gameId,
      crashPoint: gameRoom.status === 'crashed' ? gameRoom.crashPoint : null,
      playersCount: gameRoom.players.size,
      countdown: gameRoom.countdownTimer,
    });

    io.to('crash-room').emit('playerJoined', {
      playersCount: gameRoom.players.size,
    });
  });

  socket.on('placeBet', async data => {
    const { amount, tokenId } = data;
    const player = gameRoom.players.get(socket.id);

    if (!player) {
      socket.emit('error', 'Игрок не найден');
      return;
    }

    if (gameRoom.status !== 'waiting') {
      socket.emit('error', 'Раунд уже начался');
      return;
    }

    // Проверяем баланс на backend'е (снимаем средства)
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/v1/crash/verify-bet`,
        { amount, tokenId },
        {
          headers: {
            Authorization: `Bearer ${socket.handshake.auth.token || ''}`,
          },
        }
      );

      if (!response.data.success) {
        socket.emit('error', 'Недостаточно средств');
        return;
      }
      
      // 🟢 НОВОЕ: Создаем запись ставки в БД и получаем betId
      const betCreationResponse = await axios.post(
          `${BACKEND_URL}/api/v1/crash/create-bet`,
          { userId: player.userId, gameId: gameRoom.gameId, amount, tokenId },
          { headers: { 'X-Server-Secret': SERVER_SECRET } }
      );
      
      // Сохраняем ставку и ее ID из БД в памяти игрока
      player.bet = amount;
      player.tokenId = tokenId;
      player.betId = betCreationResponse.data.data.betId; // 💡 Ключевой момент!

      socket.emit('betPlaced', {
        bet: amount,
        gameId: gameRoom.gameId,
      });

      io.to('crash-room').emit('betsUpdated', {
        activePlayersCount: Array.from(gameRoom.players.values()).filter(
          p => p.bet > 0
        ).length,
      });
    } catch (error) {
      console.error('❌ Ошибка проверки баланса или создания ставки:', error.message);
      socket.emit('error', 'Ошибка при обработке ставки');
    }
  });

  socket.on('cashout', () => {
    const player = gameRoom.players.get(socket.id);

    // ... (остальной код cashout без изменений)

    if (!player) {
      socket.emit('error', 'Игрок не найден');
      return;
    }

    if (gameRoom.status !== 'in_progress') {
      socket.emit('error', 'Раунд не в процессе');
      return;
    }

    if (player.cashed_out) {
      socket.emit('error', 'Вы уже вышли');
      return;
    }

    // Успешный кэшаут
    player.cashed_out = true;
    player.multiplier = gameRoom.multiplier;
    player.winnings = player.bet * gameRoom.multiplier;

    socket.emit('cashoutSuccess', {
      multiplier: gameRoom.multiplier,
      winnings: player.winnings,
    });

    io.to('crash-room').emit('playerCashedOut', {
      userName: player.userName,
      multiplier: gameRoom.multiplier,
      winnings: player.winnings,
    });

    console.log(`💰 ${player.userName} вышел на ${gameRoom.multiplier}x`);
  });

  socket.on('disconnect', () => {
    const player = gameRoom.players.get(socket.id);
    if (player) {
      console.log(`👋 ${player.userName} отключился`);
      gameRoom.players.delete(socket.id);

      io.to('crash-room').emit('playerJoined', {
        playersCount: gameRoom.players.size,
      });
    }
  });
});

// ========================
// HTTP ENDPOINTS
// ========================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    gameState: {
      gameId: gameRoom.gameId,
      status: gameRoom.status,
      multiplier: gameRoom.multiplier,
      crashPoint: gameRoom.crashPoint,
      playersCount: gameRoom.players.size,
    },
  });
});

// ========================
// ЗАПУСК СЕРВЕРА
// ========================

server.listen(PORT, () => {
  console.log(`🚀 Crash Game Server запущен на порту ${PORT}`);
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);

  // Начинаем первый раунд через 5 сек
  setTimeout(() => {
    gameRoom.startRound();
  }, 5000);
});