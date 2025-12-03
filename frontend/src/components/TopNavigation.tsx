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
  balance: number;
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

  // 2. Первичная загрузка при монтировании (вызов execute)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('Загрузка баланса...'); // DEBUG
      loadBalance()
        .catch(err => {
          // Устанавливаем дефолтное значение при ошибке
          console.error('Ошибка загрузки баланса:', err);
          setWalletData({ balance: 0, currency: 'USDT' }); 
        })
        .finally(() => {
          console.log('Загрузка завершена'); // DEBUG
          // Завершаем состояние загрузки после первого запроса
          setLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 3. Обновляем данные при получении ответа (Единый источник истины)
  useEffect(() => {
    console.log('balanceData изменился:', balanceData); // DEBUG
    
    // useFetch возвращает массив напрямую, не объект с success
    if (balanceData && Array.isArray(balanceData) && balanceData.length > 0) {
      // Находим MAIN баланс, если его нет - берем первый
      const wallet: BalanceItem = balanceData.find((item: BalanceItem) => item.type === 'MAIN') 
        || balanceData[0];
      
      console.log('Установка walletData:', wallet); // DEBUG
      
      setWalletData({
        balance: wallet.amount || 0,
        currency: wallet.symbol || 'USDT',
      });
    } 
    // Если пустой массив
    else if (balanceData && Array.isArray(balanceData) && balanceData.length === 0) {
        console.log('Пустой массив данных'); // DEBUG
        setWalletData({
            balance: 0,
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
        console.error('Ошибка перезагрузки баланса:', err);
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
          {/* ОТОБРАЖАЕМ БАЛАНС, ЕСЛИ ДАННЫЕ УЖЕ УСТАНОВЛЕНЫ */}
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
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#e5e7eb',
                  }}
                >
                  {formatBalance(walletData.balance)} {walletData.currency}
                </span>
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
          

          {/* Deposit Button - ОТКРЫВАЕТ МОДАЛ */}
          <Button
            onClick={handleDepositClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Plus className="w-4 h-4" />
            Пополнить
          </Button>

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