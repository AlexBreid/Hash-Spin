/**
 * 🪙 COINFLIP SERVICE
 * 
 * Динамическая корректировка вероятности выигрыша
 * House Edge: 5% (RTP: 95%)
 * Множитель: 1.9x (для RTP 95%: 95% / 1.9 = 50%)
 * 
 * Логика:
 * - Отслеживаем историю игр игрока
 * - Рассчитываем текущий RTP
 * - Динамически корректируем вероятность выигрыша
 * - Если игрок выигрывает слишком часто → снижаем вероятность
 * - Если игрок проигрывает слишком часто → немного повышаем (но не слишком)
 */

const prisma = require('../../prismaClient');
const logger = require('../utils/logger');

class CoinFlipService {
  // Константы
  static HOUSE_EDGE = 0.05; // 5%
  static RTP = 0.95; // 95%
  static MULTIPLIER = 1.9; // Множитель выигрыша
  static BASE_WIN_PROBABILITY = CoinFlipService.RTP / CoinFlipService.MULTIPLIER; // ~50%
  
  // Параметры для динамической корректировки
  static HISTORY_WINDOW = 50; // Количество последних игр для анализа
  static MAX_PROBABILITY_ADJUSTMENT = 0.15; // Максимальная корректировка ±15%
  static TARGET_RTP = CoinFlipService.RTP; // Целевой RTP
  
