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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E293B] px-4 py-3">
      <div className="flex justify-between items-center max-w-[500px] mx-auto w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-1 ${isActive ? 'text-white' : 'text-gray-300'}`}
                strokeWidth={2}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}