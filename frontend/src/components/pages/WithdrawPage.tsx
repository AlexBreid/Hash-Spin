import { useState, useEffect, useRef } from 'react';
import { useFetch } from "../../hooks/useDynamicApi";
import { ArrowLeft, Send, AlertCircle, Loader2, Check, Star, Wallet, ArrowRight, ChevronDown, Coins } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { CryptoIcon } from '../ui/CryptoIcon';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface BalanceData {
  tokenId: number;
  symbol: string;
  amount: number;
  type: string;
}

interface CryptoToken {
  id: number;
  symbol: string;
  name: string;
  network: string;
  decimals: number;
}

interface TokenWithNetworks {
  symbol: string;
  name: string;
  totalBalance: number;
  networks: {
    tokenId: number;
    network: string;
    balance: number;
  }[];
}

type WithdrawStep = 'METHOD' | 'SELECT_CRYPTO' | 'SELECT_NETWORK' | 'FORM' | 'CONFIRM' | 'SUCCESS' | 'ERROR';
type WithdrawMethod = 'crypto' | 'stars';

interface WithdrawPageProps {
  onBack?: () => void;
}

export function WithdrawPage({ onBack }: WithdrawPageProps = {}) {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [step, setStep] = useState<WithdrawStep>('METHOD');
  const [method, setMethod] = useState<WithdrawMethod>('crypto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  
  const [formData, setFormData] = useState({
    amount: '',
    walletAddress: '',
    starsAmount: '',
  });
  
  // ID созданной заявки
  const [withdrawalId, setWithdrawalId] = useState<number | null>(null);

  const [selectedBalance, setSelectedBalance] = useState<BalanceData | null>(null);
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [availableTokens, setAvailableTokens] = useState<CryptoToken[]>([]);
  const [starsLimits, setStarsLimits] = useState<any>(null);
  const hasLoadedRef = useRef(false);
  
  // Новые state для выбора крипты и сети
  const [tokensWithNetworks, setTokensWithNetworks] = useState<TokenWithNetworks[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<TokenWithNetworks | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<{ tokenId: number; network: string; balance: number } | null>(null);

  const { data: balanceData, execute: fetchBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  // Загружаем данные
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchBalance().catch(() => {});
      loadAvailableTokens();
      loadStarsLimits();
      loadWithdrawOptions();
    }
  }, []);

  const getAuthToken = () => {
    return localStorage.getItem('casino_jwt_token')
      || localStorage.getItem('authToken')
      || localStorage.getItem('token');
  };

  const loadAvailableTokens = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/v1/wallet/tokens`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAvailableTokens(data.data);
        }
      }
    } catch {}
  };
  
  // Загрузка опций вывода с балансами по сетям
  const loadWithdrawOptions = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/v1/wallet/withdraw-options`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setTokensWithNetworks(data.data);
        }
      }
    } catch {}
  };

  const loadStarsLimits = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/v1/wallet/withdraw/stars/limits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStarsLimits(data.data);
        }
      }
    } catch {}
  };

  // Обновляем балансы и группируем по валютам
  useEffect(() => {
    if (balanceData && balanceData.success && Array.isArray(balanceData.data)) {
      setBalances(balanceData.data);
      
      // Ищем XTR (Stars) баланс
      const xtrBalance = balanceData.data.find((b: BalanceData) => b.type === 'MAIN' && b.symbol === 'XTR');
      if (xtrBalance) {
        setStarsBalance(xtrBalance.amount);
      }
    }
  }, [balanceData]);
  

  const handleBack = () => {
    if (step === 'METHOD') {
      if (onBack) onBack();
      else navigate('/account');
    } else if (step === 'SELECT_CRYPTO') {
      setStep('METHOD');
      setError('');
    } else if (step === 'SELECT_NETWORK') {
      setStep('SELECT_CRYPTO');
      setSelectedCrypto(null);
      setError('');
    } else if (step === 'FORM') {
      if (method === 'crypto') {
        setStep('SELECT_NETWORK');
        setSelectedNetwork(null);
      } else {
        setStep('METHOD');
      }
      setError('');
    } else if (step === 'CONFIRM') {
      setStep('FORM');
      setError('');
    } else {
      setStep('FORM');
      setError('');
    }
  };

  // ===== CRYPTO WITHDRAWAL =====
  const handleCryptoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount <= 0) {
      setError('❌ Введите корректную сумму');
      return;
    }

    if (!selectedNetwork || amount > selectedNetwork.balance) {
      setError(`❌ Недостаточно средств. Доступно: ${selectedNetwork?.balance.toFixed(2) || '0'} ${selectedCrypto?.symbol}`);
      return;
    }

    if (amount < 10) {
      setError(`❌ Минимальная сумма вывода: 10 ${selectedCrypto?.symbol}`);
      return;
    }

    if (!formData.walletAddress || formData.walletAddress.trim().length < 10) {
      setError('❌ Введите корректный адрес кошелька');
      return;
    }

    setStep('CONFIRM');
  };

  const handleCryptoConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token || !selectedNetwork) {
        throw new Error('🔑 Ошибка авторизации');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tokenId: selectedNetwork.tokenId,
          amount: parseFloat(formData.amount),
          walletAddress: formData.walletAddress,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка при выводе средств');
      }

      setWithdrawalId(data.data?.withdrawalId || null);
      toast.success('✅ Заявка на вывод создана!');
      setStep('SUCCESS');
      fetchBalance().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // ===== STARS WITHDRAWAL =====
  const handleStarsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseInt(formData.starsAmount);
    const minAmount = starsLimits?.minWithdrawal || 100;

    if (isNaN(amount) || amount <= 0) {
      setError('❌ Введите корректное количество Stars');
      return;
    }

    if (amount > starsBalance) {
      setError(`❌ Недостаточно Stars. Доступно: ${starsBalance}`);
      return;
    }

    if (amount < minAmount) {
      setError(`❌ Минимальная сумма вывода: ${minAmount} Stars`);
      return;
    }

    setStep('CONFIRM');
  };

  const handleStarsConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('🔑 Ошибка авторизации');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/wallet/withdraw/stars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          starsAmount: parseInt(formData.starsAmount),
          method: 'convert',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка при выводе Stars');
      }

      setWithdrawalId(data.data?.withdrawalId || null);
      toast.success('✅ Заявка на вывод создана!');
      setStep('SUCCESS');
      fetchBalance().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Рассчёт комиссии Stars
  const starsAmount = parseInt(formData.starsAmount) || 0;
  const starsUsdAmount = starsAmount * (starsLimits?.rate || 0.02);
  const starsFee = starsUsdAmount * ((starsLimits?.feePercent || 10) / 100);
  const starsNetAmount = starsUsdAmount - starsFee;

  return (
    <div className="p-6 bg-background text-foreground min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={handleBack} className="p-2 hover:bg-muted rounded-lg transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Вывести средства</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            
            {/* STEP 0: ВЫБОР МЕТОДА */}
            {step === 'METHOD' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-center mb-4">Выберите метод вывода</h2>
                
                {/* Crypto */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setMethod('crypto'); setStep('SELECT_CRYPTO'); }}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-primary transition-all flex items-center gap-4"
                >
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <Wallet className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Криптовалюта</p>
                    <p className="text-sm text-muted-foreground">USDT, BTC, ETH на внешний кошелёк</p>
                  </div>
                  <ArrowRight className="text-muted-foreground" />
                </motion.button>
                
                {/* Stars */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setMethod('stars'); setStep('FORM'); }}
                  className="w-full p-4 rounded-xl border-2 border-border hover:border-yellow-500 transition-all flex items-center gap-4"
                >
                  <div className="p-3 rounded-full bg-yellow-500/20">
                    <Star className="w-6 h-6 text-yellow-500" fill="#eab308" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Telegram Stars</p>
                    <p className="text-sm text-muted-foreground">
                      Баланс: {starsBalance} ⭐ (≈${(starsBalance * 0.02).toFixed(2)})
                    </p>
                  </div>
                  <ArrowRight className="text-muted-foreground" />
                </motion.button>

                <Button variant="outline" onClick={handleBack} className="w-full mt-4">
                  ← Назад
                </Button>
              </motion.div>
            )}
            
            {/* STEP: ВЫБОР КРИПТОВАЛЮТЫ */}
            {step === 'SELECT_CRYPTO' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-center mb-4">Выберите валюту для вывода</h2>
                
                {tokensWithNetworks.length === 0 ? (
                  <div className="text-center py-8">
                    <Coins className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">У вас нет средств для вывода</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {tokensWithNetworks.map((token) => (
                      <motion.button
                        key={token.symbol}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setSelectedCrypto(token);
                          // Если только одна сеть - сразу выбираем её
                          if (token.networks.length === 1) {
                            setSelectedNetwork(token.networks[0]);
                            setStep('FORM');
                          } else {
                            setStep('SELECT_NETWORK');
                          }
                        }}
                        className="w-full p-4 rounded-xl border-2 border-border hover:border-primary transition-all flex items-center gap-4"
                      >
                        <CryptoIcon symbol={token.symbol} size={40} />
                        <div className="flex-1 text-left">
                          <p className="font-semibold">{token.symbol}</p>
                          <p className="text-sm text-muted-foreground">{token.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{token.totalBalance.toFixed(token.totalBalance < 1 ? 6 : 2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {token.networks.length} {token.networks.length === 1 ? 'сеть' : 'сетей'}
                          </p>
                        </div>
                        <ArrowRight size={18} className="text-muted-foreground" />
                      </motion.button>
                    ))}
                  </div>
                )}

                <Button variant="outline" onClick={handleBack} className="w-full mt-4">
                  ← Назад
                </Button>
              </motion.div>
            )}
            
            {/* STEP: ВЫБОР СЕТИ */}
            {step === 'SELECT_NETWORK' && selectedCrypto && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-lg font-semibold text-center mb-2">Выберите сеть</h2>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {selectedCrypto.symbol} доступен в {selectedCrypto.networks.length} сетях
                </p>
                
                <div className="space-y-2">
                  {selectedCrypto.networks.map((net) => (
                    <motion.button
                      key={net.tokenId}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setSelectedNetwork(net);
                        setStep('FORM');
                      }}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        net.balance > 0 
                          ? 'border-border hover:border-primary' 
                          : 'border-border/50 opacity-50 cursor-not-allowed'
                      }`}
                      disabled={net.balance <= 0}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">{net.network}</p>
                        <p className="text-xs text-muted-foreground">
                          {net.network.includes('TRC') && 'Tron Network'}
                          {net.network.includes('ERC') && 'Ethereum Network'}
                          {net.network.includes('BEP') && 'BNB Chain'}
                          {net.network.includes('SOL') && 'Solana Network'}
                          {net.network.includes('TON') && 'TON Network'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${net.balance > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {net.balance.toFixed(net.balance < 1 ? 6 : 2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{selectedCrypto.symbol}</p>
                      </div>
                      <ArrowRight size={18} className="text-muted-foreground" />
                    </motion.button>
                  ))}
                </div>

                <Button variant="outline" onClick={handleBack} className="w-full mt-4">
                  ← Назад
                </Button>
              </motion.div>
            )}

            {/* STEP 1: ФОРМА CRYPTO */}
            {step === 'FORM' && method === 'crypto' && selectedCrypto && selectedNetwork && (
              <form onSubmit={handleCryptoSubmit} className="space-y-4">
                {/* Выбранная валюта и сеть */}
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">💰 Вывод:</p>
                    <span className="text-xs bg-blue-500/20 px-2 py-1 rounded text-blue-400">
                      {selectedNetwork.network}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {selectedNetwork.balance.toFixed(selectedNetwork.balance < 1 ? 6 : 2)} {selectedCrypto.symbol}
                  </p>
                </div>

                {/* Сумма */}
                <div>
                  <label className="block text-sm font-medium mb-2">Сумма вывода</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.000001"
                      min="10"
                      max={selectedNetwork.balance}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="100.00"
                      className="w-full px-4 py-3 border rounded-lg bg-background focus:ring-2 focus:ring-primary pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, amount: selectedNetwork.balance.toString() })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-primary/20 text-primary rounded-md hover:bg-primary/30"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Минимум: 10 {selectedCrypto.symbol}</p>
                </div>

                {/* Адрес */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Адрес кошелька ({selectedNetwork.network})
                  </label>
                  <input
                    type="text"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    placeholder={
                      selectedNetwork.network.includes('TRC') ? 'T...' :
                      selectedNetwork.network.includes('ERC') ? '0x...' :
                      selectedNetwork.network.includes('BEP') ? '0x...' :
                      selectedNetwork.network.includes('SOL') ? 'So...' :
                      'Адрес кошелька...'
                    }
                    className="w-full px-4 py-3 border rounded-lg bg-background focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ Убедитесь, что адрес поддерживает сеть {selectedNetwork.network}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1">← Назад</Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">Далее →</Button>
                </div>
              </form>
            )}

            {/* STEP 1: ФОРМА STARS */}
            {step === 'FORM' && method === 'stars' && (
              <form onSubmit={handleStarsSubmit} className="space-y-4">
                {/* Баланс Stars */}
                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <p className="text-sm text-muted-foreground">⭐ Баланс Stars:</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {starsBalance} Stars
                  </p>
                  <p className="text-sm text-muted-foreground">≈ ${(starsBalance * 0.02).toFixed(2)}</p>
                </div>

                {/* Сумма Stars */}
                <div>
                  <label className="block text-sm font-medium mb-2">Количество Stars для вывода</label>
                  <input
                    type="number"
                    min={starsLimits?.minWithdrawal || 100}
                    max={starsBalance}
                    value={formData.starsAmount}
                    onChange={(e) => setFormData({ ...formData, starsAmount: e.target.value })}
                    placeholder="100"
                    className="w-full px-4 py-3 border rounded-lg bg-background focus:ring-2 focus:ring-yellow-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Минимум: {starsLimits?.minWithdrawal || 100} Stars
                  </p>
                </div>

                {/* Расчёт */}
                {starsAmount > 0 && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Сумма:</span>
                      <span>{starsAmount} ⭐ = ${starsUsdAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Комиссия ({starsLimits?.feePercent || 10}%):</span>
                      <span>-${starsFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>К получению:</span>
                      <span className="text-green-500">${starsNetAmount.toFixed(2)} USDT</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1">← Назад</Button>
                  <Button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-700">Далее →</Button>
                </div>
              </form>
            )}

            {/* STEP 2: ПОДТВЕРЖДЕНИЕ */}
            {step === 'CONFIRM' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Подтвердите вывод</h3>
                
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  {method === 'crypto' && selectedCrypto && selectedNetwork ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Валюта:</span>
                        <span className="font-semibold">{selectedCrypto.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Сеть:</span>
                        <span className="font-semibold">{selectedNetwork.network}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Сумма:</span>
                        <span className="font-semibold">{formData.amount} {selectedCrypto.symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Адрес:</span>
                        <span className="font-mono text-xs">{formData.walletAddress.slice(0, 8)}...{formData.walletAddress.slice(-6)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stars:</span>
                        <span className="font-semibold">{formData.starsAmount} ⭐</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">К получению:</span>
                        <span className="font-semibold text-green-500">${starsNetAmount.toFixed(2)} USDT</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep('FORM')} disabled={loading} className="flex-1">
                    ← Назад
                  </Button>
                  <Button
                    onClick={method === 'crypto' ? handleCryptoConfirm : handleStarsConfirm}
                    disabled={loading}
                    className={`flex-1 ${method === 'stars' ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    {loading ? 'Обработка...' : '✓ Подтвердить'}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: УСПЕХ */}
            {step === 'SUCCESS' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                <div className="flex justify-center">
                  <Check size={56} className="text-green-500" />
                </div>
                <h3 className="text-lg font-semibold">Заявка создана!</h3>
                <p className="text-muted-foreground text-sm">
                  {method === 'crypto' 
                    ? 'Ваш запрос на вывод принят. Средства будут отправлены в ближайшее время.'
                    : 'Stars будут конвертированы в USDT и отправлены.'}
                </p>
                
                {withdrawalId && (
                  <p className="text-xs text-muted-foreground">
                    ID заявки: #{withdrawalId}
                  </p>
                )}
                
                <Button onClick={() => navigate('/account')} className="w-full bg-green-600 hover:bg-green-700">
                  Вернуться в профиль
                </Button>
              </motion.div>
            )}

            {/* STEP 4: ОШИБКА */}
            {step === 'ERROR' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                <AlertCircle size={56} className="text-red-500 mx-auto" />
                <p className="text-red-500">{error}</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('FORM')} className="flex-1">← Назад</Button>
                  <Button onClick={() => navigate('/account')} className="flex-1">Закрыть</Button>
                </div>
              </motion.div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
