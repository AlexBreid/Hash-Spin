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
  const renderNavItem = (item: (typeof navItems)[0], isCenter = false) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onPageChange(item.id)}
        className={`flex flex-col items-center justify-center rounded-lg transition-all duration-200 ${
          isCenter
            ? 'w-16 h-16' // Центр: крупнее
            : 'w-12 h-12' // Боковые: компактнее
        } ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
        }`}
      >
        <Icon
          className={`w-6 h-6 mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`}
          strokeWidth={2}
        />
        <span className="text-[10px] font-medium leading-tight text-center truncate w-full px-1">
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A] border-t border-[#1E293B] px-3 py-2">
      <div className="flex items-center justify-between max-w-[400px] mx-auto w-full">
        {/* Левая группа: 2 кнопки */}
        <div className="flex gap-1">
          {renderNavItem(navItems[1])} {/* records */}
          {renderNavItem(navItems[2])} {/* referrals */}
        </div>

        {/* Центр: Главная — увеличенная */}
        <div>{renderNavItem(navItems[0], true)}</div>

        {/* Правая группа: 2 кнопки */}
        <div className="flex gap-1">
          {renderNavItem(navItems[3])} {/* account */}
          {renderNavItem(navItems[4])} {/* settings */}
        </div>
      </div>
    </div>
  );
}