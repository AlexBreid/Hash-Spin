const prisma = require('../prismaClient');

async function checkData() {
  // Подсчёт по типам игр
  const crashCount = await prisma.crashBet.count({ where: { result: 'won' } });
  const minesweeperCount = await prisma.minesweeperGame.count({ where: { status: 'WON' } });
  const plinkoCount = await prisma.plinkoGame.count({ where: { status: 'COMPLETED' } });
  
  console.log('=== СТАТИСТИКА ПО ИГРАМ ===\n');
  console.log(`Crash выигрышей: ${crashCount}`);
  console.log(`Minesweeper выигрышей: ${minesweeperCount}`);
  console.log(`Plinko игр: ${plinkoCount}`);
  
  // Подсчёт фейковых пользователей
  const fakeUsersCount = await prisma.user.count({
    where: { telegramId: { startsWith: 'fake_' } }
  });
  
  console.log(`\nФейковых пользователей: ${fakeUsersCount}`);

  await prisma.$disconnect();
}

checkData().catch(console.error);

