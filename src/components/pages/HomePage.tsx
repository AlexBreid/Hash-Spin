import { GameCard } from '../GameCard';
import { GameSlider } from '../GameSlider';
import { Button } from '../ui/button';
import { ChevronRight, Star, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 🆕
interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
}

const featuredGames: Game[] = [
  {
    id: '1',
    title: 'Сапёр',
    image: 'https://images.unsplash.com/photo-1758620316764-dca1a0a1d9ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5lc3dlZXBlciUyMGdhbWV8ZW58MXx8fHwxNzU5NjY1NTAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Логика'
  },
  {
    id: '2',
    title: 'Краш',
    image: 'https://images.unsplash.com/photo-1639825752750-5061ded5503b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmFzaCUyMGdhbWUlMjBjaGFydHxlbnwxfHx8fDE3NTk2NjU1MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Ставки'
  },
  {
    id: '3',
    title: 'Курица через дорогу',
    image: 'https://images.unsplash.com/photo-1625224588780-57c68aedcc7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwY3Jvc3NpbmclMjByb2FkfGVufDF8fHx8MTc1OTY2NTUwOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Аркада'
  },
  {
    id: '4',
    title: 'Мячики падают на иксы',
    image: 'https://images.unsplash.com/photo-1659082246565-7195e6174b1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxscyUyMGZhbGxpbmclMjBnYW1pbmd8ZW58MXx8fHwxNzU5NjY1NTEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Удача'
  }
];

const popularGames: Game[] = [
  {
    id: '5',
    title: 'Сапёр Про',
    image: 'https://images.unsplash.com/photo-1758620316764-dca1a0a1d9ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5lc3dlZXBlciUyMGdhbWV8ZW58MXx8fHwxNzU5NjY1NTAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Логика'
  },
  {
    id: '6',
    title: 'Турбо Краш',
    image: 'https://images.unsplash.com/photo-1639825752750-5061ded5503b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmFzaCUyMGdhbWUlMjBjaGFydHxlbnwxfHx8fDE3NTk2NjU1MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Ставки'
  },
  {
    id: '7',
    title: 'Курица Делюкс',
    image: 'https://images.unsplash.com/photo-1625224588780-57c68aedcc7e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwY3Jvc3NpbmclMjByb2FkfGVufDF8fHx8MTc1OTY2NTUwOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Аркада'
  },
  {
    id: '8',
    title: 'Супер Мячики',
    image: 'https://images.unsplash.com/photo-1659082246565-7195e6174b1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWxscyUyMGZhbGxpbmclMjBnYW1pbmd8ZW58MXx8fHwxNzU5NjY1NTEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    category: 'Удача'
  }
];

export function HomePage() {
   const navigate = useNavigate(); // 🆕
  
  const handleGameClick = (gameId: string) => {
    // Если это Краш или Турбо Краш
    if (gameId === '2' || gameId === '6') {
      navigate('/crash'); // 🆕 Переход на страницу игры
    } else {
      console.log('Запуск игры:', gameId);
    }
  };

  return (
    <div className="pb-24 pt-6">
      {/* Welcome Banner */}
      <div className="px-4 mb-8">
        <div className="bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl p-6 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <Gift className="w-6 h-6" />
              <span className="text-sm font-medium opacity-90">Ежедневный бонус</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Получите бонусы!</h2>
            <p className="text-primary-foreground/90 mb-4">Играйте каждый день и получайте награды</p>
            <Button 
              className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg"
              size="sm"
            >
              Получить бонус
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Games Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 mb-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-bold">Рекомендуемые игры</h3>
          </div>
        </div>
        
        <GameSlider games={featuredGames} onGameClick={handleGameClick} />
      </div>

      {/* Popular Games Grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-bold">Популярные игры</h3>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {popularGames.map((game, index) => (
            <div key={game.id} className="card-appear" style={{animationDelay: `${index * 0.1}s`}}>
              <GameCard
                title={game.title}
                image={game.image}
                category={game.category}
                onClick={() => handleGameClick(game.id)}
              />
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full py-3 rounded-2xl border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:glow-effect"
          onClick={() => console.log('Просмотр всех игр')}
        >
          Все игры
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}