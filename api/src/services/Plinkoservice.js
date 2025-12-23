// plinkoService.js - ПОЛНАЯ РЕАЛИЗАЦИЯ ИГРЫ PLINKO
const prisma = require('../../prismaClient');
const { Decimal } = require('@prisma/client');

class PlinkoService {
  /**
   * 🎰 МНОЖИТЕЛИ PLINKO
   * 9 уровней (строк с пегами)
   * 10 финальных позиций (слотов)
   * 
   * Позиции от центра:
   * 4(100) 3(50) 2(30) 1(20) 0(14) 0(10) 1(7) 2(5) 3(3) 4(2) 5(1.5) 6(1) 7(0.5) 8(0.2) 9(0.1)
   * 
   * Средние = выше, крайние = ниже
   */
  static MULTIPLIERS = [
    0.1, 0.2, 0.5, 1, 1.5, 2, 3, 5, 7, 10, 14, 20, 30, 50, 100
  ];

  static ROWS = 9; // количество рядов пегов
  static SLOTS = 15; // количество финальных слотов

  /**
   * 🎮 Генерируем путь шарика (симуляция физики)
   * Шарик падает вниз, на каждом уровне отскакивает влево/вправо
   */
  generateBallPath() {
    let position = Math.floor(PlinkoService.ROWS / 2); // начинаем в центре (сверху)
    const path = [{ row: 0, col: position }];

    // Для каждого ряда пегов
    for (let row = 1; row <= PlinkoService.ROWS; row++) {
      // Случайное направление: влево (-1) или вправо (1)
      const direction = Math.random() > 0.5 ? 1 : -1;
      position += direction;

      // Ограничиваем позицию (не выходим за границы)
      position = Math.max(0, Math.min(PlinkoService.ROWS, position));

      path.push({ row, col: position });
    }

    // Финальная позиция определяется последней позицией
    const finalPosition = position;
    const multiplier = PlinkoService.MULTIPLIERS[finalPosition];

    return {
      path,
      finalPosition,
      multiplier
    };
  }

  /**
   * 📊 Получить статистику по множителям
   */
  static getMultiplierStats() {
    return PlinkoService.MULTIPLIERS.map((mult, idx) => ({
      position: idx,
      multiplier: mult,
      riskLevel: idx < 5 || idx > 9 ? 'high' : idx === 4 || idx === 5 ? 'medium' : 'low'
    }));
  }

  /**
   * 🎮 Создаём новую игру Plinko
   */
  async createGame(userId, tokenId, betAmount) {
    try {
      console.log('🎮 [Plinko.createGame] Параметры:');
      console.log('   userId:', userId);
      console.log('   tokenId:', tokenId);
      console.log('   betAmount:', betAmount);

      const ballPath = this.generateBallPath();
      const winAmount = new Decimal(betAmount).mul(ballPath.multiplier);

      console.log('🎲 Путь шарика:', ballPath.path.map(p => `[${p.row},${p.col}]`).join('→'));
      console.log('🎯 Финальная позиция:', ballPath.finalPosition);
      console.log('💰 Множитель:', ballPath.multiplier);
      console.log('💵 Выигрыш:', winAmount.toString());

      const game = await prisma.plinkoGame.create({
        data: {
          userId,
          tokenId,
          betAmount,
          ballPath: JSON.stringify(ballPath.path),
          finalPosition: ballPath.finalPosition,
          multiplier: ballPath.multiplier,
          winAmount: winAmount.toString(),
          status: 'COMPLETED',
        },
      });

      console.log(`✅ Игра создана в БД: ID ${game.id}`);

      return {
        gameId: game.id,
        ballPath: ballPath.path,
        finalPosition: ballPath.finalPosition,
        multiplier: ballPath.multiplier,
        winAmount: winAmount.toString(),
        betAmount: betAmount.toString(),
      };
    } catch (error) {
      console.error('❌ [Plinko.createGame] ОШИБКА:', error.message);
      throw error;
    }
  }

  /**
   * 📚 Получить историю игр
   */
  async getGameHistory(userId, limit = 20) {
    try {
      const games = await prisma.plinkoGame.findMany({
        where: { userId },
        select: {
          id: true,
          betAmount: true,
          multiplier: true,
          winAmount: true,
          finalPosition: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return games.map(g => ({
        gameId: g.id,
        betAmount: parseFloat(g.betAmount.toString()),
        multiplier: g.multiplier,
        winAmount: parseFloat(g.winAmount.toString()),
        finalPosition: g.finalPosition,
        createdAt: g.createdAt.toISOString(),
      }));
    } catch (error) {
      console.error('❌ [Plinko.getHistory] ОШИБКА:', error.message);
      throw error;
    }
  }

  /**
   * 📊 Получить статистику игрока
   */
  async getPlayerStats(userId, tokenId) {
    try {
      const games = await prisma.plinkoGame.findMany({
        where: { userId, tokenId },
      });

      const totalBet = games.reduce((sum, g) => sum + parseFloat(g.betAmount.toString()), 0);
      const totalWin = games.reduce((sum, g) => sum + parseFloat(g.winAmount.toString()), 0);
      const profit = totalWin - totalBet;

      const multiplierCounts = {};
      games.forEach(g => {
        const mult = g.multiplier;
        multiplierCounts[mult] = (multiplierCounts[mult] || 0) + 1;
      });

      return {
        totalGames: games.length,
        totalBet: totalBet.toFixed(8),
        totalWin: totalWin.toFixed(8),
        profit: profit.toFixed(8),
        roi: games.length > 0 ? ((profit / totalBet) * 100).toFixed(2) : '0',
        multiplierBreakdown: multiplierCounts,
      };
    } catch (error) {
      console.error('❌ [Plinko.getPlayerStats] ОШИБКА:', error.message);
      throw error;
    }
  }
}

module.exports = new PlinkoService();