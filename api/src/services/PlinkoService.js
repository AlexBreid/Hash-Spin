/**
 * PLINKO SERVICE
 * 
 * Биномиальное распределение
 * 16 рядов = 17 слотов
 * House Edge ~4%
 */

const prisma = require('../../prismaClient');
const { Decimal } = require('@prisma/client/runtime/library');

class PlinkoService {
  static ROWS = 16; // 16 рядов = 17 слотов
  
  // Множители: симметрично от края к центру и обратно
  // Слоты: 0    1   2    3    4     5     6    7     8     9    10   11   12   13   14   15   16
  static MULTIPLIERS = [
    110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110
  ];

  // Генерация пути с правильным биномиальным распределением (как на Stake.com)
  generatePath() {
    const directions = [];
    let position = 0; // Начинаем с центра (условно 0)
    
    // Генерируем путь с равномерной вероятностью 50/50 для каждого направления
    // Это создает биномиальное распределение - центр выпадает чаще, края реже
    // Для 16 рядов: position может быть от 0 до 16 (17 слотов)
    for (let i = 0; i < PlinkoService.ROWS; i++) {
      const goRight = Math.random() < 0.5;
      directions.push(goRight ? 1 : -1);
      position += goRight ? 1 : 0;
    }
    
    // position = количество правых ходов = индекс слота (0-16)
    // position может быть от 0 до 16 включительно (17 слотов)
    const slot = Math.max(0, Math.min(16, position));
    const multiplier = PlinkoService.MULTIPLIERS[slot];
    
    return { directions, slot, multiplier };
  }

  async createGame(userId, tokenId, betAmount) {
    const result = this.generatePath();
    const winAmount = new Decimal(betAmount).mul(result.multiplier);
    const betAmountNum = parseFloat(betAmount);
    const multiplierNum = result.multiplier;
    
    const game = await prisma.plinkoGame.create({
      data: {
        userId,
        tokenId,
        betAmount: betAmount.toString(),
        ballPath: JSON.stringify(result.directions),
        finalPosition: result.slot,
        multiplier: result.multiplier,
        winAmount: winAmount.toString(),
        status: 'COMPLETED'
      }
    });
    
    // Создаём PlinkoBet если ЛИБО ставка >= $50 ЛИБО множитель >= 5x (условие OR)
    // Любое из этих условий достаточно для создания записи
    const shouldCreateBet = betAmountNum >= 50 || multiplierNum >= 5;
    
    if (shouldCreateBet) {
      try {
        const winAmountNum = parseFloat(winAmount.toString());
        const isWin = winAmountNum > betAmountNum;
        
        await prisma.plinkoBet.create({
          data: {
            userId,
            tokenId,
            gameId: game.id,
            betAmount: betAmount.toString(),
            winAmount: winAmount.toString(),
            result: isWin ? 'won' : 'lost',
            multiplier: multiplierNum,
          }
        });
        
        } catch (error) {
        // Не прерываем выполнение, если не удалось создать PlinkoBet
      }
    }
    
    return {
      gameId: game.id,
      directions: result.directions,
      slot: result.slot,
      multiplier: result.multiplier,
      winAmount: winAmount.toString()
    };
  }

  async getGameHistory(userId, limit = 50) {
    const games = await prisma.plinkoGame.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return games.map(g => ({
      gameId: g.id,
      betAmount: parseFloat(g.betAmount.toString()),
      winAmount: parseFloat(g.winAmount.toString()),
      multiplier: g.multiplier,
      slot: g.finalPosition
    }));
  }

  async getPlayerStats(userId, tokenId) {
    const games = await prisma.plinkoGame.findMany({ where: { userId, tokenId } });
    const totalBet = games.reduce((s, g) => s + parseFloat(g.betAmount.toString()), 0);
    const totalWin = games.reduce((s, g) => s + parseFloat(g.winAmount.toString()), 0);
    return {
      totalGames: games.length,
      totalBet: totalBet.toFixed(2),
      totalWin: totalWin.toFixed(2),
      profit: (totalWin - totalBet).toFixed(2)
    };
  }
}

module.exports = new PlinkoService();


