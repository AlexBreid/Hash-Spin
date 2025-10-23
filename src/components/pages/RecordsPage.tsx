import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  score: number;
  games: string;
  rank: number;
}

const leaderboard: LeaderboardEntry[] = [
  { id: '1', username: 'МастерСапёра', avatar: 'МС', score: 25400, games: 'Все игры', rank: 1 },
  { id: '2', username: 'КрашПро', avatar: 'КП', score: 22800, games: 'Все игры', rank: 2 },
  { id: '3', username: 'КурицаГуру', avatar: 'КГ', score: 19500, games: 'Все игры', rank: 3 },
  { id: '4', username: 'МячикиМастер', avatar: 'ММ', score: 18900, games: 'Все игры', rank: 4 },
  { id: '5', username: 'ИгроманПро', avatar: 'ИП', score: 16200, games: 'Все игры', rank: 5 },
  { id: '6', username: 'АркадныйКороль', avatar: 'АК', score: 15800, games: 'Все игры', rank: 6 },
  { id: '7', username: 'ЛогикаБосс', avatar: 'ЛБ', score: 14500, games: 'Все игры', rank: 7 },
  { id: '8', username: 'УдачныйИгрок', avatar: 'УИ', score: 13200, games: 'Все игры', rank: 8 },
];

export function RecordsPage() {
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

  return (
    <div className="pb-24 pt-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Таблица лидеров</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Select defaultValue="all-games">
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder="Выберите игру" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-games">Все игры</SelectItem>
            <SelectItem value="minesweeper">Сапёр</SelectItem>
            <SelectItem value="crash">Краш</SelectItem>
            <SelectItem value="chicken">Курица</SelectItem>
            <SelectItem value="balls">Мячики</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="this-month">
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
      <Card className="p-6 mb-6 bg-gradient-to-br from-card to-card/50">
        <h3 className="text-center font-bold text-lg mb-6">🏆 Топ-3 игроков</h3>
        <div className="flex items-end justify-center space-x-6 mb-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <Avatar className="w-14 h-14 mb-3 border-2 border-gray-300">
              <AvatarFallback className="bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 font-bold">
                {leaderboard[1].avatar}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-bold">{leaderboard[1].username}</p>
              <p className="text-xs text-muted-foreground">{leaderboard[1].score.toLocaleString()} очков</p>
            </div>
            <div className="w-16 h-14 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-2xl mt-3 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">2</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-4">
            <Crown className="w-8 h-8 text-yellow-400 mb-2" />
            <Avatar className="w-16 h-16 mb-3 border-3 border-yellow-400">
              <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 font-bold text-lg">
                {leaderboard[0].avatar}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-bold">{leaderboard[0].username}</p>
              <p className="text-xs text-muted-foreground">{leaderboard[0].score.toLocaleString()} очков</p>
            </div>
            <div className="w-18 h-18 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-2xl mt-3 flex items-center justify-center shadow-xl">
              <span className="text-white font-bold text-xl">1</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <Avatar className="w-14 h-14 mb-3 border-2 border-amber-600">
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-amber-700 text-amber-100 font-bold">
                {leaderboard[2].avatar}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-bold">{leaderboard[2].username}</p>
              <p className="text-xs text-muted-foreground">{leaderboard[2].score.toLocaleString()} очков</p>
            </div>
            <div className="w-16 h-12 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-2xl mt-3 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">3</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Full Leaderboard */}
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-5">Общий рейтинг</h3>
        <div className="space-y-4">
          {leaderboard.map((player, index) => (
            <div key={player.id} className="flex items-center space-x-4 py-3 rounded-xl hover:bg-primary/5 transition-colors card-appear" style={{animationDelay: `${index * 0.1}s`}}>
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
                <p className="text-sm text-muted-foreground">{player.games}</p>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-lg text-success">{player.score.toLocaleString()} очков</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}