
import { useState, useEffect } from 'react';
import { AlertCircle, Check, Zap, DollarSign, Star, Loader2 } from 'lucide-react';
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
  depositNetworks?: NetworkOption[];
  minDeposit?: number;
  minDepositUSD?: number;
}

// ⭐ Проверка, является ли токен Telegram Stars
const isStarsToken = (token: CryptoToken | undefined) => {
  return token?.symbol === 'XTR' || token?.network === 'TELEGRAM';
};

// ⭐ Быстрые суммы для Stars
const STARS_QUICK_AMOUNTS = [
  { stars: 50, usd: 1 },
  { stars: 100, usd: 2 },
  { stars: 250, usd: 5 },
  { stars: 500, usd: 10 },
  { stars: 1000, usd: 20 },
  { stars: 2500, usd: 50 },
];

interface NetworkOption {
  network: string;
  name: string;
  fee: string;
  speed: string;
}

interface DepositFormProps {
  onSubmit: (data: { amount: string; currency: string; tokenId?: number; network?: string }) => void;
  loading: boolean;
  error?: string | null;
  availableTokens: CryptoToken[];
  tokensLoading: boolean;
}

// ⭐ Компонент для пополнения через Telegram Stars
function StarsDepositBlock() {
  const [selectedStars, setSelectedStars] = useState<number | null>(null);
  const [customStars, setCustomStars] = useState('');
  const [starsLoading, setStarsLoading] = useState(false);
  const { isAvailable, openInvoice, hapticFeedback } = useTelegramWebApp();
  
  const starsAmount = selectedStars || (customStars ? parseInt(customStars) : 0);
  const usdAmount = starsAmount * 0.02;
  
  const handleStarsPayment = async () => {
    if (!starsAmount || starsAmount < 50) {
      toast.error('Минимум 50 Stars');
      return;
    }
    
    if (starsAmount > 10000) {
      toast.error('Максимум 10,000 Stars');
      return;
    }
    
    setStarsLoading(true);
    
    try {
      const token = localStorage.getItem('casino_jwt_token') 
        || localStorage.getItem('authToken') 
        || localStorage.getItem('token');
      
      if (!token) {
        toast.error('Необходима авторизация');
        return;
      }
      
      // Создаём инвойс на сервере
      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/stars/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          starsAmount: starsAmount,
          withBonus: false
        }),
      });
      
      const data = await response.json();
      console.log('🔵 Stars invoice response:', data);
      
      if (!data.success) {
        console.error('🔴 Invoice creation failed:', data);
        throw new Error(data.message || data.error || 'Ошибка создания инвойса');
      }
      
      const invoiceLink = data.data?.invoiceLink;
      console.log('🔵 Invoice link:', invoiceLink);
      console.log('🔵 isAvailable:', isAvailable);
      
      // Если Telegram WebApp доступен - открываем инвойс
      if (isAvailable && invoiceLink) {
        hapticFeedback('success');
        console.log('🟢 Opening invoice...');
        
        const status = await openInvoice(invoiceLink);
        console.log('🟢 Invoice status:', status);
        
        if (status === 'paid') {
          toast.success(`✅ Оплачено ${starsAmount} Stars!`);
          hapticFeedback('success');
          setTimeout(() => window.location.reload(), 1000);
        } else if (status === 'cancelled') {
          toast.info('Оплата отменена');
        } else if (status === 'pending') {
          toast.info('Ожидание оплаты...');
        } else {
          toast.error(`Статус оплаты: ${status}`);
        }
      } else if (!isAvailable) {
        toast.error('Оплата Stars доступна только в Telegram');
        console.error('🔴 Telegram WebApp not available');
      } else if (!invoiceLink) {
        toast.error('Не получена ссылка на оплату');
        console.error('🔴 Invoice link is empty');
      }
      
    } catch (error) {
      
      toast.error(error instanceof Error ? error.message : 'Ошибка оплаты');
    } finally {
      setStarsLoading(false);
    }
  };
  
  return (
    <div className="form-group">
      <div style={{
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.1) 100%)',
        border: '2px solid rgba(234, 179, 8, 0.4)',
        borderRadius: '16px',
      }}>
        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭐</div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: '#eab308',
            marginBottom: '4px',
          }}>
            Telegram Stars
          </h3>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>
            1 Star ≈ $0.02 • Мгновенное зачисление
          </p>
        </div>
        
        {/* Быстрые суммы */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          marginBottom: '12px',
        }}>
          {STARS_QUICK_AMOUNTS.map(({ stars, usd }) => (
            <button
              key={stars}
              type="button"
              onClick={() => {
                setSelectedStars(stars);
                setCustomStars('');
              }}
              style={{
                padding: '12px 8px',
                background: selectedStars === stars 
                  ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: selectedStars === stars 
                  ? '2px solid #eab308' 
                  : '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                fontSize: '15px',
                fontWeight: '700',
                color: selectedStars === stars ? '#000' : '#eab308',
              }}>
                {stars} ⭐
              </div>
              <div style={{
                fontSize: '11px',
                color: selectedStars === stars ? '#000' : '#9ca3af',
                marginTop: '2px',
              }}>
                ${usd}
              </div>
            </button>
          ))}
        </div>
        
        {/* Кастомная сумма */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="number"
            placeholder="Другая сумма (50-10000)"
            value={customStars}
            onChange={(e) => {
              setCustomStars(e.target.value);
              setSelectedStars(null);
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '10px',
              color: '#e5e7eb',
              fontSize: '15px',
              textAlign: 'center',
            }}
          />
        </div>
        
        {/* Итого */}
        {starsAmount > 0 && (
          <div style={{
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>К оплате:</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              {starsAmount} <Star size={20} fill="#eab308" />
              <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                (${usdAmount.toFixed(2)})
              </span>
            </div>
          </div>
        )}
        
        {/* Кнопка оплаты */}
        <button
          type="button"
          onClick={handleStarsPayment}
          disabled={starsLoading || starsAmount < 50}
          style={{
            width: '100%',
            padding: '14px',
            background: starsLoading || starsAmount < 50
              ? '#4b5563'
              : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            border: 'none',
            borderRadius: '12px',
            color: starsLoading || starsAmount < 50 ? '#9ca3af' : '#000',
            fontSize: '16px',
            fontWeight: '700',
            cursor: starsLoading || starsAmount < 50 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          {starsLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Создание платежа...
            </>
          ) : (
            <>
              <Star size={20} />
              Оплатить Stars
            </>
          )}
        </button>
        
        {/* Подсказка */}
        {!isAvailable && (
          <p style={{ 
            fontSize: '11px', 
            color: '#6b7280',
            marginTop: '12px',
            textAlign: 'center',
          }}>
            💡 Для оплаты Stars откройте приложение через Telegram
          </p>
        )}
      </div>
    </div>
  );
}

export default function DepositForm({ 
  onSubmit, 
  loading, 
  error,
  availableTokens = [],
  tokensLoading = false
}: DepositFormProps) {
  const [amount, setAmount] = useState('');
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [networksLoading, setNetworksLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Устанавливаем дефолтный токен
  useEffect(() => {
    if (availableTokens.length > 0 && selectedTokenId === null) {
      const defaultToken = availableTokens.find(t => t.symbol === 'USDT') || availableTokens[0];
      if (defaultToken) {
        setSelectedTokenId(defaultToken.id);
      }
    }
  }, [availableTokens, selectedTokenId]);

  const selectedCoin = availableTokens.find(c => c.id === selectedTokenId);
  const currency = selectedCoin?.symbol || 'USDT';

  // Загружаем сети для выбранного токена
  useEffect(() => {
    if (!selectedCoin) return;
    
    // Если у токена есть depositNetworks — используем их
    if (selectedCoin.depositNetworks && selectedCoin.depositNetworks.length > 0) {
      setNetworks(selectedCoin.depositNetworks);
      setSelectedNetwork(selectedCoin.depositNetworks[0].network);
      return;
    }
    
    // Иначе загружаем с сервера
    const loadNetworks = async () => {
      setNetworksLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/wallet/deposit-networks/${selectedCoin.symbol}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.networks && data.data.networks.length > 0) {
            setNetworks(data.data.networks);
            setSelectedNetwork(data.data.networks[0].network);
          } else {
            // Fallback
            setNetworks([{ network: selectedCoin.network, name: selectedCoin.network, fee: '', speed: '' }]);
            setSelectedNetwork(selectedCoin.network);
          }
        }
      } catch (err) {
        
        setNetworks([{ network: selectedCoin.network, name: selectedCoin.network, fee: '', speed: '' }]);
        setSelectedNetwork(selectedCoin.network);
      } finally {
        setNetworksLoading(false);
      }
    };
    
    loadNetworks();
  }, [selectedCoin]);
  
  // ✅ Динамический минимальный депозит для выбранной валюты
  const minAmount = selectedCoin?.minDeposit || 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!amount || isNaN(Number(amount))) {
      setValidationError('Введите корректную сумму');
      return;
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
      setValidationError('Сумма должна быть больше 0');
      return;
    }

    if (numAmount < minAmount) {
      setValidationError(`Минимум: ${minAmount} ${currency} (≈$10)`);
      return;
    }
    
    if (!selectedNetwork) {
      setValidationError('Выберите сеть для пополнения');
      return;
    }

    onSubmit({ 
      amount, 
      currency, 
      tokenId: selectedTokenId || undefined,
      network: selectedNetwork
    });
  };

  return (
    <form className="deposit-form" onSubmit={handleSubmit}>
      {error && (
        <div className="form-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {validationError && (
        <div className="form-error">
          <AlertCircle size={20} />
          <span>{validationError}</span>
        </div>
      )}

      {/* ШАГ 1: Выбор валюты */}
      <div className="form-group">
        <label style={{ marginBottom: '12px', display: 'block', fontSize: '14px', color: '#9ca3af' }}>
          1. Выберите валюту
        </label>
        
        {tokensLoading ? (
          <div style={{
            padding: '16px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            color: '#9ca3af',
            textAlign: 'center',
          }}>
            ⏳ Загрузка...
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: '8px',
          }}>
            {availableTokens.map(token => {
              const isStars = isStarsToken(token);
              const isSelected = selectedTokenId === token.id;
              
              return (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => setSelectedTokenId(token.id)}
                  style={{
                    padding: '12px 8px',
                    background: isSelected 
                      ? isStars 
                        ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.3) 0%, rgba(202, 138, 4, 0.2) 100%)'
                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)'
                      : isStars 
                        ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.05) 100%)'
                        : '#1f2937',
                    border: isSelected 
                      ? isStars ? '2px solid #eab308' : '2px solid #10b981' 
                      : isStars ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid #374151',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                  }}
                >
                  {/* ⭐ Метка для Stars */}
                  {isStars && (
                    <div style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#eab308',
                      color: '#000',
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '2px 5px',
                      borderRadius: '6px',
                    }}>
                      NEW
                    </div>
                  )}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isSelected 
                      ? isStars 
                        ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : isStars 
                        ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.4) 0%, rgba(202, 138, 4, 0.3) 100%)'
                        : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '11px',
                    color: '#fff',
                  }}>
                    {isStars ? '⭐' : token.symbol.substring(0, 3)}
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: isSelected 
                      ? isStars ? '#eab308' : '#10b981' 
                      : '#e5e7eb',
                  }}>
                    {isStars ? 'Stars' : token.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ⭐ Специальный блок для Telegram Stars */}
      {selectedCoin && isStarsToken(selectedCoin) && (
        <StarsDepositBlock />
      )}

      {/* ШАГ 2: Выбор сети (не для Stars) */}
      {selectedCoin && !isStarsToken(selectedCoin) && (
        <div className="form-group">
          <label style={{ marginBottom: '12px', display: 'block', fontSize: '14px', color: '#9ca3af' }}>
            2. Выберите сеть для {selectedCoin.symbol}
          </label>
          
          {networksLoading ? (
            <div style={{
              padding: '16px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              color: '#9ca3af',
              textAlign: 'center',
            }}>
              ⏳ Загрузка сетей...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {networks.map(net => (
                <button
                  key={net.network}
                  type="button"
                  onClick={() => setSelectedNetwork(net.network)}
                  style={{
                    padding: '14px 16px',
                    background: selectedNetwork === net.network 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)'
                      : '#1f2937',
                    border: selectedNetwork === net.network 
                      ? '2px solid #10b981' 
                      : '1px solid #374151',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: selectedNetwork === net.network ? '#10b981' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {selectedNetwork === net.network ? (
                        <Check size={20} style={{ color: '#fff' }} />
                      ) : (
                        <DollarSign size={18} style={{ color: '#9ca3af' }} />
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        color: selectedNetwork === net.network ? '#10b981' : '#e5e7eb',
                      }}>
                        {net.name}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        marginTop: '4px',
                        fontSize: '12px',
                        color: '#6b7280',
                      }}>
                        {net.fee && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DollarSign size={12} /> {net.fee}
                          </span>
                        )}
                        {net.speed && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap size={12} /> {net.speed}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ШАГ 3: Сумма (не для Stars) */}
      {selectedCoin && !isStarsToken(selectedCoin) && (
        <>
          <div className="form-group">
            <label htmlFor="amount" style={{ marginBottom: '8px', display: 'block', fontSize: '14px', color: '#9ca3af' }}>
              3. Сумма ({currency})
            </label>
            <input
              id="amount"
              type="number"
              step="any"
              min="0"
              placeholder={`Минимум: ${minAmount} ${currency}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading || tokensLoading}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '12px',
                color: '#e5e7eb',
                fontSize: '18px',
                fontWeight: '600',
              }}
            />
            <small style={{ color: '#6b7280', marginTop: '6px', display: 'block' }}>
              Минимум: {minAmount} {currency} (≈$10)
            </small>
          </div>

          {/* Информация */}
          {selectedNetwork && (
            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '13px', color: '#10b981', marginBottom: '8px', fontWeight: '600' }}>
                ✓ Выбрано: {currency} через {selectedNetwork}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                • Без комиссии платформы<br/>
                • Обычно зачисление за 1-5 минут
              </div>
            </div>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            className="submit-button"
            disabled={loading || tokensLoading || networksLoading || !amount || !selectedNetwork}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? '#374151' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? '⏳ Создание платежа...' : `Пополнить ${amount || '0'} ${currency}`}
          </button>
        </>
      )}
    </form>
  );
}
