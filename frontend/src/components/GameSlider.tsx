import { useRef, useState, useEffect } from 'react';
import { GameCard } from './GameCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
}

interface GameSliderProps {
  games: Game[];
  onGameClick?: (gameId: string) => void;
}

export function GameSlider({ games, onGameClick }: GameSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);

      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 220;
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft +
      (direction === 'left' ? -scrollAmount : scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  const handleCardClick = (gameId: string) => {
    console.log('🎮 GameCard clicked:', gameId);
    if (onGameClick) {
      onGameClick(gameId);
    }
  };

  return (
    <div className="relative w-full">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all"
          style={{
            background: 'var(--primary)',
            color: 'white'
          }}
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {games.map((game) => (
          <div 
            key={game.id} 
            className="flex-shrink-0 slider-card-wrapper"
          >
            <GameCard
              title={game.title}
              image={game.image}
              category={game.category}
              onClick={() => handleCardClick(game.id)}
            />
          </div>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all"
          style={{
            background: 'var(--primary)',
            color: 'white'
          }}
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}