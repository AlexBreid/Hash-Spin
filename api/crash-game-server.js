// ========================
// ✅ ИСПРАВЛЕННЫЙ GAME SERVER
// ========================

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
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL_ALT,
    ],
    credentials: true,
  },
});

// ========================
// КОНФИГУРАЦИЯ
// ========================
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const API_VERSION = '/api/v1';
const SERVER_SECRET = process.env.GAME_SERVER_SECRET;

const PORT = process.env.GAME_SERVER_PORT || 5000;

const log = {
  info: (msg, data = '') => console.log(`ℹ️ [${new Date().toLocaleTimeString()}] ${msg}`, data),
  success: (msg, data = '') => console.log(`✅ [${new Date().toLocaleTimeString()}] ${msg}`, data),
  error: (msg, data = '') => console.error(`❌ [${new Date().toLocaleTimeString()}] ${msg}`, data),
};
log.info('Loaded Server Secret (first 5 chars):', SERVER_SECRET ? SERVER_SECRET.substring(0, 5) + '...' : '❌ NOT LOADED');

// ========================
// РАСПРЕДЕЛЕНИЕ ВЕРОЯТНОСТЕЙ
// ========================
function calculateCrashPointFromRandom(randomValue) {
  if (randomValue < 0.75) {
    const normalized = randomValue / 0.75;
    const crashPoint = 1.0 + (normalized * 1.0);
    return parseFloat(crashPoint.toFixed(2));
  } 
  else if (randomValue < 0.90) {
    const normalized = (randomValue - 0.75) / 0.15;
    const crashPoint = 2.0 + (Math.pow(normalized, 1.5) * 13.0);
    return parseFloat(crashPoint.toFixed(2));
  }
  else if (randomValue < 0.94) {
    const normalized = (randomValue - 0.90) / 0.04;
    const crashPoint = 15.0 + (Math.pow(normalized, 2.0) * 15.0);
    return parseFloat(crashPoint.toFixed(2));
  }
  else if (randomValue < 0.95) {
    const normalized = (randomValue - 0.94) / 0.01;
    const crashPoint = 30.0 + (Math.pow(normalized, 0.5) * 70.0);
    return parseFloat(Math.min(crashPoint, 100.0).toFixed(2));
  }
  else {
    const normalized = (randomValue - 0.95) / 0.05;
    const crashPoint = 1.5 + (normalized * 1.5);
    return parseFloat(crashPoint.toFixed(2));
  }
}

// ========================
// ХРАНИЛИЩЕ ИСТОРИИ КРАШЕЙ (В ПАМЯТИ)
// ✅ ПРИМЕЧАНИЕ: Основная история теперь в БД, это только для live-обновлений
// ========================
let crashHistory = [];

function addToCrashHistory(gameId, crashPoint, timestamp) {
  crashHistory.unshift({
    id: gameId,
    gameId,
    crashPoint,
    timestamp: new Date(timestamp),
  });
  
  // Храним максимум 50 последних крашей в памяти (для сокетов)
  if (crashHistory.length > 50) {
    crashHistory = crashHistory.slice(0, 50);
  }
  
  log.info(`📊 История обновлена. Всего крашей в памяти: ${crashHistory.length}`);
}

// ========================
// ИГРОВАЯ КОМНАТА
// ========================
class GameRoom {
  constructor() {
    this.gameId = uuidv4();
    this.status = 'waiting';
    this.players = new Map();
    this.startTime = null;
    this.crashPoint = null;
    this.multiplier = 1.0;
    this.gameLoopInterval = null;
    this.countdownTimer = 5;
    this.roundKeys = this.generateRoundKeys();
    this.finalizationInProgress = false; // ✅ Флаг для защиты от двойной финализации
  }

  generateRoundKeys() {
    return {
      serverSeed: crypto.randomBytes(32).toString('hex'),
      clientSeed: crypto.randomBytes(16).toString('hex'),
      serverSeedHash: null,
    };
  }

