/**
 * 🎮 PLINKO SOCKET.IO EVENTS - для твоей архитектуры
 */

const controller = require('../api/Controller');

/**
 * Инициализируем Socket.IO события
 * Экспортируется как функция, которую вызывает server.js
 */
module.exports = function socketEvents(io) {
    const plinkoNamespace = io.of('/plinko');

    console.log('📡 Socket.IO namespace /plinko инициализирован');

    plinkoNamespace.on('connection', (socket) => {
        const userId = socket.handshake.auth.userId;
        console.log(`✅ [SOCKET] Пользователь подключился: ${socket.id} (userId: ${userId})`);

        // ====================================
        // ОСНОВНОЕ СОБЫТИЕ - НАЧАЛО ИГРЫ
        // ====================================

        /**
         * joinBet - Начать игру в Plinko
         */
        socket.on('joinBet', async(data) => {
            try {
                const { betAmount, rowCount, risk } = data;

                console.log(`🎮 [SOCKET] joinBet - userId: ${userId}, bet: ${betAmount}, risk: ${risk}`);

                if (!betAmount || !rowCount || !risk) {
                    return socket.emit('error', {
                        success: false,
                        error: 'Missing required fields'
                    });
                }

                // Запускаем игру
                const result = await controller.playGame({
                    userId,
                    betAmount: parseFloat(betAmount),
                    rowCount: parseInt(rowCount),
                    risk
                });

                if (!result.success) {
                    console.log(`❌ Game failed: ${result.error}`);
                    return socket.emit('betResult', result);
                }

                console.log(`✅ Game completed: ${result.gameId}`);

                // Отправляем результат
                socket.emit('betResult', {
                    success: true,
                    gameId: result.gameId,
                    result: result.result,
                    payout: result.payout,
                    betAmount: result.betAmount,
                    winAmount: result.winAmount,
                    newBalance: result.newBalance,
                    path: result.ballPath,
                    finalPosition: result.finalPosition,
                    multiplier: result.multiplier
                });

                // Уведомляем об обновлении баланса
                socket.emit('balanceUpdated', {
                    newBalance: result.newBalance,
                    change: result.winAmount - result.betAmount
                });

            } catch (error) {
                console.error('❌ [SOCKET] Error in joinBet:', error.message);
                socket.emit('error', {
                    success: false,
                    error: error.message
                });
            }
        });

        // ====================================
        // ПОЛУЧЕНИЕ ДАННЫХ
        // ====================================

        /**
         * getHistory - Получить историю
         */
        socket.on('getHistory', async(data) => {
            try {
                const { limit = 20 } = data;

                console.log(`📜 [SOCKET] getHistory - userId: ${userId}, limit: ${limit}`);

                const history = await controller.getHistory(userId, limit);

                socket.emit('history', {
                    success: true,
                    data: history
                });

            } catch (error) {
                console.error('❌ [SOCKET] Error in getHistory:', error.message);
                socket.emit('error', {
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * getStats - Получить статистику
         */
        socket.on('getStats', async(data) => {
            try {
                console.log(`📊 [SOCKET] getStats - userId: ${userId}`);

                const stats = await controller.getStats(userId);

                socket.emit('stats', {
                    success: true,
                    data: stats
                });

            } catch (error) {
                console.error('❌ [SOCKET] Error in getStats:', error.message);
                socket.emit('error', {
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * getBalance - Получить баланс
         */
        socket.on('getBalance', async(data) => {
            try {
                console.log(`💰 [SOCKET] getBalance - userId: ${userId}`);

                const result = await controller.getBalance(userId);

                socket.emit('balance', result);

            } catch (error) {
                console.error('❌ [SOCKET] Error in getBalance:', error.message);
                socket.emit('error', {
                    success: false,
                    error: error.message
                });
            }
        });

        /**
         * getGame - Получить одну игру
         */
        socket.on('getGame', async(data) => {
            try {
                const { gameId } = data;

                console.log(`🎮 [SOCKET] getGame - gameId: ${gameId}, userId: ${userId}`);

                const result = await controller.getGame(gameId, userId);

                socket.emit('game', result);

            } catch (error) {
                console.error('❌ [SOCKET] Error in getGame:', error.message);
                socket.emit('error', {
                    success: false,
                    error: error.message
                });
            }
        });

        // ====================================
        // ОТКЛЮЧЕНИЕ
        // ====================================

        socket.on('disconnect', () => {
            console.log(`❌ [SOCKET] Пользователь отключился: ${socket.id}`);
        });

        socket.on('error', (error) => {
            console.error(`❌ [SOCKET] Socket error: ${error}`);
        });
    });
};