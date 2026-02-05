import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../../context/ThemeContext';
import { CurrencySelector, CurrencyInfo } from '../../CurrencySelector';

interface GameHeaderProps {
  title: string;
  icon?: React.ReactNode;
  balance: number;
  currency?: string;
  onRefreshBalance?: () => void;
  onCurrencyChange?: (currency: CurrencyInfo) => void;
  status?: string;
}

export function GameHeader({ 
  title, 
  icon, 
  balance, 
  currency = 'USDT',
  onRefreshBalance, 
  onCurrencyChange,
  status 
}: GameHeaderProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Форматирование баланса
  const formatBalance = (bal: number) => {
    if (bal >= 10000) {
      return bal.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    if (bal >= 100) {
      return bal.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    return bal.toLocaleString('en-US', { maximumFractionDigits: 8 });
  };

  return (
    <header 
      className="sticky top-0 z-20 backdrop-blur-md border-b flex-shrink-0 overflow-hidden"
      style={{
        background: isDark 
          ? 'linear-gradient(180deg, rgba(11, 28, 58, 0.98) 0%, rgba(11, 28, 58, 0.95) 100%)'
          : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
        borderBottomColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
        padding: '8px 10px',
        boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.05)',
        maxWidth: '100%'
      }}
    >
      <div className="flex items-center justify-between gap-1 w-full">
        {/* Левая часть: Назад + Название */}
        <div className="flex items-center gap-1.5">
          <motion.button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-full"
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
            }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft 
              className="w-4 h-4" 
              style={{ color: isDark ? '#93c5fd' : '#3b82f6' }}
            />
          </motion.button>
          {icon && <span className="text-sm">{icon}</span>}
          <h1 
            className="text-sm font-bold"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, #60a5fa, #a78bfa)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {title}
          </h1>
        </div>

        {/* Правая часть: Селектор валюты + Баланс */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Селектор валюты */}
          {onCurrencyChange && (
            <CurrencySelector
              compact
              showBalance={false}
              onCurrencyChange={onCurrencyChange}
            />
          )}
          
          {/* Баланс */}
          <div 
            className="px-3 py-1.5 flex items-center gap-1.5 rounded-full"
            style={{
              background: isDark 
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`,
            }}
          >
            <span 
              className="text-xs font-bold"
              style={{ color: isDark ? '#34d399' : '#10b981' }}
            >
              {formatBalance(balance)}
            </span>
            {onRefreshBalance && (
              <button 
                onClick={onRefreshBalance} 
                className="p-1 rounded-full transition-all hover:bg-white/10"
              >
                <RefreshCw 
                  className="w-3 h-3" 
                  style={{ color: isDark ? '#34d399' : '#10b981' }}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
