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
  score: number;
  games: string;
  rank: number;
  gamesCount: number;
  photoUrl: string | null;
  gameType?: string; // Тип игры: 'crash', 'minesweeper', 'plinko'
}

export function RecordsPage() {
  const { token } = useAuth();
  const [period, setPeriod] = useState('this-month');
  const [game, setGame] = useState('all-games');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  // Функция для загрузки данных с параметрами
  const fetchLeaderboardData = async (newPeriod: string, newGame: string) => {
    if (!token) {
      console.error('Нет токена авторизации');
      return;
    }
    
    try {
      setLoading(true);
      // Ждем загрузки endpoints
      await waitForEndpoints();
      
      // Передаём параметр игры как есть, включая "all-games"
      const gameParam = newGame;
      console.log(`🔄 Загружаю лидеров: период=${newPeriod}, игра=${gameParam}`);
      
      // Получаем базовый URL и добавляем query параметры
      const leaderboardBaseUrl = getFullUrl('LEADERBOARD_GET_leaderboard');
      const leaderboardUrl = `${leaderboardBaseUrl}?period=${encodeURIComponent(newPeriod)}&game=${encodeURIComponent(gameParam)}&limit=100`;
      
      // Для top3
      const topThreeBaseUrl = getFullUrl('LEADERBOARD_GET_leaderboard_top3');
      const topThreeUrl = `${topThreeBaseUrl}?period=${encodeURIComponent(newPeriod)}&game=${encodeURIComponent(gameParam)}`;
      
      // Выполняем запросы напрямую
      const [leaderboardResponse, topThreeResponse] = await Promise.all([
        fetch(leaderboardUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(topThreeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);
      
      // Обрабатываем ответы, даже если статус не 200 (может быть 400 для неподдерживаемых игр)
      let leaderboardResult;
      try {
        // Пытаемся распарсить JSON независимо от статуса
        const responseText = await leaderboardResponse.text();
        if (responseText) {
          leaderboardResult = JSON.parse(responseText);
        } else {
          leaderboardResult = { success: false };
        }
        
        // Если бэкенд вернул ошибку (400 или success: false), показываем пустой массив
        if (!leaderboardResult.success || leaderboardResponse.status === 400) {
          leaderboardResult = { success: true, data: { leaderboard: [], period: newPeriod, game: gameParam, total: 0 } };
        }
      } catch (e) {
        // Если не удалось распарсить JSON, создаем пустой результат
        console.warn('⚠️ Не удалось распарсить ответ leaderboard:', e);
        leaderboardResult = { success: true, data: { leaderboard: [], period: newPeriod, game: gameParam, total: 0 } };
      }
      
      let topThreeResult;
      try {
        topThreeResult = topThreeResponse.ok ? await topThreeResponse.json() : { success: false, data: [] };
      } catch (e) {
        topThreeResult = { success: false, data: [] };
      }
      
      console.log('📊 Leaderboard response:', leaderboardResult);
      console.log('🏆 Top3 response:', topThreeResult);
      
      // Обрабатываем leaderboard
      if (leaderboardResult.success) {
        const leaderboardData = leaderboardResult.data?.leaderboard || leaderboardResult.leaderboard || [];
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      } else {
        // Если ошибка, показываем пустой массив
        setLeaderboard([]);
      }
      
      // Обрабатываем top3
      if (topThreeResult.success) {
        const topThreeData = topThreeResult.data || topThreeResult;
        setTopThree(Array.isArray(topThreeData) ? topThreeData : []);
      } else {
        setTopThree([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки:', err);
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
        <Card className="p-6 mb-6 bg-gradient-to-br from-card to-card/50">
          <h3 className="text-center font-bold text-lg mb-6">🏆 Топ-3 игроков</h3>
          <div className="flex items-end justify-center space-x-6 mb-4">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center">
                <Avatar className="w-14 h-14 mb-3 border-2 border-gray-300">
                  <AvatarFallback className="bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 font-bold">
                    {topThree[1].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-bold">{topThree[1].username}</p>
                  <p className="text-xs text-muted-foreground">{topThree[1].score.toLocaleString()} USDT</p>
                </div>
                <div className="w-16 h-14 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-2xl mt-3 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center -mt-4">
                <Crown className="w-8 h-8 text-yellow-400 mb-2" />
                <Avatar className="w-16 h-16 mb-3 border-3 border-yellow-400">
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 font-bold text-lg">
                    {topThree[0].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-bold">{topThree[0].username}</p>
                  <p className="text-xs text-muted-foreground">{topThree[0].score.toLocaleString()} USDT</p>
                </div>
                <div className="w-18 h-18 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-2xl mt-3 flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center">
                <Avatar className="w-14 h-14 mb-3 border-2 border-amber-600">
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 font-bold">
                    {topThree[2].avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-bold">{topThree[2].username}</p>
                  <p className="text-xs text-muted-foreground">{topThree[2].score.toLocaleString()} USDT</p>
                </div>
                <div className="w-16 h-12 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-2xl mt-3 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">3</span>
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
                className="flex items-center space-x-4 py-3 rounded-xl hover:bg-primary/5 transition-colors"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="w-10 flex justify-center">
                  {getRankIcon(player.rank)}
                </div>

                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 font-bold">
                    {player.avatar}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <p className="font-bold text-card-foreground">{player.username}</p>
                  <div className="flex items-center gap-2">
                    {player.gameType && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        {player.gameType === 'crash' ? 'Краш' : 
                         player.gameType === 'minesweeper' ? 'Сапёр' : 
                         player.gameType === 'plinko' ? 'Плинко' : player.gameType}
                      </span>
                    )}
                    {player.gamesCount && (
                      <p className="text-sm text-muted-foreground">{player.gamesCount} ставок</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-lg text-success">{player.score.toLocaleString()} USDT</p>
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