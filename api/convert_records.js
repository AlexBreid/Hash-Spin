const fs = require('fs');

// Читаем исходный файл
const data = JSON.parse(fs.readFileSync('users_records.json', 'utf8'));

// Функция для генерации аватара из username
function generateAvatar(username) {
  if (!username) return 'A';
  
  // Убираем специальные символы и эмодзи, оставляем только буквы
  const cleanUsername = username.replace(/[^\w\s]/g, '').trim();
  
  if (cleanUsername.length === 0) {
    // Если после очистки ничего не осталось, берем первые 2 символа оригинального username
    return username.substring(0, 2).toUpperCase().trim() || 'A';
  }
  
  // Берем первые 2 буквы
  const words = cleanUsername.split(/\s+/);
  if (words.length >= 2) {
    // Если есть несколько слов, берем первые буквы каждого
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // Если одно слово, берем первые 2 буквы
    return cleanUsername.substring(0, 2).toUpperCase();
  }
}

// Преобразуем в простой массив записей
// Для каждого пользователя берем только максимальный выигрыш для каждой игры
const records = [];

data.users.forEach((user, userIndex) => {
  const avatar = generateAvatar(user.username);
  
  // Для каждой игры берем только одну запись (максимальный выигрыш)
  // Crash запись
  records.push({
    id: `fake-crash-${user.userId}`,
    username: user.username,
    score: user.crash.winnings,
    gameType: 'crash',
    avatar: avatar,
    isFake: true // Помечаем как липовые данные
  });
  
  // Minesweeper запись
  records.push({
    id: `fake-minesweeper-${user.userId}`,
    username: user.username,
    score: user.minesweeper.winAmount,
    gameType: 'minesweeper',
    avatar: avatar,
    isFake: true
  });
  
  // Plinko запись
  records.push({
    id: `fake-plinko-${user.userId}`,
    username: user.username,
    score: user.plinko.winAmount,
    gameType: 'plinko',
    avatar: avatar,
    isFake: true
  });
});

// Сохраняем в public папку frontend
fs.writeFileSync('../frontend/public/users_records.json', JSON.stringify(records, null, 2), 'utf8');

console.log(`✅ Создано ${records.length} записей для рекордов`);
console.log(`📊 Диапазон выигрышей: ${Math.min(...records.map(r => r.score)).toFixed(2)} - ${Math.max(...records.map(r => r.score)).toFixed(2)}`);

