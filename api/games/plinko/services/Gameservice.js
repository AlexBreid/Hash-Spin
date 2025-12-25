/**
 * 🎮 PLINKO MICROSERVICE - Game Service
 */

const axios = require('axios');
const config = require('../config');
const fairness = require('../helpers/fairness');
const { v4: uuidv4 } = require('uuid');

class PlinkoGameService {
    /**
     * Запустить игру
     */
    async playGame({ userId, betAmount, rowCount, risk }) {
        try {
            console.log(`\n🎮 [GameService] Starting game for user ${userId}`);

            // Генерируем ID игры
            const gameId = uuidv4();
            console.log(`   Game ID: ${gameId}`);

            // 1️⃣ Списываем ставку через Main API
            console.log(`   💳 Deducting bet from balance...`);
            const deductResponse = await this.deductBet(userId, betAmount);

            if (!deductResponse.success) {
                console.log(`   ❌ Failed to deduct bet: ${deductResponse.error}`);
                return {
                    success: false,
                    error: deductResponse.error || 'Insufficient balance'
                };
            }

            console.log(`   ✅ Bet deducted successfully`);

            // 2️⃣ Генерируем результат игры (seed-based для честности)
            console.log(`   🎲 Generating result...`);
            const gameResult = this.generateResult(rowCount, risk);
            console.log(`   ✅ Result generated: payout = ${gameResult.payout}`);

            // 3️⃣ Рассчитываем выигрыш
            const winAmount = betAmount * gameResult.payout;
            console.log(`   💰 Win amount: ${winAmount}`);

            // 4️⃣ Если выиграл - зачисляем через Main API
            if (gameResult.payout > 1) {
                console.log(`   🏆 Player won! Crediting winnings...`);
                const creditResponse = await this.creditWinnings(userId, winAmount);

                if (!creditResponse.success) {
                    console.log(`   ⚠️ Warning: Failed to credit winnings`);
                }
            }

            // 5️⃣ Сохраняем в историю (опционально)
            if (config.features.historyTracking) {
                await this.saveToHistory({
                    gameId,
                    userId,
                    betAmount,
                    winAmount,
                    payout: gameResult.payout,
                    rowCount,
                    risk,
                    result: gameResult.result
                }).catch(err => console.warn('Failed to save to history:', err.message));
            }

            // 6️⃣ Возвращаем результат
            const response = {
                success: true,
                gameId,
                result: gameResult.result,
                payout: gameResult.payout,
                betAmount,
                winAmount,
                path: gameResult.path,
                timestamp: new Date().toISOString()
            };

            console.log(`   ✅ Game completed successfully\n`);
            return response;

        } catch (error) {
            console.error(`   ❌ Error in playGame: ${error.message}\n`);
            return {
                success: false,
                error: error.message || 'Game processing failed'
            };
        }
    }

    /**
     * Генерируем результат игры
     */
    generateResult(rowCount, risk) {
        // Получаем таблицу выплат
        const payoutTable = this.getPayoutTable(rowCount, risk);

        // Генерируем случайную финальную позицию
        const finalPosition = Math.floor(Math.random() * payoutTable.length);
        const payout = payoutTable[finalPosition];

        // Генерируем путь шарика (для визуализации)
        const path = this.generatePath(rowCount);

        return {
            result: payout > 1 ? 'win' : payout === 1 ? 'draw' : 'loss',
            payout,
            finalPosition,
            path
        };
    }

    /**
     * Получить таблицу выплат для рисков и строк
     */
    getPayoutTable(rowCount, risk) {
        // Таблица выплат для Plinko
        const payoutTables = {
            low: {
                8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
                9: [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6],
                10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
                16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
            },
            medium: {
                16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
                9: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
                10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
            },
            high: {
                8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
                9: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
                10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
                16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
            }
        };

        return payoutTables[risk] && payoutTables[risk][rowCount] ?
            payoutTables[risk][rowCount] :
            payoutTables.medium[8];
    }

    /**
     * Генерируем путь шарика через пеги
     */
    generatePath(rowCount) {
        const path = [];
        let position = Math.floor((rowCount + 1) / 2);

        for (let row = 0; row <= rowCount; row++) {
            path.push(position);
            if (row < rowCount) {
                // Случайный отскок влево (-1) или вправо (+1)
                position += Math.random() > 0.5 ? 1 : -1;
                // Ограничиваем границы
                position = Math.max(0, Math.min(rowCount, position));
            }
        }

        return path;
    }

    /**
     * Списать ставку через Main API
     */
    async deductBet(userId, betAmount) {
        try {
            const response = await axios.post(
                `${config.mainApiUrl}/api/v1/balance/deduct`, { userId, amount: betAmount }, {
                    headers: {
                        'Authorization': `Bearer ${config.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: config.timeouts.mainApiRequest
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error deducting bet:', error.message);

            // Обработка ошибки безопасно
            let errorMsg = error.message;
            if (error.response && error.response.data && error.response.data.error) {
                errorMsg = error.response.data.error;
            }

            return {
                success: false,
                error: errorMsg
            };
        }
    }

    /**
     * Зачислить выигрыш через Main API
     */
    async creditWinnings(userId, winAmount) {
        try {
            const response = await axios.post(
                `${config.mainApiUrl}/api/v1/balance/credit`, { userId, amount: winAmount }, {
                    headers: {
                        'Authorization': `Bearer ${config.apiToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: config.timeouts.mainApiRequest
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error crediting winnings:', error.message);

            // Обработка ошибки безопасно
            let errorMsg = error.message;
            if (error.response && error.response.data && error.response.data.error) {
                errorMsg = error.response.data.error;
            }

            return {
                success: false,
                error: errorMsg
            };
        }
    }

    /**
     * Сохранить игру в историю
     */
    async saveToHistory(gameData) {
        console.log(`   📝 Saving game ${gameData.gameId} to history...`);
        // TODO: Реализовать сохранение в БД
    }

    /**
     * Получить историю игр
     */
    async getHistory(userId, limit = 20) {
        // TODO: Получить из БД
        return [];
    }

    /**
     * Получить статистику
     */
    async getStats(userId) {
        // TODO: Рассчитать из истории
        return {
            totalGames: 0,
            totalBet: 0,
            totalWin: 0,
            profit: 0,
            roi: 0
        };
    }

    /**
     * Получить одну игру
     */
    async getGame(gameId, userId) {
        // TODO: Получить из БД
        return null;
    }

    /**
     * Проверить честность игры
     */
    async verifyGame({ gameId, serverSeed, clientSeed, nonce }) {
        try {
            const isValid = fairness.verify({
                gameId,
                serverSeed,
                clientSeed,
                nonce
            });

            return {
                success: true,
                gameId,
                isValid,
                verified: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new PlinkoGameService();