  generateCrashPoint() {
    const combined = this.roundKeys.serverSeed + this.roundKeys.clientSeed;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    
    const hex = hash.substring(0, 13);
    const hmac = parseInt(hex, 16);
    const MAX_HEX_VALUE = 0x10000000000000;
    let randomValue = hmac / MAX_HEX_VALUE;

    const crashPoint = calculateCrashPointFromRandom(randomValue);

    log.info(`🎲 Генерирую crash point: randomValue=${randomValue.toFixed(4)}, crashPoint=${crashPoint}x`);

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
    this.finalizationInProgress = false; // ✅ Сбрасываем флаг для нового раунда

    this.players.forEach(p => (p.cashed_out = false));

    try {
      await this.saveRoundInfoToBackend();
      log.success(`Раунд начат: ${this.gameId}, Crash: ${this.crashPoint}x`);
    } catch (error) {
      log.error(`Ошибка сохранения раунда: ${error.message}`);
    }

    io.to('crash-room').emit('roundStarted', {
      gameId: this.gameId,
      serverSeedHash: this.roundKeys.serverSeedHash,
      clientSeed: this.roundKeys.clientSeed,
    });

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

    // ✅ ИСПРАВЛЕНИЕ #1: Защита от двойного вызова crash()
    if (this.finalizationInProgress) {
      log.error('⚠️ Финализация уже в процессе, пропускаю повторный вызов');
      return;
    }
    this.finalizationInProgress = true;

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

    // ✅ Добавляем краш в историю ДО отправки события
    const crashTimestamp = new Date();
    addToCrashHistory(this.gameId, this.crashPoint, crashTimestamp);

    try {
      await this.finalizeRoundResults(losers, winners);
    } catch (error) {
      log.error(`Ошибка финализации: ${error.message}`);
    }

    // ✅ Отправляем событие краша с информацией о победителях
    io.to('crash-room').emit('gameCrashed', {
      crashPoint: this.crashPoint,
      gameId: this.gameId,
      timestamp: crashTimestamp,
      winners: winners.map(w => ({
        userId: w.userId,
        bet: w.bet,
        multiplier: w.multiplier,
        winnings: w.winnings,
      })),
      losersCount: losers.length,
    });

    // ✅ Отправляем обновленную историю крашей на фронт
    io.to('crash-room').emit('crashHistoryUpdated', {
      history: crashHistory.slice(0, 10), // Последние 10
      totalInMemory: crashHistory.length,
    });

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

  async saveRoundInfoToBackend() {
    try {
      const url = `${BACKEND_URL}${API_VERSION}/crash/start-round`;

      const response = await axios.post(
        url,
        {
          gameId: this.gameId,
          crashPoint: this.crashPoint,
          serverSeedHash: this.roundKeys.serverSeedHash,
          clientSeed: this.roundKeys.clientSeed,
        },
        {
          headers: { 'X-Server-Secret': SERVER_SECRET },
          timeout: 5000,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Unknown error');
      }

      return response.data.data.roundId;
    } catch (error) {
      log.error(`Ошибка сохранения раунда: ${error.message}`);
      throw error;
    }
  }

  async finalizeRoundResults(losers, winners) {
    try {
      log.info(`📤 Финализирую результаты для ${this.players.size} игроков`);

      // ✅ ИСПРАВЛЕНИЕ #2: Обрабатываем результаты параллельно, но с контролем
      const promises = Array.from(this.players.values()).map(async (player) => {
        if (!player.betId) {
          log.error(`❌ Нет betId для player ${player.userId}!`);
          return;
        }

        const isWinner = winners.find(w => w.userId === player.userId);

        try {
          const url = `${BACKEND_URL}${API_VERSION}/crash/cashout-result`;

          // 🆕 ДОБАВЛЯЕМ balanceType и userBonusId в payload!
          const payload = {
            userId: player.userId,
            tokenId: player.tokenId,
            betId: player.betId,
            winnings: isWinner ? parseFloat(player.winnings.toString()) : 0,
            exitMultiplier: isWinner ? player.multiplier : null,
            gameId: this.gameId,
            result: isWinner ? 'won' : 'lost',
            balanceType: player.balanceType || 'MAIN',      // 🆕
            userBonusId: player.userBonusId || null         // 🆕
          };

          log.info(`📤 Отправляю результат ${player.userName} (balanceType=${player.balanceType}):`, JSON.stringify(payload));

          const response = await axios.post(
            url,
            payload,
            {
              headers: {
                'X-Server-Secret': SERVER_SECRET,
                'Content-Type': 'application/json'
              },
              timeout: 5000,
            }
          );

          if (response.data.success) {
            log.success(
              `${isWinner ? '💰' : '😢'} ${player.userName}: ${
                isWinner
                  ? `+${player.winnings} на ${player.multiplier}x`
                  : 'потеря ставки'
              }`
            );
          } else {
            log.error(`Server error for ${player.userId}: ${response.data.error}`);
          }
        } catch (error) {
          log.error(`Ошибка для ${player.userId}: ${error.message}`);
          if (error.response?.data) {
            log.error(`Response:`, JSON.stringify(error.response.data));
          }
        }
      });

      // Ждём завершения всех финализаций
      await Promise.all(promises);

      log.success('✅ Все ставки финализированы');
    } catch (error) {
      log.error(`Ошибка в finalize: ${error.message}`);
      throw error;
    }
  }
}

let gameRoom = new GameRoom();

// ========================
// WebSocket СОБЫТИЯ
// ========================
io.on('connection', socket => {
  log.info(`Новое подключение: ${socket.id}`);

  socket.on('joinGame', data => {
    const { userId, userName } = data;

    if (!userId || !userName) {
      socket.emit('error', 'Missing userId or userName');
      return;
    }

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
      betId: null,
      balanceType: 'MAIN',       // 🆕 ДОБАВЛЕНО
      userBonusId: null,         // 🆕 ДОБАВЛЕНО
    });

    log.info(`${userName} присоединился. Всего: ${gameRoom.players.size}`);

    socket.emit('gameStatus', {
      status: gameRoom.status,
      multiplier: gameRoom.multiplier,
      gameId: gameRoom.gameId,
      crashPoint: gameRoom.status === 'crashed' ? gameRoom.crashPoint : null,
      playersCount: gameRoom.players.size,
      countdown: gameRoom.countdownTimer,
    });

    // ✅ Отправляем историю при присоединении (из памяти, основная в БД)
    socket.emit('crashHistoryUpdated', {
      history: crashHistory.slice(0, 10),
      totalInMemory: crashHistory.length,
    });

    io.to('crash-room').emit('playerJoined', {
      playersCount: gameRoom.players.size,
    });
  });

  socket.on('placeBet', async data => {
    const { amount, tokenId, token } = data;
    const player = gameRoom.players.get(socket.id);

    if (!player) {
      socket.emit('error', 'Player not found');
      return;
    }

    if (gameRoom.status !== 'waiting') {
      socket.emit('error', 'Round already started');
      return;
    }

    if (!amount || amount <= 0 || !tokenId) {
      socket.emit('error', 'Invalid bet parameters');
      return;
    }

    try {
      if (!token) {
        socket.emit('error', 'Authentication token required');
        log.error(`Нет токена для user ${player.userId}`);
        return;
      }

      const verifyUrl = `${BACKEND_URL}${API_VERSION}/crash/verify-bet`;
      log.info(`📤 Проверяю ставку для user ${player.userId}...`);

      const verifyResponse = await axios.post(
        verifyUrl,
        { amount, tokenId },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000,
        }
      );

      if (!verifyResponse.data.success) {
        socket.emit('error', verifyResponse.data.error || 'Insufficient balance');
        return;
      }

      const createBetUrl = `${BACKEND_URL}${API_VERSION}/crash/create-bet`;
      log.info(`📤 Создаю ставку: user=${player.userId}, amount=${amount}, tokenId=${tokenId}`);

      const createBetResponse = await axios.post(
        createBetUrl,
        {
          userId: player.userId,
          gameId: gameRoom.gameId,
          amount,
          tokenId,
        },
        {
          headers: { 
            'X-Server-Secret': SERVER_SECRET,
            'Content-Type': 'application/json'
          },
          timeout: 5000,
        }
      );

      if (!createBetResponse.data.success) {
        socket.emit('error', 'Failed to create bet');
        return;
      }

      player.bet = amount;
      player.tokenId = tokenId;
      player.betId = createBetResponse.data.data.betId;
      player.balanceType = createBetResponse.data.data.balanceType;    // 🆕 СОХРАНЯЕМ
      player.userBonusId = createBetResponse.data.data.userBonusId;    // 🆕 СОХРАНЯЕМ

      log.success(`Ставка принята: betId=${player.betId}, tokenId=${player.tokenId}, balanceType=${player.balanceType}`);

      socket.emit('betPlaced', {
        bet: amount,
        gameId: gameRoom.gameId,
        balanceType: player.balanceType,      // 🆕 ОТПРАВЛЯЕМ
        userBonusId: player.userBonusId       // 🆕 ОТПРАВЛЯЕМ
      });

      io.to('crash-room').emit('betsUpdated', {
        activePlayersCount: Array.from(gameRoom.players.values()).filter(p => p.bet > 0).length,
      });
    } catch (error) {
      log.error(`Ошибка ставки: ${error.message}`);
      if (error.response?.data) {
        log.error(`Response:`, JSON.stringify(error.response.data));
      }
      socket.emit('error', error.response?.data?.error || 'Error processing bet');
    }
  });

