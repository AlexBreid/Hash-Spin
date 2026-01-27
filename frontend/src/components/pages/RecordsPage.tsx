import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Trophy, Medal, Award, Crown, Loader } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getFullUrl, waitForEndpoints } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  score: number;          // Сумма в крипте
  scoreUsd: number;       // Сумма в USD
  tokenSymbol: string;    // Символ крипты (BTC, ETH, USDT...)
  tokenId?: number;       // ID токена
  games?: string;
  rank: number;
  gamesCount?: number;
  photoUrl?: string | null;
  gameType?: string;      // Тип игры: 'crash', 'minesweeper', 'plinko'
  isFake?: boolean;
}

export function RecordsPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('this-month');
  const [game, setGame] = useState('all-games');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  // Функция для загрузки данных из API и JSON файла
  const fetchLeaderboardData = async (newPeriod: string, newGame: string) => {
    try {
      setLoading(true);
      console.log(`🔄 Загружаю рекорды: период=${newPeriod}, игра=${newGame}`);
      
      let allRecords: LeaderboardEntry[] = [];
      
      // 1. Загружаем настоящие данные из API (если есть токен)
      try {
        if (token) {
          await waitForEndpoints();
          const leaderboardBaseUrl = getFullUrl('LEADERBOARD_GET_leaderboard');
          const leaderboardUrl = `${leaderboardBaseUrl}?period=${encodeURIComponent(newPeriod)}&game=${encodeURIComponent(newGame)}&limit=200`;
          
          const response = await fetch(leaderboardUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.leaderboard) {
              const apiRecords = result.data.leaderboard.map((entry: any) => ({
                id: entry.id,
                username: entry.username,
                score: entry.score,
                scoreUsd: entry.scoreUsd || entry.score, // Используем scoreUsd или fallback на score
                tokenSymbol: entry.tokenSymbol || 'USDT',
                tokenId: entry.tokenId,
                gameType: entry.gameType,
                avatar: entry.avatar || (entry.username || 'A').substring(0, 2).toUpperCase(),
                isFake: false
              }));
              allRecords.push(...apiRecords);
              console.log(`✅ Загружено ${apiRecords.length} записей из API`);
            }
          }
        }
      } catch (apiError) {
        console.warn('⚠️ Не удалось загрузить данные из API:', apiError);
      }
      
      // 2. JSON файл больше не нужен - данные берём из API
      // Фейковые данные генерируются через generateFakeLeaderboard.js
      
      // 3. Фильтруем по типу игры
      let filteredRecords = allRecords;
      if (newGame !== 'all-games') {
        filteredRecords = allRecords.filter(record => record.gameType === newGame);
      }
      
      // 4. Для каждого пользователя в каждой игре оставляем только максимальный выигрыш (по USD)
      const uniqueRecords = new Map<string, LeaderboardEntry>();
      
      filteredRecords.forEach(record => {
        const key = `${record.username}_${record.gameType}`;
        const existing = uniqueRecords.get(key);
        
        if (!existing || record.scoreUsd > existing.scoreUsd) {
          uniqueRecords.set(key, record);
        }
      });
      
      // 5. Преобразуем Map обратно в массив и сортируем ПО USD
      const finalRecords = Array.from(uniqueRecords.values());
      finalRecords.sort((a, b) => b.scoreUsd - a.scoreUsd);
      
      // 6. Ограничиваем до 100 записей
      const limitedRecords = finalRecords.slice(0, 100);
      
      // 7. Добавляем ранги
      const rankedRecords = limitedRecords.map((record, index) => ({
        ...record,
        rank: index + 1
      }));
      
      // Устанавливаем данные
      setLeaderboard(rankedRecords);
      
      // Top 3 - первые 3 записи
      setTopThree(rankedRecords.slice(0, 3));
      
      console.log(`✅ Итого уникальных записей: ${rankedRecords.length} (из ${finalRecords.length} всего)`);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setLeaderboard([]);
      setTopThree([]);
    } finally {
      setLoading(false);
    }
  };

  // Загружаем при монтировании
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchLeaderboardData(period, game);
    }
  }, []);


  const handlePeriodChange = async (newPeriod: string) => {
    setPeriod(newPeriod);
    await fetchLeaderboardData(newPeriod, game);
  };

  const handleGameChange = async (newGame: string) => {
    setGame(newGame);
    await fetchLeaderboardData(period, newGame);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Trophy className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="font-bold text-muted-foreground text-lg">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загружение лидеров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Таблица лидеров</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Select value={game} onValueChange={handleGameChange}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder="Выберите игру" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-games">Все игры</SelectItem>
            <SelectItem value="crash">Краш</SelectItem>
            <SelectItem value="minesweeper">Сапёр</SelectItem>
            <SelectItem value="plinko">Плинко</SelectItem>
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="this-week">Эта неделя</SelectItem>
            <SelectItem value="this-month">Этот месяц</SelectItem>
            <SelectItem value="all-time">Всё время</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-br from-card to-card/50 overflow-hidden">
          <h3 className="text-center font-bold text-lg mb-4">🏆 Топ-3 игроков</h3>
          <div className="flex items-end justify-center gap-2 mb-2">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center w-24">
                <Avatar className="w-12 h-12 mb-2 border-2 border-gray-300">
                  <AvatarFallback className="bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 font-bold text-sm">
                    {topThree[1].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center w-full">
                  <p className="text-xs font-bold truncate px-1">{topThree[1].username}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {topThree[1].score < 1 ? topThree[1].score.toFixed(4) : topThree[1].score.toFixed(2)} {topThree[1].tokenSymbol}
                  </p>
                </div>
                <div className="w-14 h-12 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-xl mt-2 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center w-28 -mt-4">
                <Crown className="w-6 h-6 text-yellow-400 mb-1" />
                <Avatar className="w-14 h-14 mb-2 border-2 border-yellow-400">
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 font-bold">
                    {topThree[0].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center w-full">
                  <p className="text-xs font-bold truncate px-1">{topThree[0].username}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {topThree[0].score < 1 ? topThree[0].score.toFixed(4) : topThree[0].score.toFixed(2)} {topThree[0].tokenSymbol}
                  </p>
                </div>
                <div className="w-16 h-14 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-xl mt-2 flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center w-24">
                <Avatar className="w-12 h-12 mb-2 border-2 border-amber-600">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 font-bold text-sm">
                    {topThree[2].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center w-full">
                  <p className="text-xs font-bold truncate px-1">{topThree[2].username}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {topThree[2].score < 1 ? topThree[2].score.toFixed(4) : topThree[2].score.toFixed(2)} {topThree[2].tokenSymbol}
                  </p>
                </div>
                <div className="w-14 h-10 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-xl mt-2 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">3</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-5">
          Общий рейтинг {leaderboard.length > 0 && `(${leaderboard.length})`}
        </h3>
        <div className="space-y-4">
          {leaderboard.length > 0 ? (
            leaderboard.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-2 py-2 px-1 rounded-xl hover:bg-primary/5 transition-colors"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="w-7 flex-shrink-0 text-center">
                  {player.rank <= 3 ? getRankIcon(player.rank) : (
                    <span className="text-xs text-muted-foreground">#{player.rank}</span>
                  )}
                </div>

                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 font-bold text-xs">
                    {player.avatar}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="font-bold text-card-foreground text-xs truncate max-w-[120px]">{player.username}</p>
                  {player.gameType && (
                    <span className="text-[9px] px-1 py-0.5 rounded-full bg-primary/20 text-primary inline-block">
                      {player.gameType === 'crash' ? 'Краш' : 
                       player.gameType === 'minesweeper' ? 'Сапёр' : 
                       player.gameType === 'plinko' ? 'Плинко' : player.gameType}
                    </span>
                  )}
                </div>

                <div className="text-right flex-shrink-0 w-[60px]">
                  <p className="font-bold text-xs text-success">
                    {player.score < 1 
                      ? player.score.toFixed(4) 
                      : player.score >= 10000 
                        ? (player.score / 1000).toFixed(1) + 'K'
                        : player.score.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{player.tokenSymbol}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-2">Нет данных</p>
              <p className="text-sm text-muted-foreground/70">
                Для выбранного периода и игры пока нет записей в таблице лидеров
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}