import { User, Plus, ChevronDown, Coins } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useFetch } from '../hooks/useDynamicApi'; 
import { Button } from './ui/button';
import DepositPage from './pages/DepositPage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import logoSU from '../assets/SU.png';
import { CurrencySelector, CurrencyInfo, setGlobalCurrency, getGlobalCurrency } from './CurrencySelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// --- Интерфейсы ---

interface TopNavigationProps {
  onProfileClick: () => void;
}

interface BalanceItem {
  tokenId: number;
  symbol: string;
  amount: number;
  type: 'MAIN' | 'BONUS';
  token?: {
    id: number;
    symbol: string;
    name: string;
    network: string;
  };
}

interface WalletData {
  balance: number;  // ОБЪЕДИНЁННЫЙ (MAIN + BONUS)
  main: number;     // Только MAIN
  bonus: number;    // Только BONUS
  currency: string;
  tokenId: number;
  network: string;
}

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
}

// Кошелек пользователя (сгруппированный баланс по токену)
interface UserWallet {
  tokenId: number;
  symbol: string;
  network: string;
  main: number;
  bonus: number;
  total: number;
}

// --- Компонент TopNavigation ---

const STORAGE_KEY_SELECTED_TOKEN = 'selectedTokenId';

export function TopNavigation({ onProfileClick }: TopNavigationProps) {
  const { theme } = useTheme();
  const { isAuthenticated, token } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositCurrency, setDepositCurrency] = useState<string | null>(null); // Валюта для депозита
  const [userWallets, setUserWallets] = useState<UserWallet[]>([]); // Кошельки пользователя
  const [availableTokens, setAvailableTokens] = useState<CryptoToken[]>([]); // Все доступные токены
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const hasLoadedRef = useRef(false);

  // 1. Загружаем все балансы пользователя
  const loadUserBalances = useCallback(async () => {
    if (!token) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/wallet/balance`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Загружены балансы:', data);
        
        if (data.success && Array.isArray(data.data)) {
          // ✅ Группируем балансы по СИМВОЛУ (все USDT вместе, все USDC вместе)
          const walletsMap = new Map<string, UserWallet>();
          
          data.data.forEach((bal: BalanceItem) => {
            const symbol = bal.symbol;
            const existing = walletsMap.get(symbol);
            
            if (existing) {
              if (bal.type === 'MAIN') {
                existing.main += bal.amount;
              } else if (bal.type === 'BONUS') {
                existing.bonus += bal.amount;
              }
              existing.total = existing.main + existing.bonus;
            } else {
              walletsMap.set(symbol, {
                tokenId: bal.tokenId,
                symbol: symbol,
                network: bal.token?.network || 'MULTI',
                main: bal.type === 'MAIN' ? bal.amount : 0,
                bonus: bal.type === 'BONUS' ? bal.amount : 0,
                total: bal.amount,
              });
            }
          });
          
          const wallets = Array.from(walletsMap.values());
          console.log('💰 Кошельки пользователя:', wallets);
          setUserWallets(wallets);
          
          // Устанавливаем выбранную валюту
          const savedSymbol = localStorage.getItem(STORAGE_KEY_SELECTED_TOKEN);
          let selectedWallet: UserWallet | undefined = undefined;
          
          if (savedSymbol) {
            // Пробуем найти по символу (новый формат) или по tokenId (старый формат)
            selectedWallet = wallets.find(w => w.symbol === savedSymbol);
            if (!selectedWallet) {
              const parsed = parseInt(savedSymbol);
              if (!isNaN(parsed)) {
                selectedWallet = wallets.find(w => w.tokenId === parsed);
              }
            }
          }
          
          // Если не нашли, выбираем USDT или первый доступный
          if (!selectedWallet && wallets.length > 0) {
            selectedWallet = wallets.find(w => w.symbol === 'USDT') || wallets[0];
          }
          
          if (selectedWallet) {
            setSelectedTokenId(selectedWallet.tokenId);
            // Сохраняем символ для следующего раза
            localStorage.setItem(STORAGE_KEY_SELECTED_TOKEN, selectedWallet.symbol);
            
            // Устанавливаем данные кошелька
            setWalletData({
              balance: selectedWallet.total,
              main: selectedWallet.main,
              bonus: selectedWallet.bonus,
              currency: selectedWallet.symbol,
              tokenId: selectedWallet.tokenId,
              network: selectedWallet.network,
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки балансов:', error);
    }
  }, [token]);

  // 2. Загружаем список всех доступных токенов (для депозита в новую валюту)
  const loadAvailableTokens = useCallback(async () => {
    if (!token) return;
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      
      const response = await fetch(
        `${API_BASE_URL}/api/v1/wallet/tokens`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAvailableTokens(data.data);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки токенов:', error);
    }
  }, [token]);

  // 3. Загружаем данные при монтировании
  useEffect(() => {
    if (!isAuthenticated || hasLoadedRef.current) return;
    
    hasLoadedRef.current = true;
    setLoading(true);
    
    Promise.all([
      loadUserBalances(),
      loadAvailableTokens(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [isAuthenticated, loadUserBalances, loadAvailableTokens]);

  // 4. Обработчик смены валюты (по tokenId или символу)
  const handleTokenChange = useCallback((tokenId: number) => {
    // Находим кошелёк
    let selectedWallet = userWallets.find(w => w.tokenId === tokenId);
    if (!selectedWallet) {
      // Может быть передан tokenId из availableTokens
      const token = availableTokens.find(t => t.id === tokenId);
      if (token) {
        selectedWallet = userWallets.find(w => w.symbol === token.symbol);
      }
    }
    
    const symbol = selectedWallet?.symbol || '';
    console.log(`🔄 Смена валюты на ${symbol} (tokenId=${tokenId})`);
    
    if (selectedWallet) {
      setSelectedTokenId(selectedWallet.tokenId);
    } else {
      setSelectedTokenId(tokenId);
    }
    
    // Сохраняем символ для следующего раза
    if (symbol) {
      localStorage.setItem(STORAGE_KEY_SELECTED_TOKEN, symbol);
    }
    if (selectedWallet) {
      setWalletData({
        balance: selectedWallet.total,
        main: selectedWallet.main,
        bonus: selectedWallet.bonus,
        currency: selectedWallet.symbol,
        tokenId: selectedWallet.tokenId,
        network: selectedWallet.network,
      });
    } else {
      // Если нет баланса в этой валюте, показываем 0
      const tokenInfo = availableTokens.find(t => t.id === tokenId);
      setWalletData({
        balance: 0,
        main: 0,
        bonus: 0,
        currency: tokenInfo?.symbol || 'USDT',
        tokenId: tokenId,
        network: tokenInfo?.network || 'TRC-20',
      });
    }
  }, [userWallets, availableTokens]); 

  // Функция форматирования - адаптивное отображение
  const formatBalance = (balance: number, compact: boolean = false) => {
    if (compact) {
      // Компактный формат для больших чисел
      if (balance >= 1000000) {
        return (balance / 1000000).toFixed(2) + 'M';
      }
      if (balance >= 100000) {
        return (balance / 1000).toFixed(1) + 'K';
      }
      if (balance >= 10000) {
        return balance.toFixed(2);
      }
    }
    
    // Обычный формат
    if (balance >= 10000) {
      return balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    if (balance >= 100) {
      return balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    }
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };
  
  // Размер шрифта в зависимости от длины числа
  const getBalanceFontSize = (balance: number) => {
    const str = formatBalance(balance);
    if (str.length > 15) return '11px';
    if (str.length > 12) return '12px';
    if (str.length > 9) return '13px';
    return '14px';
  };

  // Обработчик для открытия модального окна пополнения
  const handleDepositClick = () => {
    // Запоминаем текущую выбранную валюту для депозита
    const globalCurrency = getGlobalCurrency();
    if (globalCurrency) {
      setDepositCurrency(globalCurrency.symbol);
    }
    setShowDepositModal(true);
  };

  // Обработчик для закрытия модального окна и перезагрузки баланса
  const handleDepositClose = () => {
    setShowDepositModal(false);
    setDepositCurrency(null);
    // Перезагружаем все балансы после пополнения
    loadUserBalances();
  };

  // Получаем информацию о выбранной валюте
  const selectedWallet = userWallets.find(w => w.tokenId === selectedTokenId);
  const selectedToken = availableTokens.find((t: CryptoToken) => t.id === selectedTokenId);

  // --- Если модал открыт, показываем DepositPage ---
  if (showDepositModal) {
    return (
      <DepositPage onBack={handleDepositClose} defaultCurrency={depositCurrency} />
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
        <div className="flex items-center space-x-2">
          
          {/* Объединённый блок: Селект валюты + Баланс */}
          {!loading ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0',
                    backgroundColor: balanceBg,
                    border: `1px solid ${balanceBorder}`,
                    borderRadius: '14px',
                    padding: '0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = balanceBorder;
                  }}
                >
                  {/* Левая часть - селект валюты */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 12px',
                      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.08)',
                      borderRight: `1px solid ${balanceBorder}`,
                    }}
                  >
                    <Coins className="w-4 h-4" style={{ color: '#10b981' }} />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: textColor,
                      }}
                    >
                      {selectedWallet?.symbol || selectedToken?.symbol || 'USD'}
                    </span>
                    <ChevronDown className="w-3 h-3" style={{ color: mutedColor }} />
                  </div>
                  
                  {/* Правая часть - баланс */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      padding: '8px 14px',
                      minWidth: '90px',
                      maxWidth: '160px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '9px',
                        color: mutedColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        lineHeight: '1',
                      }}
                    >
                      Баланс
                    </span>
                    <span
                      style={{
                        fontSize: getBalanceFontSize(walletData?.balance || 0),
                        fontWeight: '700',
                        color: (walletData?.balance || 0) > 0 ? '#10b981' : textColor,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '140px',
                        lineHeight: '1.2',
                      }}
                    >
                      {formatBalance(walletData?.balance || 0)}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                style={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${balanceBorder}`,
                  borderRadius: '12px',
                  padding: '8px',
                  minWidth: '280px',
                  maxHeight: '450px',
                  overflowY: 'auto',
                }}
              >
                {/* Заголовок */}
                <div style={{ 
                  padding: '8px 12px', 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: mutedColor,
                  borderBottom: `1px solid ${balanceBorder}`,
                  marginBottom: '8px',
                }}>
                  Ваши кошельки
                </div>
                
                {/* Список кошельков с балансами */}
                {userWallets.length > 0 ? (
                  userWallets.map((wallet) => (
                    <DropdownMenuItem
                      key={wallet.tokenId}
                      onClick={() => handleTokenChange(wallet.tokenId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginBottom: '4px',
                        backgroundColor: selectedTokenId === wallet.tokenId
                          ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)')
                          : 'transparent',
                        border: selectedTokenId === wallet.tokenId 
                          ? '1px solid rgba(16, 185, 129, 0.3)' 
                          : '1px solid transparent',
                      }}
                    >
                      {/* Иконка валюты */}
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme === 'dark' 
                            ? 'rgba(16, 185, 129, 0.2)' 
                            : 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          fontWeight: '700',
                          fontSize: '12px',
                        }}
                      >
                        {wallet.symbol.substring(0, 3)}
                      </div>
                      
                      {/* Информация о валюте */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: textColor,
                          }}>
                            {wallet.symbol}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: wallet.total > 0 ? '#10b981' : mutedColor,
                          }}>
                            {formatBalance(wallet.total)}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '2px',
                        }}>
                          <span style={{
                            fontSize: '11px',
                            color: mutedColor,
                          }}>
                            {wallet.network}
                          </span>
                          {wallet.bonus > 0 && (
                            <span style={{
                              fontSize: '10px',
                              color: '#f59e0b',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              +{formatBalance(wallet.bonus)} бонус
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Индикатор выбранной валюты */}
                      {selectedTokenId === wallet.tokenId && (
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                          }}
                        />
                      )}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div style={{ 
                    padding: '20px', 
                    textAlign: 'center', 
                    color: mutedColor,
                    fontSize: '13px',
                  }}>
                    Нет кошельков. Пополните баланс!
                  </div>
                )}
                
                {/* Разделитель и все доступные валюты для депозита */}
                <div style={{ 
                  padding: '8px 12px', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: mutedColor,
                  borderTop: `1px solid ${balanceBorder}`,
                  marginTop: '8px',
                  paddingTop: '12px',
                }}>
                  Доступные для пополнения
                </div>
                {availableTokens
                  .filter(t => !userWallets.some(w => w.tokenId === t.id))
                  .map((token) => (
                    <DropdownMenuItem
                      key={token.id}
                      onClick={() => {
                        handleTokenChange(token.id);
                        // Можно открыть депозит сразу
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        opacity: 0.6,
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme === 'dark' 
                            ? 'rgba(148, 163, 184, 0.08)' 
                            : 'rgba(148, 163, 184, 0.05)',
                          color: mutedColor,
                          fontWeight: '600',
                          fontSize: '9px',
                        }}
                      >
                        {token.symbol.substring(0, 3)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: mutedColor,
                        }}>
                          {token.symbol}
                        </div>
                        <div style={{
                          fontSize: '9px',
                          color: mutedColor,
                          opacity: 0.7,
                        }}>
                          {token.network}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: balanceBg,
                border: `1px solid ${balanceBorder}`,
                borderRadius: '12px',
                fontSize: '12px',
                color: mutedColor,
              }}
            >
              Загрузка...
            </div>
          )}

          
          {/* Deposit Button */}
          <button
            onClick={handleDepositClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Пополнить баланс"
          >
            <Plus className="w-5 h-5" style={{ color: '#ffffff' }} />
          </button>

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