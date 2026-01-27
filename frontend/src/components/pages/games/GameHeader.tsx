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
      className="sticky top-0 z-20 backdrop-blur-md border-b flex-shrink-0"
      style={{
        backgroundColor: isDark ? 'rgba(11, 28, 58, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderBottomColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        padding: '12px 16px'
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Левая часть: Назад + Название */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl transition-all border"
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
              borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
            }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft 
                className="w-5 h-5" 
                style={{ color: isDark ? '#93c5fd' : '#3b82f6' }}
              />
            </motion.div>
          </button>
          <div>
            <h1 
              className="text-lg font-black flex items-center gap-2"
              style={{
                background: isDark 
                  ? 'linear-gradient(135deg, #10b981, #3b82f6)'
                  : 'linear-gradient(135deg, #059669, #2563eb)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {icon && <span>{icon}</span>}
              {title}
            </h1>
            {status && (
              <p 
                className="text-xs font-mono mt-0.5"
                style={{ color: isDark ? '#10b981' : '#059669' }}
              >
                {status}
              </p>
            )}
          </div>
        </div>

        {/* Правая часть: Селектор валюты + Баланс */}
        <div className="flex items-center gap-2">
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
            className="px-3 py-2 flex items-center gap-2 rounded-xl border"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1))'
                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.05))',
              borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
            }}
          >
            <div className="text-right">
              <p 
                className="text-xs"
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              >
                Баланс
              </p>
              <p 
                className="text-sm font-black"
                style={{ color: isDark ? '#10b981' : '#059669' }}
              >
                {formatBalance(balance)} {currency}
              </p>
            </div>
            {onRefreshBalance && (
              <button 
                onClick={onRefreshBalance} 
                className="p-1.5 rounded-lg transition-all hover:opacity-80"
                style={{
                  background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'
                }}
              >
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5 }}
                >
                  <RefreshCw 
                    className="w-3.5 h-3.5" 
                    style={{ color: isDark ? '#10b981' : '#059669' }}
                  />
                </motion.div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
