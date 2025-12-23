import { useState, useRef, useEffect } from 'react';
import { GameCard } from './GameCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
  onClick: () => void;
}

interface GameSliderProps {
  onGameSelect?: (gameId: string) => void;
  onNavigate?: (page: string) => void;
}

export function GameSlider({ onGameSelect, onNavigate }: GameSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Игры
  const games: Game[] = [
    {
      id: 'crash',
      title: 'Краш',
      image: 'https://images.unsplash.com/photo-1516222338670-c482920eecca?w=400&h=300&fit=crop',
      category: 'ставки',
      onClick: () => onNavigate?.('crash')
    },
    {
      id: 'minesweeper',
      title: 'Сапёр',
      image: 'https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=400&h=300&fit=crop',
      category: 'логика',
      onClick: () => onNavigate?.('minesweeper')
    },
    {
      id: 'plinko',
      title: 'Plinko',
      image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=300&fit=crop',
      category: 'ставки',
      onClick: () => onNavigate?.('plinko')
    },
  ];

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

    const scrollAmount = 320;
    const newScrollLeft =
      scrollContainerRef.current.scrollLeft +
      (direction === 'left' ? -scrollAmount : scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative w-full">
      {/* Левная кнопка */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary p-2 rounded-full transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} className="text-primary-foreground" />
        </button>
      )}

      {/* Контейнер с играми */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 py-2"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {games.map((game) => (
          <div key={game.id} className="flex-shrink-0 w-[280px]">
            <GameCard
              title={game.title}
              image={game.image}
              category={game.category}
              onClick={game.onClick}
            />
          </div>
        ))}
      </div>

      {/* Правая кнопка */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary p-2 rounded-full transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} className="text-primary-foreground" />
        </button>
      )}
    </div>
  );
}