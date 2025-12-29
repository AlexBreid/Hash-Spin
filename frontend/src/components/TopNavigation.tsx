import { User, Wallet, Plus } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useFetch } from '../hooks/useDynamicApi'; 
import { Button } from './ui/button';
import DepositPage from './pages/DepositPage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import logoSU from '../assets/SU.png';

// --- Интерфейсы ---

interface TopNavigationProps {
  onProfileClick: () => void;
}

interface BalanceItem {
  tokenId: number;
  symbol: string;
  amount: number;
  type: 'MAIN' | 'BONUS';
}

interface WalletData {
  balance: number;  // ОБЪЕДИНЁННЫЙ (MAIN + BONUS)
  main: number;     // Только MAIN
  bonus: number;    // Только BONUS
  currency: string;
}

// --- Компонент TopNavigation ---

export function TopNavigation({ onProfileClick }: TopNavigationProps) {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const hasLoadedRef = useRef(false);

  // 1. Загружаем баланс кошелька
  const { data: balanceData, execute: loadBalance } = useFetch(
    'WALLET_GET_wallet_balance',
    'GET'
  );

  // 2. Первичная загрузка при монтировании
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadBalance()
        .catch(err => {
          // Дефолтное значение при ошибке
          setWalletData({ balance: 0, main: 0, bonus: 0, currency: 'USDT' }); 
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [loadBalance, isAuthenticated]); 

  // 3. Обновляем данные при получении ответа
  useEffect(() => {
    if (balanceData && Array.isArray(balanceData) && balanceData.length > 0) {
      // Находим MAIN и BONUS
      const mainBalance = balanceData.find((item: BalanceItem) => item.type === 'MAIN');
      const bonusBalance = balanceData.find((item: BalanceItem) => item.type === 'BONUS');
      
      const mainAmount = mainBalance?.amount || 0;
      const bonusAmount = bonusBalance?.amount || 0;
      const totalAmount = mainAmount + bonusAmount;  // ✅ ОБЪЕДИНЁННЫЙ БАЛАНС
      const symbol = mainBalance?.symbol || 'USDT';
      
      setWalletData({
        balance: totalAmount,  // ОБЪЕДИНЁННЫЙ
        main: mainAmount,      // Только MAIN
        bonus: bonusAmount,    // Только BONUS
        currency: symbol,
      });
    } 
    // Если пустой массив
    else if (balanceData && Array.isArray(balanceData) && balanceData.length === 0) {
      setWalletData({
        balance: 0,
        main: 0,
        bonus: 0,
        currency: 'USDT',
      });
    }
  }, [balanceData]); 

  // Функция форматирования - для крипто показываем до 8 цифр
  const formatBalance = (balance: number) => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  // Обработчик для открытия модального окна пополнения
  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  // Обработчик для закрытия модального окна и перезагрузки баланса
  const handleDepositClose = () => {
    setShowDepositModal(false);
    // Перезагружаем баланс после пополнения
    if (loadBalance) {
      loadBalance().catch(() => {});
    }
  };

  // --- Если модал открыт, показываем DepositPage ---
  if (showDepositModal) {
    return (
      <DepositPage onBack={handleDepositClose} />
    );
  }

  // Цвета в зависимости от темы
  const bgColor = theme === 'dark' ? '#0f1d3a' : '#f5f5f7';
  const borderColor = theme === 'dark' ? '#3b82f640' : '#e0e0e5';
  const textColor = theme === 'dark' ? '#fafafa' : '#1a1a2e';
  const mutedColor = theme === 'dark' ? '#a0aac0' : '#7a7a8a';
  const balanceBg = theme === 'dark' ? '#1f2937' : '#eeeff5';
  const balanceBorder = theme === 'dark' ? '#374151' : '#d0d0db';

  // --- Разметка компонента навигации ---
  return (
    <div 
      className="sticky top-0 z-50 backdrop-blur-md border-b px-4 py-3"
      style={{
        backgroundColor: `${bgColor}dd`,
        borderBottomColor: borderColor,
      }}
    >
      <div className="flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div 
            className="flex items-center justify-center rounded-xl p-2 transition-all duration-300"
            style={{
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.1))'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05))',
              border: `1px solid ${theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
              boxShadow: theme === 'dark' 
                ? '0 2px 8px rgba(59, 130, 246, 0.1)'
                : '0 2px 8px rgba(59, 130, 246, 0.05)'
            }}
          >
            <img 
              src={logoSU} 
              alt="Logo"
              className="h-14 w-auto max-w-[180px] object-contain"
              style={{ maxHeight: '88px' }}
            />
          </div>
        </div>

        {/* Balance and Actions */}
        <div className="flex items-center space-x-3">
          
          {/* Wallet Balance / Loading Placeholder */}
          {!loading && walletData ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: balanceBg,
                border: `1px solid ${balanceBorder}`,
                borderRadius: '12px',
                padding: '8px 12px',
                gap: '8px',
              }}
            >
              <Wallet
                className="w-5 h-5"
                style={{ color: '#3b82f6' }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: mutedColor,
                  }}
                >
                  Баланс
                </span>
                
                {/* ✅ ИСПРАВЛЕНИЕ: ТОЛЬКО ОБЪЕДИНЁННЫЙ БАЛАНС БЕЗ УПОМИНАНИЯ БОНУСА */}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: textColor,
                  }}
                >
                  {formatBalance(Math.floor(walletData.balance * 100) / 100)} {walletData.currency}
                </span>
              </div>
            </div>
          ) : loading ? (
             // Если loading: true - отображаем заглушку
             <div 
                    className="text-sm"
                    style={{ 
                        padding: '10px 12px', 
                        borderRadius: '12px', 
                        backgroundColor: balanceBg, 
                        border: `1px solid ${balanceBorder}`,
                        minWidth: '120px',
                        color: mutedColor,
                    }}
                >
                    Загрузка...
                </div>
            ) : null
          }
          

          {/* Profile Button */}
          <button
            onClick={onProfileClick}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: theme === 'dark' 
                ? 'rgba(148, 163, 184, 0.2)' 
                : 'rgba(148, 163, 184, 0.15)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' 
                ? 'rgba(148, 163, 184, 0.3)' 
                : 'rgba(148, 163, 184, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' 
                ? 'rgba(148, 163, 184, 0.2)' 
                : 'rgba(148, 163, 184, 0.15)';
            }}
          >
            <User className="w-5 h-5" style={{ color: '#3b82f6' }} />
          </button>
        </div>
      </div>
    </div>
  );
}