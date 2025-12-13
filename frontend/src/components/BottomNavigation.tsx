import { Home, Trophy, Users, User, Settings } from 'lucide-react';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'records', icon: Trophy, label: 'Рекорды' },
  { id: 'referrals', icon: Users, label: 'Рефералы' },
  { id: 'account', icon: User, label: 'Аккаунт' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
];

export function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border px-2 py-3 z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`relative flex flex-col items-center space-y-1 py-2 px-2 rounded-xl transition-all duration-300 min-w-[60px] ${
                isActive
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
            >
              {/* Фон активной кнопки — градиент + неон */}
              {isActive && (
                <div
                  className="absolute inset-0 rounded-xl z-0"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    boxShadow: '0 0 12px rgba(59, 130, 246, 0.6), 0 0 24px rgba(59, 130, 246, 0.4)',
                  }}
                />
              )}

              <div className="relative z-10">
                <Icon className="w-5 h-5" />
              </div>
              <span className="relative z-10 text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}