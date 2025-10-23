import { User } from 'lucide-react';

interface TopNavigationProps {
  onProfileClick: () => void;
}

export function TopNavigation({ onProfileClick }: TopNavigationProps) {
  return (
    <div className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <div className="w-6 h-6 bg-white rounded-md opacity-90"></div>
          </div>
        </div>
        
        <button
          onClick={onProfileClick}
          className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center hover:bg-secondary/30 hover:glow-effect transition-all duration-300"
        >
          <User className="w-5 h-5 text-primary" />
        </button>
      </div>
    </div>
  );
}