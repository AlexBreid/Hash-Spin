import { ImageWithFallback } from './figma/ImageWithFallback';
import { Play, Brain, TrendingUp, Target, Users } from 'lucide-react';

interface GameCardProps {
  title: string;
  image: string;
  category: string;
  onClick: () => void;
  playersCount?: number;
}

const getCategoryIcon = (category: string, title?: string) => {
  // Специальная иконка для Plinko
  if (title?.toLowerCase() === 'plinko') {
    return <Target className="w-4 h-4" />;
  }
  
  switch (category.toLowerCase()) {
    case 'логика':
      return <Brain className="w-4 h-4" />;
    case 'ставки':
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <Brain className="w-4 h-4" />;
  }
};

export function GameCard({ title, image, category, onClick, playersCount }: GameCardProps) {
  console.log(`[GameCard] ${title}: playersCount =`, playersCount, typeof playersCount);
  
  return (
    <div 
      onClick={onClick}
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer group hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:scale-105 w-full"
      style={{ maxWidth: '100%' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-primary rounded-full p-3 transform group-hover:scale-110 transition-transform glow-effect">
            <Play className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
        <div className="absolute top-3 right-3">
          <div className="bg-accent/90 backdrop-blur-sm p-2 rounded-full text-accent-foreground flex items-center justify-center">
            {getCategoryIcon(category, title)}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {playersCount ? (
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-card-foreground">{playersCount}</span>
          </div>
        ) : null}
        <h3 className="font-semibold text-card-foreground truncate">{title}</h3>
        <div className="mt-2 w-full h-1 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full w-0 group-hover:w-full transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
}