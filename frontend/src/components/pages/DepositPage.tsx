import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Check, Gift, CreditCard, Tag, Clock, Users, ChevronRight, Sparkles, X, Wallet } from 'lucide-react';
import DepositForm from '../forms/DepositForm';
import '../../styles/deposit.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type DepositStep = 'FORM' | 'BONUS_CHOICE' | 'PAYMENT' | 'PENDING' | 'SUCCESS' | 'ERROR';

interface CryptoCloudInvoice {
  invoiceId: string;
  payUrl: string | null;
  amount: number;
  amountUSD?: number;
  currency: string;
  network?: string;
  withBonus: boolean;
  promoCode?: string | null;
  promoPercentage?: number | null;
  orderId?: string;
  address?: string;
  staticWallet?: boolean;
  warning?: string;
  testMode?: boolean;
  amountToPay?: string | number;
  paymentCurrency?: string;
  method?: 'onchain' | 'cryptobot' | 'wallet';
  directPayLink?: string;
  miniAppUrl?: string;
  webAppUrl?: string;
  expiresAt?: string;
  invoiceInfo?: {
    amountCrypto?: string;
    currency?: string;
    address?: string;
    network?: string;
    expiresAt?: string;
  };
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

interface PromoItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  percentage: number;
  wagerMultiplier: number;
  minDeposit: number;
  maxDeposit: number | null;
  expiresAt: string | null;
  maxUsages: number | null;
  usedCount: number;
  status: 'available' | 'used' | 'exhausted' | 'expired' | 'blocked';
  reason: string;
  canUse: boolean;
}

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
}

interface DepositPageProps {
  onBack: () => void;
  defaultCurrency?: string | null;
}