  // 🆕 ИСПРАВЛЕННЫЙ HANDLER: Получает balanceType и userBonusId
  socket.on('cashout', (data) => {
    const player = gameRoom.players.get(socket.id);

    if (!player) {
      socket.emit('error', 'Player not found');
      return;
    }

    if (gameRoom.status !== 'in_progress') {
      socket.emit('error', 'Round not in progress');
      return;
    }

    if (player.cashed_out) {
      socket.emit('error', 'Already cashed out');
      return;
    }

    player.cashed_out = true;
    player.multiplier = gameRoom.multiplier;
    player.winnings = player.bet * gameRoom.multiplier;

    // 🆕 СОХРАНЯЕМ данные кэшаута (если они приходят)
    if (data) {
      player.balanceType = data.balanceType || player.balanceType || 'MAIN';
      player.userBonusId = data.userBonusId || player.userBonusId || null;
      console.log(`💸 [CASHOUT] ${player.userName}: balanceType=${player.balanceType}, userBonusId=${player.userBonusId}`);
    }

    socket.emit('cashoutSuccess', {
      multiplier: gameRoom.multiplier,
      winnings: player.winnings,
    });

    io.to('crash-room').emit('playerCashedOut', {
      userName: player.userName,
      multiplier: gameRoom.multiplier,
      winnings: player.winnings,
    });

    log.success(`💰 ${player.userName} вышел на ${gameRoom.multiplier}x с ${player.winnings}`);
  });

  socket.on('disconnect', () => {
    const player = gameRoom.players.get(socket.id);
    if (player) {
      log.info(`${player.userName} отключился`);
      gameRoom.players.delete(socket.id);
      io.to('crash-room').emit('playerJoined', {
        playersCount: gameRoom.players.size,
      });
    }
  });
});

// ========================
// HTTP
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
// ЗАПУСК
// ========================
server.listen(PORT, () => {
  log.success(`🚀 Game Server на порту ${PORT}`);
  log.info(`📍 Backend: ${BACKEND_URL}${API_VERSION}`);

  setTimeout(() => {
    gameRoom.startRound();
  }, 5000);
});