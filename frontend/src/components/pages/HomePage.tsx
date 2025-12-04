import { GameCard } from '../GameCard';
import { GameSlider } from '../GameSlider';
import { Button } from '../ui/button';
import { ChevronRight, Star, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    image: '../../assets/task_01kbn75ywbfpz83qvdbm3c9sbx_1764870071_img_1.webp',
    category: 'Логика'
  },
  {
    id: '2',
    title: 'Краш',
    image: '../../assets/task_01kbn7a4xqenbt8px4rsk9zexr_1764870172_img_0.webp',
    category: 'Ставки'
  },
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
  
];

export function HomePage() {
  const navigate = useNavigate();
  
  const handleGameClick = (gameId: string) => {
    // Сапёр
    if (gameId === '1' || gameId === '5') {
      navigate('/minesweeper'); // 🎮 Переход на Сапёр
    } 
    // Краш
    else if (gameId === '2' || gameId === '6') {
      navigate('/crash'); // 💥 Переход на Краш
    } 
    // Остальные игры
    else {
      console.log('Запуск игры:', gameId);
    }
  };

  return (
    <div className="pb-24 pt-6">
      {/* Welcome Banner */}
      

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