export default function DepositPage({ onBack, defaultCurrency }: DepositPageProps) {
  const [step, setStep] = useState<DepositStep>('FORM');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [selectedToken, setSelectedToken] = useState<CryptoToken | null>(null);
  const [availableTokens, setAvailableTokens] = useState<CryptoToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [invoice, setInvoice] = useState<CryptoCloudInvoice | null>(null);
  const [bonusInfo, setBonusInfo] = useState<BonusInfo | null>(null);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [promoInput, setPromoInput] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [selectedPromo, setSelectedPromo] = useState<PromoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'onchain' | 'cryptobot' | 'wallet'>('onchain');

  const getAuthToken = () =>
    localStorage.getItem('casino_jwt_token')
    || localStorage.getItem('authToken')
    || localStorage.getItem('token');

  useEffect(() => {
    loadBonusInfo();
    loadAvailableCurrencies();
    loadPromos();
  }, []);

  const loadAvailableCurrencies = async () => {
    try {
      setTokensLoading(true);
      const token = getAuthToken();
      if (!token) { setTokensLoading(false); return; }

      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/currencies`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAvailableTokens(data.data);
          let tokenToSelect: CryptoToken | undefined;
          if (defaultCurrency) {
            tokenToSelect = data.data.find((t: CryptoToken) => t.symbol === defaultCurrency);
          }
          if (!tokenToSelect) {
            tokenToSelect = data.data.find((t: CryptoToken) => t.symbol === 'USDT') || data.data[0];
          }
          if (tokenToSelect) setSelectedToken(tokenToSelect);
        }
      }
    } catch (err) { /* ignore */ } finally { setTokensLoading(false); }
  };

  const loadBonusInfo = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/check-bonus`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setBonusInfo(data.data);
      }
    } catch (err) { /* ignore */ }
  };

  const loadPromos = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/promos`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setPromos(data.data || []);
      }
    } catch (err) { /* ignore */ }
  };

  const validatePromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoValidating(true);
    setPromoError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/validate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code, amount: depositAmount }),
      });
      const data = await response.json();
      if (data.success && data.data.valid) {
        const p = data.data.promo;
        setSelectedPromo({
          id: p.id, code: p.code, name: p.name,
          description: null, percentage: p.percentage,
          wagerMultiplier: p.wagerMultiplier,
          minDeposit: p.minDeposit, maxDeposit: p.maxDeposit,
          expiresAt: null, maxUsages: null, usedCount: 0,
          status: 'available', reason: '', canUse: true,
        });
        setPromoError(null);
      } else {
        setPromoError(data.data?.reason || data.message || 'Промокод недействителен');
        setSelectedPromo(null);
      }
    } catch {
      setPromoError('Ошибка проверки промокода');
    } finally {
      setPromoValidating(false);
    }
  };

  // Обработка отправки формы
  const handleFormSubmit = async (formData: { amount: string; currency: string; tokenId?: number; method?: 'onchain' | 'wallet' }) => {
    setLoading(true);
    setError(null);

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Некорректная сумма');
      }

      const token = availableTokens.find(t => 
        t.symbol === formData.currency || t.id === formData.tokenId
      ) || selectedToken;

      if (!token) {
        throw new Error('Валюта не выбрана');
      }

      setDepositAmount(amount);
      setSelectedToken(token);
      setDepositMethod(formData.method || 'onchain');
      setSelectedPromo(null);
      setPromoInput('');
      setPromoError(null);

      // Всегда показываем экран бонуса — там промокоды + реферальный бонус
      setStep('BONUS_CHOICE');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Создать депозит
  const createDeposit = async (amount: number, withBonus: boolean, token?: CryptoToken, promoCode?: string) => {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Токен авторизации не найден. Авторизуйтесь заново.');
      }

      const selectedTokenForDeposit = token || selectedToken;
      if (!selectedTokenForDeposit) {
        throw new Error('Валюта не выбрана');
      }

      const body: Record<string, unknown> = {
        amount,
        withBonus,
        tokenId: selectedTokenForDeposit.id,
        currency: `${selectedTokenForDeposit.symbol}_${selectedTokenForDeposit.network}`,
      };
      if (promoCode) body.promoCode = promoCode;

      // Выбираем endpoint в зависимости от метода оплаты
      let endpoint = `${API_BASE_URL}/api/v1/deposit/create`;
      if (depositMethod === 'cryptobot') {
        endpoint = `${API_BASE_URL}/api/v1/deposit/cryptobot/create`;
      } else if (depositMethod === 'wallet') {
        endpoint = `${API_BASE_URL}/api/v1/deposit/wallet/create`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Ошибка ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Ошибка создания депозита');

      setInvoice({ ...data.data, method: depositMethod });
      setStep('PAYMENT');
      startPaymentMonitoring(data.data.invoiceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    }
  };

  // Выбор бонуса: referral, promo, or none
  const handleBonusChoice = async (mode: 'none' | 'referral' | 'promo') => {
    setLoading(true);
    try {
      if (mode === 'promo' && selectedPromo) {
        await createDeposit(depositAmount, true, undefined, selectedPromo.code);
      } else if (mode === 'referral') {
        await createDeposit(depositAmount, true);
      } else {
        await createDeposit(depositAmount, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Мониторинг статуса платежа (в фоне, не меняет шаг)
  const startPaymentMonitoring = (invoiceId: string) => {
    const interval = setInterval(async () => {
      try {
        const token = getAuthToken();
        
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
    } else if (step === 'PAYMENT') {
      setStep('FORM');
      setInvoice(null);
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
            availableTokens={availableTokens}
            tokensLoading={tokensLoading}
          />
        )}

        {/* STEP 2: ВЫБОР БОНУСА / ПРОМОКОД */}
        {step === 'BONUS_CHOICE' && (
          <div style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Заголовок */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎁</div>
              <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 4px' }}>Бонус к депозиту</h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Пополнение: {depositAmount.toFixed(2)} {selectedToken?.symbol || 'USDT'}
              </p>
            </div>

            {/* ── Ввод промокода ── */}
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '14px',
              border: selectedPromo ? '1px solid #10b981' : '1px solid #334155',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Tag size={16} color="#a78bfa" />
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>Промокод</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                  placeholder="Введите промокод"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                  }}
                />
                <button
                  onClick={validatePromoCode}
                  disabled={!promoInput.trim() || promoValidating}
                  style={{
                    padding: '10px 16px',
                    background: promoInput.trim() ? '#6366f1' : '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: promoInput.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    opacity: promoValidating ? 0.7 : 1,
                  }}
                >
                  {promoValidating ? '...' : 'Применить'}
                </button>
              </div>
              {promoError && (
                <p style={{ color: '#f87171', fontSize: '12px', margin: '8px 0 0' }}>{promoError}</p>
              )}
              {selectedPromo && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.1))',
                  borderRadius: '8px',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ color: '#10b981', fontSize: '13px', fontWeight: 700 }}>
                      ✅ {selectedPromo.code} — +{selectedPromo.percentage}%
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                      Вейджер: x{selectedPromo.wagerMultiplier}
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedPromo(null); setPromoInput(''); }}
                    style={{
                      background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* ── Доступные промокоды ── */}
            {promos.length > 0 && !selectedPromo && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Sparkles size={16} color="#fbbf24" />
                  <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>Доступные бонусы</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {promos.map((p) => {
                    const isAvail = p.canUse;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (isAvail) {
                            setPromoInput(p.code);
                            setSelectedPromo(p);
                            setPromoError(null);
                          }
                        }}
                        style={{
                          padding: '12px',
                          background: isAvail
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))'
                            : '#1e293b',
                          borderRadius: '10px',
                          border: isAvail ? '1px solid rgba(99,102,241,0.3)' : '1px solid #334155',
                          cursor: isAvail ? 'pointer' : 'default',
                          opacity: isAvail ? 1 : 0.5,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              background: isAvail ? '#6366f1' : '#475569',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#fff',
                              letterSpacing: '0.5px',
                            }}>
                              {p.code}
                            </div>
                            <span style={{
                              color: isAvail ? '#a78bfa' : '#64748b',
                              fontWeight: 700,
                              fontSize: '15px',
                            }}>
                              +{p.percentage}%
                            </span>
                          </div>
                          {isAvail && <ChevronRight size={16} color="#6366f1" />}
                        </div>
                        <div style={{ marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Gift size={11} /> x{p.wagerMultiplier} вейджер
                          </span>
                          {p.minDeposit > 0 && (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              мин. ${p.minDeposit}
                            </span>
                          )}
                          {p.expiresAt && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} /> до {new Date(p.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                          {p.maxUsages !== null && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Users size={11} /> {p.usedCount}/{p.maxUsages}
                            </span>
                          )}
                        </div>
                        {!isAvail && p.reason && (
                          <p style={{ color: '#f87171', fontSize: '11px', margin: '6px 0 0' }}>{p.reason}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Реферальный бонус (если доступен и не выбран промокод) ── */}
            {bonusInfo?.canUseBonus && !selectedPromo && (
              <div
                onClick={() => !loading && handleBonusChoice('referral')}
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  border: '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Gift size={20} color="#fff" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>
                    Реферальный бонус +{bonusInfo.limits.depositBonusPercent}%
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    Макс. ${bonusInfo.limits.maxBonus}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    Вейджер x{bonusInfo.limits.wageringMultiplier}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                    {bonusInfo.limits.bonusExpiryDays} дней
                  </span>
                </div>
              </div>
            )}

            {/* ── Кнопки действия ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {selectedPromo && (
                <button
                  onClick={() => handleBonusChoice('promo')}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={18} />
                  Пополнить с промокодом {selectedPromo.code} (+{selectedPromo.percentage}%)
                </button>
              )}
              <button
                onClick={() => handleBonusChoice('none')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <CreditCard size={16} />
                Без бонуса
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                ⏳ Создание счёта...
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ОПЛАТА ЧЕРЕЗ CRYPTO BOT */}
        {step === 'PAYMENT' && invoice && invoice.method === 'cryptobot' && invoice.payUrl && (
          <div className="payment-section" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Заголовок */}
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💎</div>
              <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 8px' }}>
                Оплата через Crypto Bot
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Нажмите кнопку ниже для оплаты через @CryptoBot
              </p>
            </div>

            {/* Информация о платеже */}
            <div style={{
              background: '#1f2937',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Сумма</span>
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
                  {invoice.amount} {invoice.currency}
                </span>
              </div>
              {invoice.amountUSD && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>В USD</span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>
                    ≈ ${invoice.amountUSD.toFixed(2)}
                  </span>
                </div>
              )}
              {invoice.withBonus && (
                <div style={{
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Gift size={14} style={{ color: '#a855f7' }} />
                  <span style={{ color: '#a855f7', fontSize: '12px', fontWeight: '600' }}>
                    Бонус +{invoice.promoPercentage || '100'}% будет начислен после оплаты
                    {invoice.promoCode && ` (${invoice.promoCode})`}
                  </span>
                </div>
              )}
              {invoice.expiresAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>Действителен до</span>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {new Date(invoice.expiresAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Кнопка оплаты */}
            <button
              onClick={() => {
                if (invoice.payUrl) {
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openTelegramLink) {
                    tg.openTelegramLink(invoice.payUrl);
                  } else {
                    window.open(invoice.payUrl, '_blank');
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
              }}
            >
              <Wallet size={20} />
              Оплатить через @CryptoBot
              <ExternalLink size={16} />
            </button>

            {/* Подсказка */}
            <div style={{
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(139, 92, 246, 0.08)',
              borderRadius: '8px',
            }}>
              <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 4px', lineHeight: 1.4 }}>
                После оплаты баланс зачислится автоматически.
              </p>
              <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>
                Обычно зачисление происходит мгновенно ⚡
              </p>
            </div>

            {/* Ожидание оплаты */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #8b5cf6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                Ожидаем подтверждение оплаты...
              </span>
            </div>
          </div>
        )}

        {/* STEP 3: ОПЛАТА ЧЕРЕЗ TELEGRAM WALLET */}
        {step === 'PAYMENT' && invoice && invoice.method === 'wallet' && invoice.payUrl && (
          <div className="payment-section" style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Заголовок */}
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>💎</div>
              <h2 style={{ fontSize: '20px', color: '#fff', margin: '0 0 8px' }}>
                Оплата через Telegram Wallet
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                Нажмите кнопку ниже для оплаты через @wallet
              </p>
            </div>

            {/* Информация о платеже */}
            <div style={{
              background: '#1f2937',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Сумма</span>
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: '700' }}>
                  {invoice.amount} {invoice.currency}
                </span>
              </div>
              {invoice.amountUSD && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>В USD</span>
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>
                    ≈ ${invoice.amountUSD.toFixed(2)}
                  </span>
                </div>
              )}
              {invoice.withBonus && (
                <div style={{
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Gift size={14} style={{ color: '#a855f7' }} />
                  <span style={{ color: '#a855f7', fontSize: '12px', fontWeight: '600' }}>
                    Бонус +{invoice.promoPercentage || '100'}% будет начислен после оплаты
                    {invoice.promoCode && ` (${invoice.promoCode})`}
                  </span>
                </div>
              )}
              {invoice.expiresAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>Действителен до</span>
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {new Date(invoice.expiresAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Кнопка оплаты */}
            <button
              onClick={() => {
                if (invoice.payUrl) {
                  // Для Telegram Mini App используем openTelegramLink, иначе window.open
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openTelegramLink) {
                    tg.openTelegramLink(invoice.payUrl);
                  } else {
                    window.open(invoice.payUrl, '_blank');
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s ease',
              }}
            >
              <Wallet size={20} />
              Оплатить через @wallet
              <ExternalLink size={16} />
            </button>

            {/* Прямая ссылка (fallback) */}
            {invoice.directPayLink && (
              <button
                onClick={() => window.open(invoice.directPayLink!, '_blank')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '12px',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <ExternalLink size={14} />
                Открыть через браузер
              </button>
            )}

            {/* Подсказка */}
            <div style={{
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(59, 130, 246, 0.08)',
              borderRadius: '8px',
            }}>
              <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 4px', lineHeight: 1.4 }}>
                После оплаты баланс зачислится автоматически.
              </p>
              <p style={{ color: '#6b7280', fontSize: '11px', margin: 0 }}>
                Обычно зачисление происходит мгновенно ⚡
              </p>
            </div>

            {/* Ожидание оплаты */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #3b82f6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                Ожидаем подтверждение оплаты...
              </span>
            </div>
          </div>
        )}

        {/* STEP 3: ОПЛАТА - ВСТРОЕННАЯ СТРАНИЦА CRYPTOCLOUD (on-chain) */}
        {step === 'PAYMENT' && invoice && invoice.method === 'onchain' && invoice.payUrl && (
          <div className="payment-section" style={{
            width: '100%',
            height: 'calc(100vh - 140px)',
            minHeight: '700px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Заголовок */}
            <div style={{
              textAlign: 'center',
              marginBottom: '12px',
              padding: '12px 16px',
              background: 'var(--background, #0f1d3a)',
              borderRadius: '12px',
              flexShrink: 0,
            }}>
              <h2 style={{ fontSize: '18px', color: 'var(--text, #fafafa)', marginBottom: '6px' }}>
                💳 Оплата через CryptoCloud
              </h2>
              {invoice.withBonus && (
                <div style={{
                  marginTop: '6px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                }}>
                  🎁 Бонус +{invoice.promoPercentage || '100'}% будет начислен после оплаты
                  {invoice.promoCode && ` (${invoice.promoCode})`}
                </div>
              )}
            </div>

            {/* Встроенный iframe с страницей CryptoCloud */}
            <div style={{
              flex: 1,
              width: '100%',
              minHeight: '600px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#fff',
              border: '1px solid var(--border, #3b82f640)',
              position: 'relative',
            }}>
              {!iframeError ? (
                <iframe
                  src={invoice.payUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                  title="CryptoCloud Payment"
                  allow="payment; fullscreen; camera; microphone"
                  allowFullScreen
                  frameBorder="0"
                  scrolling="yes"
                  loading="eager"
                  onError={() => {
                    setIframeError(true);
                  }}
                  onLoad={() => {
                    setIframeError(false);
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  textAlign: 'center',
                }}>
                  <p style={{ color: 'var(--text, #fafafa)', marginBottom: '20px' }}>
                    Не удалось загрузить страницу оплаты
                  </p>
                  <button
                    onClick={() => {
                      if (invoice.payUrl) {
                        window.open(invoice.payUrl, '_blank');
                      }
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Открыть в новой вкладке
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Если нет payUrl, показываем старую страницу */}
        {step === 'PAYMENT' && invoice && !invoice.payUrl && (
          <div className="payment-section" style={{
            padding: '24px',
            background: 'var(--background, #0f1d3a)',
            borderRadius: '16px',
            border: '1px solid var(--border, #3b82f640)',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '24px', color: 'var(--text, #fafafa)', marginBottom: '16px' }}>
              Счет создан ✅
            </h2>
            <p style={{ color: 'var(--muted, #a0aac0)', marginBottom: '24px' }}>
              Ссылка на оплату не получена. Обратитесь в поддержку.
            </p>
            <button
              onClick={onBack}
              style={{
                padding: '12px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Назад
            </button>
          </div>
        )}

        {/* STEP 4: ОЖИДАНИЕ ПЛАТЕЖА - УДАЛЕНО, используем только iframe CryptoCloud */}
        {false && step === 'PENDING' && invoice && (
          <div className="pending-section" style={{
            padding: '24px',
          }}>
            {/* Заголовок */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 16px',
                border: '3px solid #10b981',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <h2 style={{ fontSize: '20px', color: 'var(--text, #fafafa)', marginBottom: '8px' }}>
                Ожидание оплаты
              </h2>
            </div>

            {/* Сумма к оплате */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <p style={{ color: 'var(--muted, #a0aac0)', fontSize: '12px', marginBottom: '8px' }}>
                💰 Отправьте точно (с учётом комиссии сети):
              </p>
              <p style={{ 
                fontSize: '28px', 
                fontWeight: '700', 
                color: '#10b981',
                margin: '0 0 4px 0',
              }}>
                {/* Показываем точную сумму от CryptoCloud или введённую пользователем */}
                {invoice.amountToPay || invoice.invoiceInfo?.amountCrypto || invoice.amount} {invoice.paymentCurrency || invoice.invoiceInfo?.currency || invoice.currency}
              </p>
              {invoice.amountUSD && (
                <p style={{ color: 'var(--muted, #a0aac0)', fontSize: '14px', margin: '8px 0 0 0' }}>
                  ≈ ${invoice.amountUSD.toFixed(2)} USD
                </p>
              )}
              {(invoice.invoiceInfo?.network || invoice.network) && (
                <p style={{ color: 'var(--muted, #a0aac0)', fontSize: '12px', marginTop: '4px' }}>
                  Сеть: <strong>{invoice.invoiceInfo?.network || invoice.network}</strong>
                </p>
              )}
              {/* Предупреждение о комиссии */}
              {(invoice.amountToPay || invoice.invoiceInfo?.amountCrypto) && (
                <p style={{ 
                  color: '#f59e0b', 
                  fontSize: '11px', 
                  marginTop: '12px',
                  padding: '8px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  borderRadius: '8px',
                }}>
                  ⚠️ Сумма включает комиссию сети. Отправьте ровно указанную сумму!
                </p>
              )}
            </div>

            {/* Адрес для оплаты (статический кошелёк - БОЕВОЙ РЕЖИМ) */}
            {invoice.address && invoice.staticWallet && (
              <>
                <div style={{
                  background: 'var(--card-bg, #1f2937)',
                  border: '1px solid var(--border, #374151)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <p style={{ color: 'var(--muted, #a0aac0)', fontSize: '12px', marginBottom: '8px' }}>
                    📍 Адрес для оплаты ({invoice.currency}):
                  </p>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <code style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.4)',
                      padding: '14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      wordBreak: 'break-all',
                      color: '#10b981',
                      fontFamily: 'monospace',
                      lineHeight: '1.4',
                    }}>
                      {invoice.address}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(invoice.address || '');
                        alert('Адрес скопирован!');
                      }}
                      style={{
                        padding: '14px 16px',
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      📋 Копировать
                    </button>
                  </div>
                </div>

                {/* Предупреждение для статического кошелька */}
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                }}>
                  <p style={{ color: '#ef4444', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                    ⚠️ <strong>ВАЖНО:</strong><br/>
                    • Отправляйте <strong>ТОЛЬКО {invoice.currency}</strong> на этот адрес!<br/>
                    • Сеть: <strong>{invoice.network}</strong><br/>
                    • Другие валюты будут <strong>ПОТЕРЯНЫ</strong>!<br/>
                    • Минимум 1 подтверждение сети
                  </p>
                </div>
              </>
            )}

            {/* Кнопка оплаты (ТЕСТОВЫЙ РЕЖИМ или обычный инвойс) */}
            {invoice.payUrl && (
              <>
                {invoice.testMode && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    textAlign: 'center',
                  }}>
                    <p style={{ color: '#f59e0b', fontSize: '12px', margin: 0 }}>
                      🧪 Тестовый режим: оплата через страницу CryptoCloud
                    </p>
                  </div>
                )}
                
                <button
                  onClick={() => invoice.payUrl && window.open(invoice.payUrl, '_blank')}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <ExternalLink size={18} />
                  Перейти к оплате
                </button>
              </>
            )}

            {/* Статус */}
            <p style={{ 
              color: 'var(--muted, #a0aac0)', 
              fontSize: '12px',
              textAlign: 'center',
            }}>
              После оплаты баланс обновится автоматически (1-30 мин)
            </p>
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
                  🎁 Бонус +{invoice.promoPercentage || bonusInfo?.limits.depositBonusPercent || 100}% начислен!
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {invoice.promoCode
                    ? `Промокод ${invoice.promoCode} применён`
                    : `Отыграйте ${bonusInfo?.limits.wageringMultiplier || 10}x для вывода`}
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
