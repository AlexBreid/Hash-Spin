import { useRef } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Play, ChevronLeft, ChevronRight } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
}

interface GameSliderProps {
  games: Game[];
  onGameClick: (gameId: string) => void;
}

export function GameSlider({ games, onGameClick }: GameSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  
  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ 
        left: -280, 
        behavior: 'smooth' 
      });
    }
  };
  
  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ 
        left: 280, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <div className="relative">
      <div 
        ref={sliderRef}
        className="flex space-x-4 overflow-x-auto px-4 py-2 slider-container"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game, index) => (
          <div 
            key={game.id}
            onClick={() => onGameClick(game.id)}
            className="slider-item flex-shrink-0 w-64 bg-card rounded-2xl overflow-hidden cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 card-appear"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <ImageWithFallback
                src={game.image}
                alt={game.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-primary rounded-full p-4 transform group-hover:scale-110 transition-transform glow-effect">
                  <Play className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div className="absolute top-3 right-3">
                <div className="bg-accent/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-accent-foreground">
                  {game.category}
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-card-foreground text-lg mb-2">{game.title}</h3>
              <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl font-medium transition-all duration-300 hover:glow-effect">
                Играть
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation buttons */}
      <button 
        onClick={scrollLeft}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center text-card-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:glow-effect"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <button 
        onClick={scrollRight}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center text-card-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:glow-effect"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}