import { User, Wallet, Plus } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useFetch } from '../hooks/useDynamicApi'; 
import { Button } from './ui/button';
import DepositPage from './pages/DepositPage';

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
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('📊 Загрузка баланса...'); // DEBUG
      loadBalance()
        .catch(err => {
          console.error('❌ Ошибка загрузки баланса:', err);
          // Дефолтное значение при ошибке
          setWalletData({ balance: 0, main: 0, bonus: 0, currency: 'USDT' }); 
        })
        .finally(() => {
          console.log('✅ Загрузка завершена'); // DEBUG
          setLoading(false);
        });
    }
  }, [loadBalance]); 

  // 3. Обновляем данные при получении ответа
  useEffect(() => {
    console.log('📊 balanceData изменился:', balanceData); // DEBUG
    
    if (balanceData && Array.isArray(balanceData) && balanceData.length > 0) {
      // Находим MAIN и BONUS
      const mainBalance = balanceData.find((item: BalanceItem) => item.type === 'MAIN');
      const bonusBalance = balanceData.find((item: BalanceItem) => item.type === 'BONUS');
      
      const mainAmount = mainBalance?.amount || 0;
      const bonusAmount = bonusBalance?.amount || 0;
      const totalAmount = mainAmount + bonusAmount;  // ✅ ОБЪЕДИНЁННЫЙ БАЛАНС
      const symbol = mainBalance?.symbol || 'USDT';

      console.log(`📊 Установка walletData:
         Main: ${mainAmount.toFixed(8)}
         Bonus: ${bonusAmount.toFixed(8)}
         Total: ${totalAmount.toFixed(8)}`); // DEBUG
      
      setWalletData({
        balance: totalAmount,  // ОБЪЕДИНЁННЫЙ
        main: mainAmount,      // Только MAIN
        bonus: bonusAmount,    // Только BONUS
        currency: symbol,
      });
    } 
    // Если пустой массив
    else if (balanceData && Array.isArray(balanceData) && balanceData.length === 0) {
      console.log('📊 Пустой массив данных'); // DEBUG
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
      loadBalance().catch(err => {
        console.error('❌ Ошибка перезагрузки баланса:', err);
      });
    }
  };

  // --- Если модал открыт, показываем DepositPage ---
  if (showDepositModal) {
    return (
      <DepositPage onBack={handleDepositClose} />
    );
  }

  // --- Разметка компонента навигации ---
  return (
    <div className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
            <div className="w-6 h-6 bg-white rounded-md opacity-90"></div>
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
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                padding: '8px 12px',
                gap: '8px',
              }}
            >
              <Wallet
                className="w-5 h-5"
                style={{ color: '#60a5fa' }}
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
                    color: '#9ca3af',
                  }}
                >
                  Баланс
                </span>
                
                {/* ОБЪЕДИНЁННЫЙ БАЛАНС */}
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#e5e7eb',
                    marginBottom: '2px'
                  }}
                >
                  {formatBalance(Math.floor(walletData.balance * 100) / 100)} {walletData.currency}
                </span>

                {/* ДЕТАЛИ БАЛАНСА (если есть бонус) */}
                {walletData.bonus > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#fbbf24',
                    }}
                  >
                    💛 Бонус: {formatBalance(walletData.bonus)}
                  </span>
                )}
              </div>
            </div>
          ) : loading ? (
             // Если loading: true - отображаем заглушку
             <div 
                    className="text-sm text-gray-500" 
                    style={{ 
                        padding: '10px 12px', 
                        borderRadius: '12px', 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        minWidth: '120px'
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
              backgroundColor: 'rgba(148, 163, 184, 0.2)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.2)';
            }}
          >
            <User className="w-5 h-5" style={{ color: '#60a5fa' }} />
          </button>
        </div>
      </div>
    </div>
  );
}