
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
}

interface DepositFormProps {
  onSubmit: (data: { amount: string; currency: string }) => void;
  loading: boolean;
  error?: string | null;
  availableTokens: CryptoToken[];
  tokensLoading: boolean;
}

export default function DepositForm({ 
  onSubmit, 
  loading, 
  error,
  availableTokens = [],
  tokensLoading = false
}: DepositFormProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(availableTokens?.[0]?.symbol || 'USDT');
  const [validationError, setValidationError] = useState('');

  const selectedCoin = availableTokens.find(c => c.symbol === currency);
  const minAmount = 1; // Минимум 1 токен

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Валидация
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
      setValidationError(`Минимум: ${minAmount} ${currency}`);
      return;
    }

    onSubmit({ amount, currency });
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

      {/* Выбор токена/блокчейна */}
      <div className="form-group">
        <label htmlFor="currency">Выберите токен</label>
        {tokensLoading ? (
          <div
            style={{
              padding: '12px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            ⏳ Загрузка доступных токенов...
          </div>
        ) : availableTokens.length > 0 ? (
          <select
            id="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#e5e7eb',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {availableTokens.map(token => (
              <option key={token.symbol} value={token.symbol}>
                💳 {token.symbol} ({token.network})
              </option>
            ))}
          </select>
        ) : (
          <div
            style={{
              padding: '12px',
              background: '#1f2937',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#fca5a5',
              textAlign: 'center',
            }}
          >
            ❌ Нет доступных токенов
          </div>
        )}
        {selectedCoin && (
          <small style={{ color: '#9ca3af', marginTop: '6px', display: 'block' }}>
            Сеть: {selectedCoin.network} | Decimals: {selectedCoin.decimals}
          </small>
        )}
      </div>

      {/* Ввод суммы */}
      <div className="form-group">
        <label htmlFor="amount">Сумма ({currency})</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder={`Минимум: ${minAmount}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading || tokensLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#e5e7eb',
            fontSize: '16px',
          }}
        />
        <small>
          Минимум: {minAmount} {currency}
        </small>
      </div>

      {/* Информация о комиссии и сети */}
      <div className="info-box">
        <p>
          ℹ️ <strong>Без комиссии:</strong> Пополнение полностью бесплатно
        </p>
        <p>
          🔗 <strong>Сеть:</strong> {selectedCoin?.network || 'TRON'}
        </p>
        <p>
          ⚡ <strong>Скорость:</strong> Обычно 1-5 минут
        </p>
      </div>

      {/* Кнопка отправки */}
      <button
        type="submit"
        className="submit-button"
        disabled={loading || tokensLoading || !amount || availableTokens.length === 0}
      >
        {loading ? '⏳ Загрузка...' : tokensLoading ? '⏳ Загрузка токенов...' : '→ Далее'}
      </button>
    </form>
  );
}
