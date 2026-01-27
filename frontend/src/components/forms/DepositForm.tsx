
import { useState, useEffect } from 'react';
import { AlertCircle, Check, Zap, Clock, DollarSign } from 'lucide-react';

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
  depositNetworks?: NetworkOption[];
  minDeposit?: number;  // Минимальный депозит в единицах валюты
  minDepositUSD?: number;  // Минимальный депозит в USD (обычно 10)
}

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
        console.error('Ошибка загрузки сетей:', err);
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
            {availableTokens.map(token => (
              <button
                key={token.id}
                type="button"
                onClick={() => setSelectedTokenId(token.id)}
                style={{
                  padding: '12px 8px',
                  background: selectedTokenId === token.id 
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)'
                    : '#1f2937',
                  border: selectedTokenId === token.id 
                    ? '2px solid #10b981' 
                    : '1px solid #374151',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: selectedTokenId === token.id 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '11px',
                  color: '#fff',
                }}>
                  {token.symbol.substring(0, 3)}
                </div>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: selectedTokenId === token.id ? '#10b981' : '#e5e7eb',
                }}>
                  {token.symbol}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ШАГ 2: Выбор сети */}
      {selectedCoin && (
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

      {/* ШАГ 3: Сумма */}
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
    </form>
  );
}
