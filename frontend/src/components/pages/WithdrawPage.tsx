import { useState, useEffect, useRef } from 'react';
import { useFetch } from "../../hooks/useDynamicApi";
import { ArrowLeft, Send, AlertCircle, Loader2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface BalanceData {
  tokenId: number;
  symbol: string;
  amount: number;
  type: string;
}

type WithdrawStep = 'FORM' | 'CONFIRM' | 'SUCCESS' | 'ERROR';

interface WithdrawPageProps {
  onBack?: () => void;
}

export function WithdrawPage({ onBack }: WithdrawPageProps = {}) {
  const navigate = useNavigate();
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [step, setStep] = useState<WithdrawStep>('FORM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const [formData, setFormData] = useState({
    amount: '',
    walletAddress: '',
  });

  const [selectedBalance, setSelectedBalance] = useState<BalanceData | null>(null);
  const hasLoadedRef = useRef(false);

  const { data: balanceData, execute: fetchBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  // Загружаем баланс
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchBalance().catch(err => console.error('❌ Ошибка баланса:', err));
    }
  }, []);

  // Обновляем баланс
  useEffect(() => {
    if (balanceData && balanceData.success && Array.isArray(balanceData.data)) {
      setBalances(balanceData.data);
      // Выбираем USDT MAIN баланс по умолчанию
      const mainBalance = balanceData.data.find(b => b.type === 'MAIN' && b.symbol === 'USDT');
      if (mainBalance) {
        setSelectedBalance(mainBalance);
      }
    }
  }, [balanceData]);

  const handleBack = () => {
    if (step === 'FORM') {
      if (onBack) {
        onBack();
      } else {
        navigate('/account');
      }
    } else {
      setStep('FORM');
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(formData.amount);

    if (isNaN(amount) || amount <= 0) {
      setError('❌ Введите корректную сумму');
      return;
    }

    if (!selectedBalance || amount > selectedBalance.amount) {
      setError(`❌ Недостаточно средств. Доступно: ${selectedBalance?.amount.toFixed(2) || '0'} ${selectedBalance?.symbol}`);
      return;
    }

    if (amount < 10) {
      setError('❌ Минимальная сумма вывода: 10 USDT');
      return;
    }

    if (!formData.walletAddress || formData.walletAddress.trim().length < 10) {
      setError('❌ Введите корректный адрес кошелька (должен начинаться с "T")');
      return;
    }

    if (!formData.walletAddress.startsWith('T')) {
      setError('❌ Адрес TRON должен начинаться с "T"');
      return;
    }

    setStep('CONFIRM');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('casino_jwt_token')
        || localStorage.getItem('authToken')
        || localStorage.getItem('token');

      if (!token || !selectedBalance) {
        throw new Error('🔑 Ошибка авторизации');
      }

      const response = await fetch('http://localhost:4000/api/v1/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tokenId: selectedBalance.tokenId,
          amount: parseFloat(formData.amount),
          walletAddress: formData.walletAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка при выводе средств');
      }

      setStep('SUCCESS');
      // Перезагружаем баланс
      fetchBalance().catch(err => console.error('❌ Ошибка баланса:', err));
    } catch (err) {
      console.error('❌ Ошибка вывода:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      setStep('ERROR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-background text-foreground min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-800 rounded-lg transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Вывести средства</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-6">
            {/* STEP 1: ФОРМА */}
            {step === 'FORM' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Текущий баланс */}
                {selectedBalance && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400">💰 Текущий баланс:</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedBalance.amount.toFixed(2)} {selectedBalance.symbol}
                    </p>
                  </motion.div>
                )}

                {/* Сумма вывода */}
                <div>
                  <label className="block text-sm font-medium mb-2">Сумма вывода (USDT)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="10"
                    max={selectedBalance?.amount}
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="100.00"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-2">Минимум: 10 USDT</p>
                </div>

                {/* Адрес кошелька */}
                <div>
                  <label className="block text-sm font-medium mb-2">Адрес кошелька (TRON)</label>
                  <input
                    type="text"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    placeholder="T1234567890abcdefghijklmnopqrst"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-2">🔗 Адрес должен начинаться с 'T'</p>
                </div>

                {/* Предупреждение */}
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    ⚠️ Проверьте адрес перед отправкой. Неправильный адрес может привести к потере средств.
                  </p>
                </div>

                {/* Ошибка */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Кнопки */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    ← Назад
                  </Button>
                  <Button
                    type="submit"
                    disabled={!formData.amount || !formData.walletAddress}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Далее →
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 2: ПОДТВЕРЖДЕНИЕ */}
            {step === 'CONFIRM' && selectedBalance && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Сумма:</span>
                    <span className="font-semibold">{formData.amount} {selectedBalance.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Адрес:</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {formData.walletAddress}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Комиссия:</span>
                    <span className="font-semibold">0 USDT</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  ✅ Проверьте данные перед подтверждением
                </p>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('FORM')}
                    disabled={loading}
                    className="flex-1"
                  >
                    ← Назад
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" />
                        Отправляю...
                      </>
                    ) : (
                      '✓ Подтвердить'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: УСПЕХ */}
            {step === 'SUCCESS' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center">
                  <Check size={56} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Успешно!</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Ваш запрос на вывод принят. Обычно обработка занимает 1-3 дня.
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    💰 {formData.amount} {selectedBalance?.symbol} на адрес {formData.walletAddress}
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/account')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Вернуться в профиль
                </Button>
              </motion.div>
            )}

            {/* STEP 4: ОШИБКА */}
            {step === 'ERROR' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center">
                  <AlertCircle size={56} className="text-red-600" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('FORM')}
                    className="flex-1"
                  >
                    ← Назад
                  </Button>
                  <Button
                    onClick={() => navigate('/account')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Закрыть
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}