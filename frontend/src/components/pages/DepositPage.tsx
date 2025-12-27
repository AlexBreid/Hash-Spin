import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Check, Gift, CreditCard } from 'lucide-react';
import DepositForm from '../forms/DepositForm';
import '../../styles/deposit.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type DepositStep = 'FORM' | 'BONUS_CHOICE' | 'PAYMENT' | 'PENDING' | 'SUCCESS' | 'ERROR';

interface CryptoCloudInvoice {
  invoiceId: string;
  payUrl: string;
  amount: number;
  currency: string;
  withBonus: boolean;
  orderId: string;
}

interface BonusInfo {
  canUseBonus: boolean;
  reason?: string;
  limits: {
    minDeposit: number;
    maxBonus: number;
    depositBonusPercent: number;
    wageringMultiplier: number;
    maxPayoutMultiplier: number;
    bonusExpiryDays: number;
  };
}

export default function DepositPage({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<DepositStep>('FORM');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USDT');
  const [invoice, setInvoice] = useState<CryptoCloudInvoice | null>(null);
  const [bonusInfo, setBonusInfo] = useState<BonusInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем информацию о бонусе при монтировании
  useEffect(() => {
    loadBonusInfo();
  }, []);

  const loadBonusInfo = async () => {
    try {
      const token = localStorage.getItem('casino_jwt_token') 
        || localStorage.getItem('authToken') 
        || localStorage.getItem('token');

      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/check-bonus`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBonusInfo(data.data);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки информации о бонусе:', err);
    }
  };

  // Обработка отправки формы
  const handleFormSubmit = async (formData: { amount: string; currency: string }) => {
    setLoading(true);
    setError(null);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Некорректная сумма');
      }

      setDepositAmount(amount);
      setSelectedCurrency(formData.currency);

      // Если доступен бонус и валюта USDT, показываем выбор бонуса
      if (bonusInfo?.canUseBonus && formData.currency === 'USDT') {
        setStep('BONUS_CHOICE');
      } else {
        // Сразу создаем депозит без бонуса
        await createDeposit(amount, false);
      }
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Создать депозит
  const createDeposit = async (amount: number, withBonus: boolean) => {
    try {
      const token = localStorage.getItem('casino_jwt_token') 
        || localStorage.getItem('authToken') 
        || localStorage.getItem('token');

      if (!token) {
        throw new Error('Токен авторизации не найден. Авторизуйтесь заново.');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount,
          withBonus: withBonus
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Ошибка ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Ошибка создания депозита');
      }

      setInvoice(data.data);
      setStep('PAYMENT');
      startPaymentMonitoring(data.data.invoiceId);
    } catch (err) {
      console.error('❌ Ошибка создания депозита:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    }
  };

  // Выбор бонуса
  const handleBonusChoice = async (withBonus: boolean) => {
    setLoading(true);
    try {
      await createDeposit(depositAmount, withBonus);
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Мониторинг статуса платежа
  const startPaymentMonitoring = (invoiceId: string) => {
    setStep('PENDING');
    
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('casino_jwt_token')
          || localStorage.getItem('authToken') 
          || localStorage.getItem('token');
        
        if (!token) return;

        const response = await fetch(
          `${API_BASE_URL}/api/v1/deposit/status/${invoiceId}`,
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

        if (data.success) {
          const status = data.data.status;
          
          if (status === 'success' || status === 'paid' || status === 'completed') {
            setStep('SUCCESS');
            clearInterval(interval);
          } else if (status === 'failed' || status === 'error') {
            setError('Платеж не прошел');
            setStep('ERROR');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Ошибка проверки статуса:', err);
      }
    }, 3000);

    // Останавливаем проверку через 10 минут
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  };

  // Вернуться на предыдущий шаг
  const handleBack = () => {
    if (step === 'FORM') {
      onBack();
    } else if (step === 'ERROR') {
      setStep('FORM');
      setError(null);
    } else if (step === 'BONUS_CHOICE') {
      setStep('FORM');
    } else if (step === 'PAYMENT' || step === 'PENDING') {
      setStep('FORM');
      setInvoice(null);
    }
  };

  // Открыть ссылку на оплату
  const handleOpenPayment = () => {
    if (invoice?.payUrl) {
      window.open(invoice.payUrl, '_blank');
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
            availableTokens={[{ id: 1, symbol: 'USDT', name: 'Tether USD', network: 'CryptoCloud', decimals: 8 }]}
            tokensLoading={false}
          />
        )}

        {/* STEP 2: ВЫБОР БОНУСА */}
        {step === 'BONUS_CHOICE' && bonusInfo && (
          <div className="bonus-choice-section" style={{
            padding: '24px',
            background: 'var(--background, #0f1d3a)',
            borderRadius: '16px',
            border: '1px solid var(--border, #3b82f640)',
          }}>
            <h2 style={{ marginBottom: '8px', fontSize: '24px', color: 'var(--text, #fafafa)' }}>
              🎁 Доступен бонус +100%!
            </h2>
            <p style={{ marginBottom: '24px', color: 'var(--muted, #a0aac0)', fontSize: '14px' }}>
              Пополнение на {depositAmount.toFixed(2)} {selectedCurrency}
            </p>

            {/* Вариант с бонусом */}
            <div 
              onClick={() => handleBonusChoice(true)}
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                marginBottom: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                border: '2px solid transparent',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.border = '2px solid #fff')}
              onMouseLeave={(e) => e.currentTarget.style.border = '2px solid transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <Gift size={24} style={{ marginRight: '12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
                  ✅ С БОНУСОМ +100%
                </h3>
              </div>
              <ul style={{ 
                margin: '12px 0 0 0', 
                paddingLeft: '20px',
                color: '#fff',
                fontSize: '14px',
                lineHeight: '1.8'
              }}>
                <li>+100% к пополнению (до {bonusInfo.limits.maxBonus} USDT)</li>
                <li>Отыграй {bonusInfo.limits.wageringMultiplier}x от суммы</li>
                <li>Выигрыш до {bonusInfo.limits.maxPayoutMultiplier}x</li>
                <li>Действителен {bonusInfo.limits.bonusExpiryDays} дней</li>
              </ul>
            </div>

            {/* Вариант без бонуса */}
            <div 
              onClick={() => handleBonusChoice(false)}
              style={{
                padding: '20px',
                background: 'var(--card-bg, #1f2937)',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                border: '2px solid var(--border, #374151)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.border = '2px solid #3b82f6')}
              onMouseLeave={(e) => e.currentTarget.style.border = '2px solid var(--border, #374151)'}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <CreditCard size={24} style={{ marginRight: '12px', color: 'var(--text, #fafafa)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text, #fafafa)', margin: 0 }}>
                  💎 БЕЗ БОНУСА
                </h3>
              </div>
              <p style={{ 
                margin: '12px 0 0 0', 
                color: 'var(--muted, #a0aac0)',
                fontSize: '14px'
              }}>
                Сразу на счёт, без условий отыгрыша
              </p>
            </div>

            {loading && (
              <div style={{ 
                marginTop: '16px', 
                textAlign: 'center', 
                color: 'var(--muted, #a0aac0)' 
              }}>
                ⏳ Создание счета...
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ОПЛАТА */}
        {step === 'PAYMENT' && invoice && (
          <div className="payment-section" style={{
            padding: '24px',
            background: 'var(--background, #0f1d3a)',
            borderRadius: '16px',
            border: '1px solid var(--border, #3b82f640)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', color: 'var(--text, #fafafa)', marginBottom: '8px' }}>
                Счет создан
              </h2>
              <p style={{ fontSize: '18px', color: 'var(--muted, #a0aac0)', marginBottom: '4px' }}>
                {invoice.amount.toFixed(2)} {invoice.currency}
              </p>
              {invoice.withBonus && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                }}>
                  🎁 Бонус +100% будет начислен после оплаты
                </div>
              )}
            </div>

            <button
              onClick={handleOpenPayment}
              style={{
                width: '100%',
                padding: '16px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '16px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              <CreditCard size={20} />
              Оплатить через CryptoCloud
              <ExternalLink size={18} />
            </button>

            <div style={{
              padding: '16px',
              background: 'var(--card-bg, #1f2937)',
              borderRadius: '12px',
              fontSize: '14px',
              color: 'var(--muted, #a0aac0)',
            }}>
              <p style={{ margin: '0 0 8px 0' }}>
                📋 <strong>Инструкция:</strong>
              </p>
              <ol style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>Нажмите кнопку "Оплатить через CryptoCloud"</li>
                <li>Выберите способ оплаты (криптовалюта)</li>
                <li>Следуйте инструкциям для завершения платежа</li>
                <li>После оплаты баланс пополнится автоматически</li>
              </ol>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--card-bg, #1f2937)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--muted, #a0aac0)',
              textAlign: 'center',
            }}>
              ID счета: {invoice.invoiceId}
            </div>
          </div>
        )}

        {/* STEP 4: ОЖИДАНИЕ ПЛАТЕЖА */}
        {step === 'PENDING' && invoice && (
          <div className="pending-section" style={{
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              border: '4px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <h2 style={{ fontSize: '24px', color: 'var(--text, #fafafa)', marginBottom: '8px' }}>
              Ожидание оплаты...
            </h2>
            <p style={{ color: 'var(--muted, #a0aac0)', marginBottom: '16px' }}>
              Сумма: {invoice.amount.toFixed(2)} {invoice.currency}
            </p>
            <p style={{ color: 'var(--muted, #a0aac0)', fontSize: '14px' }}>
              Мы проверяем статус платежа. Это может занять несколько минут.
            </p>
            <button
              onClick={handleOpenPayment}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: 'var(--card-bg, #1f2937)',
                color: 'var(--text, #fafafa)',
                border: '1px solid var(--border, #374151)',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '20px auto 0',
              }}
            >
              <ExternalLink size={16} />
              Открыть страницу оплаты
            </button>
          </div>
        )}

        {/* STEP 5: УСПЕХ */}
        {step === 'SUCCESS' && invoice && (
          <div className="success-section" style={{
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={40} color="#fff" />
            </div>
            <h2 style={{ fontSize: '24px', color: 'var(--text, #fafafa)', marginBottom: '8px' }}>
              Платеж успешно выполнен!
            </h2>
            <p style={{ color: 'var(--muted, #a0aac0)', marginBottom: '24px' }}>
              Ваш баланс пополнен на {invoice.amount.toFixed(2)} {invoice.currency}
            </p>
            {invoice.withBonus && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                color: '#fff',
              }}>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                  🎁 Бонус +100% начислен!
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  Отыграйте {bonusInfo?.limits.wageringMultiplier || 10}x для вывода
                </p>
              </div>
            )}
            <button
              onClick={onBack}
              style={{
                padding: '12px 32px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Готово
            </button>
          </div>
        )}

        {/* STEP 6: ОШИБКА */}
        {step === 'ERROR' && (
          <div className="error-section" style={{
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ fontSize: '24px', color: 'var(--text, #fafafa)', marginBottom: '8px' }}>
              Ошибка
            </h2>
            <p style={{ color: 'var(--muted, #a0aac0)', marginBottom: '24px' }}>
              {error || 'Произошла ошибка'}
            </p>
            <button
              onClick={handleBack}
              style={{
                padding: '12px 32px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
