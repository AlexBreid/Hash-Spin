import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Star, TrendingUp, Clock, Trophy } from 'lucide-react';

export function AccountPage() {
  const level = 15;
  const totalScore = 12450;
  const totalGames = 124;
  const vipLevel = 'Золото';

  return (
    <div className="pb-24 pt-6 px-4">
      {/* User Profile */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
              АИ
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Алексей Иванов</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Star className="w-4 h-4 text-accent" />
              <p className="text-accent font-medium">{vipLevel} статус</p>
            </div>
            <p className="text-muted-foreground text-sm">Игрок с января 2025</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-5 mb-6 border border-primary/20">
          <div className="flex items-center space-x-3 mb-3">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-muted-foreground">Уровень игрока</span>
          </div>
          <p className="text-3xl font-bold text-primary">{level}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-accent hover:bg-accent/90 py-3 rounded-2xl font-semibold transition-all duration-300 hover:glow-effect">
            Достижения
          </Button>
          <Button variant="outline" className="py-3 rounded-2xl font-semibold border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
            Рейтинг
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Общий счёт</span>
          </div>
          <p className="text-xl font-bold text-success">{totalScore.toLocaleString()}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Игр сыграно</span>
          </div>
          <p className="text-xl font-bold text-accent">{totalGames}</p>
        </Card>
      </div>
    </div>
  );
}