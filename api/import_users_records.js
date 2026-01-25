const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function importUsersRecords() {
  try {
    console.log('📖 Загружаю данные из users_records.json...');
    const data = JSON.parse(fs.readFileSync('users_records.json', 'utf8'));
    
    console.log(`📊 Найдено ${data.users.length} пользователей для импорта`);
    
    // Получаем или создаем токен
    let token = await prisma.cryptoToken.findFirst({
      where: { id: data.metadata.tokenId }
    });
    
    if (!token) {
      token = await prisma.cryptoToken.findFirst({
        where: { symbol: 'USDT' }
      });
      
      if (!token) {
        console.log('⚠️  Токен не найден, создаю USDT токен...');
        token = await prisma.cryptoToken.create({
          data: {
            symbol: 'USDT',
            name: 'Tether',
            network: 'ERC-20',
            decimals: 18
          }
        });
      }
    }
    
    const tokenId = token.id;
    console.log(`✅ Используется токен: ${token.symbol} (ID: ${tokenId})`);
    
    // Получаем или создаем сложности для Minesweeper
    let difficulties = await prisma.minesweeperDifficulty.findMany();
    if (difficulties.length === 0) {
      console.log('⚠️  Сложности не найдены, создаю базовые...');
      difficulties = await Promise.all([
        prisma.minesweeperDifficulty.create({
          data: { name: 'Easy', minesCount: 1, gridSize: 5, multiplier: 1.5 }
        }),
        prisma.minesweeperDifficulty.create({
          data: { name: 'Medium', minesCount: 3, gridSize: 5, multiplier: 2.0 }
        }),
        prisma.minesweeperDifficulty.create({
          data: { name: 'Hard', minesCount: 5, gridSize: 5, multiplier: 3.0 }
        })
      ]);
    }
    
    let imported = 0;
    let errors = 0;
    
    for (const userData of data.users) {
      try {
        // Создаем минимального пользователя только для рекордов
        const user = await prisma.user.create({
          data: {
            telegramId: `records_${Date.now()}_${userData.userId}_${Math.random().toString(36).substr(2, 9)}`,
            username: userData.username,
            firstName: userData.username,
            referralCode: `ref_${userData.userId}_${Math.random().toString(36).substr(2, 9)}`
          }
        });
        
        // Создаем CrashRound и CrashBet для рекордов
        const crashRound = await prisma.crashRound.create({
          data: {
            gameId: `crash_${Date.now()}_${userData.userId}`,
            crashPoint: userData.crash.exitMultiplier,
            totalPlayers: 1,
            winnersCount: 1,
            totalWagered: userData.crash.betAmount,
            totalPayouts: userData.crash.winnings,
            serverSeedHash: `hash_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
            clientSeed: `seed_${Math.random().toString(36).substr(2, 16)}`,
            nonce: 0
          }
        });
        
        await prisma.crashBet.create({
          data: {
            roundId: crashRound.id,
            userId: user.id,
            tokenId: tokenId,
            betAmount: userData.crash.betAmount,
            exitMultiplier: userData.crash.exitMultiplier,
            winnings: userData.crash.winnings,
            result: 'won'
          }
        });
        
        // Создаем MinesweeperGame для рекордов
        const difficulty = difficulties[userData.minesweeper.difficultyId - 1] || difficulties[0];
        await prisma.minesweeperGame.create({
          data: {
            userId: user.id,
            tokenId: tokenId,
            difficultyId: difficulty.id,
            gameState: { revealed: userData.minesweeper.revealedCells },
            minesPositions: { mines: [] },
            status: 'WON',
            revealedCells: userData.minesweeper.revealedCells,
            betAmount: userData.minesweeper.betAmount,
            winAmount: userData.minesweeper.winAmount,
            multiplier: userData.minesweeper.multiplier
          }
        });
        
        // Создаем PlinkoGame для рекордов
        await prisma.plinkoGame.create({
          data: {
            userId: user.id,
            tokenId: tokenId,
            betAmount: userData.plinko.betAmount,
            winAmount: userData.plinko.winAmount,
            ballPath: userData.plinko.ballPath,
            finalPosition: userData.plinko.finalPosition,
            multiplier: userData.plinko.multiplier,
            status: 'COMPLETED'
          }
        });
        
        imported++;
        if (imported % 10 === 0) {
          console.log(`✅ Импортировано ${imported}/${data.users.length} записей для рекордов...`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Ошибка при импорте ${userData.username}:`, error.message);
      }
    }
    
    console.log('\n✅ Импорт завершен!');
    console.log(`📊 Успешно импортировано: ${imported} записей для рекордов`);
    console.log(`❌ Ошибок: ${errors}`);
    console.log('\n💡 Теперь эти записи будут отображаться в рекордах!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importUsersRecords();

