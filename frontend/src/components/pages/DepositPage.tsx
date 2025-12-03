import { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import DepositForm from '../forms/DepositForm';
import PaymentAddressDisplay from '../display/PaymentAddressDisplay';
import PaymentStatus from '../display/PaymentStatus';
import '../../styles/deposit.css';

type DepositStep = 'FORM' | 'PAYMENT' | 'PENDING' | 'SUCCESS' | 'ERROR';

interface PaymentData {
  transactionId: number;
  address: string;
  amount: string;
  currency: string;
  qrData: string;
  networkInfo: {
    network: string;
    chainId: number | string;
    isTestnet: boolean;
    blockExplorer: string;
    testnetFaucet: string;
  };
}

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
}

export default function DepositPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<DepositStep>('FORM');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<CryptoToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);

  // 🔄 Загружаем доступные токены из БД при монтировании
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const token = localStorage.getItem('casino_jwt_token') 
          || localStorage.getItem('authToken') 
          || localStorage.getItem('token');

        console.log('🔄 Загружаю список токенов...');

        const response = await fetch('http://localhost:4000/api/v1/wallet/tokens', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Токены загружены:', data.data);

          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setTokens(data.data);
          } else {
            console.warn('⚠️ Нет доступных токенов в ответе');
            setTokens([
              {
                id: 1,
                symbol: 'USDT',
                name: 'Tether USD',
                network: 'TRC-20',
                decimals: 6,
              },
            ]);
          }
        } else {
          throw new Error(`Ошибка ${response.status}`);
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки токенов:', err);
        setTokens([
          {
            id: 1,
            symbol: 'USDT',
            name: 'Tether USD',
            network: 'TRC-20',
            decimals: 6,
          },
        ]);
      } finally {
        setTokensLoading(false);
      }
    };

    loadTokens();
  }, []);

  // 1️⃣ Обработка отправки формы
  const handleFormSubmit = async (formData: { amount: string; currency: string }) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('casino_jwt_token') 
        || localStorage.getItem('authToken') 
        || localStorage.getItem('token');

      if (!token) {
        throw new Error('Токен авторизации не найден. Авторизуйтесь заново.');
      }

      console.log('✅ Используется токен:', token.substring(0, 50) + '...');

      const response = await fetch('http://localhost:4000/api/v1/wallet/deposit/create-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: formData.amount,
          currency: formData.currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Ошибка ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Ошибка создания адреса');
      }

      setPaymentData(data.data);
      setStep('PAYMENT');
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // 2️⃣ Копировать адрес в буфер обмена
  const handleCopyAddress = () => {
    if (paymentData?.address) {
      navigator.clipboard.writeText(paymentData.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 3️⃣ Начать ожидание платежа
  const handlePaymentSent = () => {
    setStep('PENDING');
    startPaymentMonitoring();
  };

  // 4️⃣ Мониторинг платежа (polling)
  const startPaymentMonitoring = () => {
    const interval = setInterval(async () => {
      if (!paymentData) return;

      try {
        const token = localStorage.getItem('casino_jwt_token')
          || localStorage.getItem('authToken') 
          || localStorage.getItem('token');
        
        const response = await fetch(
          `http://localhost:4000/api/v1/wallet/deposit/status/${paymentData.transactionId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          console.error('Ошибка проверки статуса:', response.statusText);
          return;
        }

        const data = await response.json();

        if (data.success && data.data.status === 'COMPLETED') {
          setStep('SUCCESS');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Ошибка проверки статуса:', err);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  };

  // 5️⃣ Вернуться на предыдущий шаг
  const handleBack = () => {
    if (step === 'FORM') {
      onBack();
    } else if (step === 'ERROR') {
      setStep('FORM');
      setError(null);
    } else if (step === 'PAYMENT') {
      setStep('FORM');
      setPaymentData(null);
    }
  };

  return (
    <div className="deposit-page">
      {/* Header */}
      <div className="deposit-header">
        <button className="back-button" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <h1>Пополнить баланс</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Content */}
      <div className="deposit-content">
        {/* STEP 1: ФОРМА */}
        {step === 'FORM' && (
          <DepositForm
            onSubmit={handleFormSubmit}
            loading={loading}
            error={error}
            availableTokens={tokens}
            tokensLoading={tokensLoading}
          />
        )}

        {/* STEP 2: АДРЕС ПЛАТЕЖА */}
        {step === 'PAYMENT' && paymentData && (
          <div className="payment-section">
            <PaymentAddressDisplay
              address={paymentData.address}
              amount={paymentData.amount}
              currency={paymentData.currency}
              qrData={paymentData.qrData}
              networkInfo={paymentData.networkInfo}
            />

            {/* Кнопка копирования адреса */}
            <div className="address-copy-section">
              <button
                className="copy-button"
                onClick={handleCopyAddress}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Копировать адрес
                  </>
                )}
              </button>
            </div>

            {/* Инструкция */}
            <div className="instruction-box">
              <p className="instruction-title">📋 Инструкция:</p>
              <ol>
                <li>Откройте ваш кошелек (TronLink, TrustWallet, Metamask и т.д.)</li>
                <li>Переключитесь на сеть <strong>TRON (Testnet Nile)</strong></li>
                <li>Отправьте {paymentData.amount} {paymentData.currency} на адрес выше</li>
                <li>Подождите подтверждения (обычно 1-5 минут)</li>
                <li>Баланс пополнится автоматически</li>
              </ol>
            </div>

            {/* Тестовые токены */}
            {paymentData.networkInfo.isTestnet && (
              <div className="testnet-info">
                <p>
                  🧪 <strong>Тестовая сеть TRON Nile:</strong> Нужны тестовые токены?{' '}
                  <a
                    href={paymentData.networkInfo.testnetFaucet}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Получить тестовый {paymentData.currency}
                  </a>
                </p>
              </div>
            )}

            {/* Кнопка "Отправил" */}
            <button
              className="sent-button"
              onClick={handlePaymentSent}
            >
              ✓ Я отправил платеж
            </button>
          </div>
        )}

        {/* STEP 3: ОЖИДАНИЕ ПЛАТЕЖА */}
        {step === 'PENDING' && paymentData && (
          <PaymentStatus
            status="PENDING"
            amount={paymentData.amount}
            currency={paymentData.currency}
            transactionId={paymentData.transactionId}
            blockExplorer={paymentData.networkInfo.blockExplorer}
          />
        )}

        {/* STEP 4: УСПЕХ */}
        {step === 'SUCCESS' && paymentData && (
          <PaymentStatus
            status="SUCCESS"
            amount={paymentData.amount}
            currency={paymentData.currency}
            transactionId={paymentData.transactionId}
            blockExplorer={paymentData.networkInfo.blockExplorer}
            onClose={onBack}
          />
        )}

        {/* STEP 5: ОШИБКА */}
        {step === 'ERROR' && (
          <div className="error-section">
            <div className="error-icon">❌</div>
            <h2>Ошибка</h2>
            <p className="error-message">{error}</p>
            <button
              className="retry-button"
              onClick={() => {
                setStep('FORM');
                setError(null);
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}