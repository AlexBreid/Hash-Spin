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
log.info('Loaded Server Secret (first 5 chars):', SERVER_SECRET ? SERVER_SECRET.substring(0, 5) + '...' : '❌ NOT LOADED');
const PORT = process.env.GAME_SERVER_PORT || 5000;

const log = {
  info: (msg, data = '') => console.log(`ℹ️ [${new Date().toLocaleTimeString()}] ${msg}`, data),
  success: (msg, data = '') => console.log(`✅ [${new Date().toLocaleTimeString()}] ${msg}`, data),
  error: (msg, data = '') => console.error(`❌ [${new Date().toLocaleTimeString()}] ${msg}`, data),
};

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
    let U = hmac / MAX_HEX_VALUE;

    const HOUSE_EDGE_RTP_PERCENT = 92;
    const SAFE_MAX = 100 / (100 + (100 - HOUSE_EDGE_RTP_PERCENT));

    if (U >= SAFE_MAX) return 1.0;
    U = U / SAFE_MAX;
    if (U === 0) U = 1 / MAX_HEX_VALUE;

    const final_crash = 100 / (100 - U * 100);
    return Math.max(1.01, parseFloat(final_crash.toFixed(2)));
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

    try {
      await this.finalizeRoundResults(losers, winners);
    } catch (error) {
      log.error(`Ошибка финализации: ${error.message}`);
    }

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

      for (const player of this.players.values()) {
        // 🔑 КРИТИЧНО: Проверяем что betId существует!
        if (!player.betId) {
          log.error(`❌ Нет betId для player ${player.userId}!`);
          continue;
        }

        const isWinner = winners.find(w => w.userId === player.userId);

        try {
          const url = `${BACKEND_URL}${API_VERSION}/crash/cashout-result`;

          const payload = {
            userId: player.userId,
            tokenId: player.tokenId,
            betId: player.betId,
            winnings: isWinner ? parseFloat(player.winnings) : 0,
            exitMultiplier: isWinner ? player.multiplier : null,
            gameId: this.gameId,
            result: isWinner ? 'won' : 'lost',
          };

          log.info(`📤 Отправляю результат ${player.userName}:`, JSON.stringify(payload));

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
      }
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

      // 1️⃣ Верифицируем
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

      // 2️⃣ Создаем ставку
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

      // 3️⃣ Сохраняем в памяти
      player.bet = amount;
      player.tokenId = tokenId;
      player.betId = createBetResponse.data.data.betId;

      log.success(`Ставка принята: betId=${player.betId}, tokenId=${player.tokenId}`);

      socket.emit('betPlaced', {
        bet: amount,
        gameId: gameRoom.gameId,
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

  socket.on('cashout', () => {
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