  /**
   * Рассчитать текущий RTP игрока на основе истории
   */
  static async calculatePlayerRTP(userId, tokenId) {
    try {
      // Получаем последние игры
      const recentGames = await prisma.coinFlipGame.findMany({
        where: {
          userId,
          tokenId,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: CoinFlipService.HISTORY_WINDOW
      });

      if (recentGames.length === 0) {
        return null; // Нет истории
      }

      let totalWagered = 0;
      let totalWon = 0;

      for (const game of recentGames) {
        const betAmount = parseFloat(game.betAmount.toString());
        const winAmount = parseFloat(game.winAmount?.toString() || '0');
        
        totalWagered += betAmount;
        totalWon += winAmount;
      }

      if (totalWagered === 0) {
        return null;
      }

      const currentRTP = totalWon / totalWagered;
      return currentRTP;
    } catch (error) {
      logger.error('COINFLIP', 'Error calculating player RTP', { error: error.message });
      return null;
    }
  }

  /**
   * Рассчитать скорректированную вероятность выигрыша
   */
  static async calculateWinProbability(userId, tokenId) {
    try {
      const currentRTP = await CoinFlipService.calculatePlayerRTP(userId, tokenId);
      
      // Если нет истории, используем базовую вероятность
      if (currentRTP === null) {
        return CoinFlipService.BASE_WIN_PROBABILITY;
      }

      // Рассчитываем отклонение от целевого RTP
      const rtpDeviation = currentRTP - CoinFlipService.TARGET_RTP;
      
      // Корректируем вероятность
      // Если RTP выше целевого → снижаем вероятность выигрыша
      // Если RTP ниже целевого → немного повышаем (но не слишком)
      let probabilityAdjustment = 0;
      
      if (rtpDeviation > 0) {
        // Игрок выигрывает слишком часто → снижаем вероятность
        // Более агрессивная корректировка для больших отклонений
        probabilityAdjustment = -Math.min(
          rtpDeviation * 0.5, // Коэффициент корректировки
          CoinFlipService.MAX_PROBABILITY_ADJUSTMENT
        );
      } else {
        // Игрок проигрывает → немного повышаем вероятность
        // Менее агрессивная корректировка, чтобы казино оставалось в плюсе
        probabilityAdjustment = Math.min(
          Math.abs(rtpDeviation) * 0.3, // Меньший коэффициент
          CoinFlipService.MAX_PROBABILITY_ADJUSTMENT * 0.5 // Максимум 7.5%
        );
      }

      const adjustedProbability = CoinFlipService.BASE_WIN_PROBABILITY + probabilityAdjustment;
      
      // Ограничиваем вероятность разумными пределами (35% - 65%)
      const finalProbability = Math.max(0.35, Math.min(0.65, adjustedProbability));

      logger.info('COINFLIP', 'Probability calculated', {
        userId,
        currentRTP: currentRTP.toFixed(4),
        targetRTP: CoinFlipService.TARGET_RTP,
        deviation: rtpDeviation.toFixed(4),
        adjustment: probabilityAdjustment.toFixed(4),
        finalProbability: finalProbability.toFixed(4)
      });

      return finalProbability;
    } catch (error) {
      logger.error('COINFLIP', 'Error calculating win probability', { error: error.message });
      // В случае ошибки возвращаем базовую вероятность
      return CoinFlipService.BASE_WIN_PROBABILITY;
    }
  }

  /**
   * Генерировать результат игры с учётом динамической вероятности
   */
  static async generateResult(userId, tokenId, playerChoice) {
    try {
      // Рассчитываем вероятность выигрыша
      let winProbability = await CoinFlipService.calculateWinProbability(userId, tokenId);
      
      // Добавляем небольшую случайность для "залётов" выигрыша
      // Даже при низкой вероятности иногда должен залетать выигрыш
      const luckFactor = Math.random();
      if (luckFactor < 0.05) { // 5% шанс на "счастливый" выигрыш
        winProbability = Math.min(0.7, winProbability + 0.2); // Временно повышаем вероятность
      }
      
      // Генерируем случайное число
      const random = Math.random();
      
      // Определяем, выиграл ли игрок
      const isWin = random < winProbability;
      
      // Если выиграл, результат совпадает с выбором игрока
      // Если проиграл, результат противоположный
      let result;
      if (isWin) {
        result = playerChoice; // Игрок угадал
      } else {
        // Игрок не угадал - выбираем противоположную сторону
        result = playerChoice === 1 ? 2 : 1;
      }

      return {
        result,
        isWin,
        winProbability: winProbability.toFixed(4)
      };
    } catch (error) {
      logger.error('COINFLIP', 'Error generating result', { error: error.message });
      // Fallback: 50/50
      const random = Math.random();
      const isWin = random < 0.5;
      const result = isWin ? playerChoice : (playerChoice === 1 ? 2 : 1);
      
      return {
        result,
        isWin,
        winProbability: '0.5000'
      };
    }
  }

  /**
   * Получить статистику игрока
   */
  static async getPlayerStats(userId, tokenId) {
    try {
      const games = await prisma.coinFlipGame.findMany({
        where: {
          userId,
          tokenId,
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: CoinFlipService.HISTORY_WINDOW
      });

      if (games.length === 0) {
        return {
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalWagered: 0,
          totalWon: 0,
          currentRTP: null
        };
      }

      let wins = 0;
      let losses = 0;
      let totalWagered = 0;
      let totalWon = 0;

      for (const game of games) {
        const betAmount = parseFloat(game.betAmount.toString());
        const winAmount = parseFloat(game.winAmount?.toString() || '0');
        const isWin = game.choice === game.result;
        
        totalWagered += betAmount;
        totalWon += winAmount;
        
        if (isWin) {
          wins++;
        } else {
          losses++;
        }
      }

      const winRate = games.length > 0 ? wins / games.length : 0;
      const currentRTP = totalWagered > 0 ? totalWon / totalWagered : null;

      return {
        totalGames: games.length,
        wins,
        losses,
        winRate: winRate.toFixed(4),
        totalWagered: totalWagered.toFixed(8),
        totalWon: totalWon.toFixed(8),
        currentRTP: currentRTP ? currentRTP.toFixed(4) : null
      };
    } catch (error) {
      logger.error('COINFLIP', 'Error getting player stats', { error: error.message });
      return null;
    }
  }
}

module.exports = CoinFlipService;

