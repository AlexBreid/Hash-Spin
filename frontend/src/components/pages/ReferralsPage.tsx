import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, CheckCircle, AlertCircle, Loader, TrendingUp, Award, Zap, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface ReferralStats {
  myReferralCode: string;
  myRefeersCount: number;
  referredByCode?: string;
  referrerUsername?: string;
  bonusPercentage: number;
  referrerType?: string;
  commissionRate?: number;
  totalTurnover?: number;
  totalCommissionPaid?: number;
  pendingTurnover?: number;
}

export function ReferralsPage() {
  const { isAuthenticated } = useAuth();
  const [inputCode, setInputCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const hasLoadedRef = useRef(false);

  // 🔑 Загружаем статистику
  const { data: statsData, execute: loadStats } = useFetch(
    'REFERRAL_GET_referral_stats',
    'GET'
  );

  // 🔗 Привязываем реферальный код
  const { execute: linkReferrer } = useFetch(
    'REFERRAL_POST_referral_link-referrer',
    'POST'
  );

  // Загружаем данные ОДИН РАЗ при монтировании
  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadStatsData();
    }
  }, [isAuthenticated]);

  const loadStatsData = async () => {
    try {
      setLoading(true);
      const result = await loadStats();
      console.log('📊 Реферальная статистика:', result);
      setStats(result as ReferralStats);
      setError('');
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputCode.trim()) {
      toast.error('❌ Введите реферальный код');
      return;
    }

    if (stats?.referredByCode) {
      toast.error('❌ Вы уже использовали реферальный код');
      return;
    }

    try {
      setLinking(true);
      const result = await linkReferrer({ referralCode: inputCode.trim() });
      
      console.log('✅ Реферер привязан:', result);
      toast.success(`✅ Вы успешно привязались к рефереру!`);
      
      setInputCode('');
      await loadStatsData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Ошибка привязки:', errorMessage);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLinking(false);
    }
  };

  const copyCode = () => {
    if (stats?.myReferralCode) {
      navigator.clipboard.writeText(stats.myReferralCode);
      toast.success('✅ Код скопирован!');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="pb-24 pt-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">🎁 Реферальная программа</h1>
          <p className="text-muted-foreground">Приглашайте друзей и получайте награды!</p>
        </div>
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <p className="text-amber-700 dark:text-amber-500 font-semibold">⚠️ Пожалуйста, войдите в систему</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-muted-foreground">Загружение данных...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="pb-24 pt-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent mb-2">🎁 Реферальная программа</h1>
          <p className="text-muted-foreground">Приглашайте друзей и получайте награды!</p>
        </div>
        <Card className="p-5 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-500 font-semibold">❌ {error}</p>
          <Button
            onClick={loadStatsData}
            className="mt-4 bg-red-600 hover:bg-red-700"
            variant="default"
          >
            Попробовать снова
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-6 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-2 mb-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">🎁 Реферальная программа</h1>
        <p className="text-muted-foreground text-lg">Приглашайте друзей и зарабатывайте на их игре</p>
      </div>

      {/* Ваш реферальный код */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 bg-gradient-to-br from-indigo-500/20 via-violet-500/20 to-purple-500/20 border-2 border-indigo-400/50 dark:from-indigo-950/50 dark:via-violet-950/40 dark:to-purple-950/30 dark:border-indigo-800/50 shadow-lg shadow-indigo-500/10">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-indigo-600/20 rounded-lg">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-xl">Ваш реферальный код</h3>
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="flex-1 p-4 bg-white/40 dark:bg-black/30 rounded-xl border-2 border-indigo-300/50 dark:border-indigo-700/50">
              <p className="text-center font-mono text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {stats?.myReferralCode || 'N/A'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={copyCode}
              className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4 font-medium">
            📤 Поделитесь этим кодом с друзьями и получайте 30% от игровой комиссии их оборота!
          </p>
        </Card>
      </motion.div>

      {/* Статистика */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-4"
      >
        <Card className="p-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400/50 dark:from-emerald-950/40 dark:to-teal-950/20 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-600/20 rounded-lg">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Рефералов</span>
          </div>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.myRefeersCount || 0}</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-2 border-cyan-400/50 dark:from-cyan-950/40 dark:to-blue-950/20 dark:border-cyan-800/50 shadow-lg shadow-cyan-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-cyan-600/20 rounded-lg">
              <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Оборот</span>
          </div>
          <p className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">${(stats?.totalTurnover || 0).toFixed(0)}</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-lime-500/20 to-green-500/10 border-2 border-lime-400/50 dark:from-lime-950/40 dark:to-green-950/20 dark:border-lime-800/50 shadow-lg shadow-lime-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-lime-600/20 rounded-lg">
              <Award className="w-4 h-4 text-lime-700 dark:text-lime-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Выплачено</span>
          </div>
          <p className="text-3xl font-bold text-lime-700 dark:text-lime-300">${(stats?.totalCommissionPaid || 0).toFixed(2)}</p>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-orange-500/20 to-rose-500/10 border-2 border-orange-400/50 dark:from-orange-950/40 dark:to-rose-950/20 dark:border-orange-800/50 shadow-lg shadow-orange-500/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-600/20 rounded-lg">
              <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Комиссия</span>
          </div>
          <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">30%</p>
        </Card>
      </motion.div>

      {/* Что ты получаешь за рефералов */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 bg-gradient-to-br from-violet-500/15 to-purple-500/10 border-2 border-violet-400/50 dark:from-violet-950/40 dark:to-purple-950/20 dark:border-violet-800/50 shadow-lg shadow-violet-500/10">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-violet-600/20 rounded-lg">
              <Target className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-bold text-lg">💰 Что ты получаешь за рефералов?</h3>
          </div>
          <div className="space-y-3 pl-2">
            <div className="p-4 bg-white/50 dark:bg-black/30 rounded-lg border-l-4 border-violet-600 dark:border-violet-400">
              <p className="font-semibold text-violet-900 dark:text-violet-200">Вы получаете 30% от игровой комиссии оборота реферала</p>
              <p className="text-sm text-muted-foreground mt-2">📈 Пример: реферал потратил 100 USDT → казино получит комиссию → вы получите 30% от этой комиссии</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Что ты получаешь введя реферала */}
      {!stats?.referredByCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-amber-500/15 to-yellow-500/10 border-2 border-amber-400/50 dark:from-amber-950/40 dark:to-yellow-950/20 dark:border-amber-800/50 shadow-lg shadow-amber-500/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-amber-600/20 rounded-lg">
                <Gift className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-lg">🎁 Что ты получишь введя реферала?</h3>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-white/50 dark:bg-black/30 rounded-lg border-2 border-yellow-500 dark:border-yellow-600">
                <p className="font-semibold text-amber-900 dark:text-amber-200">💎 Приветственный бонус</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300 mt-2">+100% к твоему первому пополнению</p>
                <p className="text-xs text-muted-foreground mt-2">📈 Пример: Пополнил 10 USDT → получишь 10 USDT бонусом</p>
              </div>
              <div className="p-4 bg-white/50 dark:bg-black/30 rounded-lg border-l-4 border-amber-600 dark:border-amber-400">
                <p className="font-semibold text-amber-900 dark:text-amber-200">📊 Требования на вывод</p>
                <p className="text-xs text-muted-foreground mt-2">Отыграй бонус в 10x перед выводом</p>
                <p className="text-xs text-muted-foreground mt-1">Пример: 10 USDT бонуса → отыграй 100 USDT в играх</p>
              </div>
              <div className="p-4 bg-white/50 dark:bg-black/30 rounded-lg border-l-4 border-amber-600 dark:border-amber-400">
                <p className="font-semibold text-amber-900 dark:text-amber-200">⏰ Срок действия</p>
                <p className="text-xs text-muted-foreground mt-2">Бонус действует 7 дней с момента активации</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Раздел: Введите реферальный код */}
      {!stats?.referredByCode ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-rose-500/15 to-red-500/10 border-2 border-rose-400/50 dark:from-rose-950/40 dark:to-red-950/20 dark:border-rose-800/50 shadow-lg shadow-rose-500/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-rose-600/20 rounded-lg">
                <Gift className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="font-bold text-lg">Введите реферальный код</h3>
            </div>

            <form onSubmit={handleLinkReferrer} className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">
                Если вас пригласил друг, введите его реферальный код и получайте +100% к первому пополнению!
              </p>

              <Input
                type="text"
                placeholder="Введите код реферера..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="rounded-lg bg-white/50 dark:bg-black/30 border-rose-300/50 dark:border-rose-700/50 focus:border-rose-500"
                disabled={linking}
              />

              <Button
                type="submit"
                disabled={linking || !inputCode.trim()}
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-lg font-semibold shadow-lg"
              >
                {linking ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Привязка...
                  </>
                ) : (
                  '✓ Ввести код'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center font-medium">
                ⚠️ Внимание: код можно ввести только один раз!
              </p>
            </form>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500/20 to-green-500/10 border-2 border-emerald-400/50 dark:from-emerald-950/40 dark:to-green-950/20 dark:border-emerald-800/50 shadow-lg shadow-emerald-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-600/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-300">Вы привязаны к рефереру</h3>
            </div>

            <div className="p-4 bg-white/50 dark:bg-black/30 rounded-lg border-2 border-emerald-300/50 dark:border-emerald-700/50">
              <p className="text-sm text-muted-foreground mb-2">Реферер:</p>
              <p className="font-semibold text-lg text-emerald-700 dark:text-emerald-300">{stats?.referrerUsername}</p>
            </div>

            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-4 font-medium">
              ✅ Вы получите +100% бонус к первому пополнению!
            </p>
          </Card>
        </motion.div>
      )}

      {/* Как это работает */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-2 border-indigo-400/50 dark:from-indigo-950/30 dark:to-blue-950/20 dark:border-indigo-800/50 shadow-lg shadow-indigo-500/5">
          <h3 className="font-bold text-xl mb-6">📚 Как работает реферальная система</h3>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-indigo-500/30">
                1
              </div>
              <div>
                <p className="font-semibold text-lg">Поделись своим кодом</p>
                <p className="text-sm text-muted-foreground">Отправь реферальный код своему другу</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-purple-500/30">
                2
              </div>
              <div>
                <p className="font-semibold text-lg">Друг регистрируется</p>
                <p className="text-sm text-muted-foreground">Друг использует твой код при регистрации</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg shadow-emerald-500/30">
                3
              </div>
              <div>
                <p className="font-semibold text-lg">Получайте выплаты</p>
                <p className="text-sm text-muted-foreground">30% от игровой комиссии его оборота — автоматически!</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Полные условия */}
      <Card className="p-6 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 border-2 border-slate-300/50 dark:border-slate-700/50">
        <h3 className="font-bold text-xl mb-6">📋 Полные условия реферальной программы</h3>
        <div className="space-y-6 text-sm">
          <div>
            <p className="font-bold text-base mb-3 text-indigo-700 dark:text-indigo-300">✅ Для реферера (пригласивший):</p>
            <ul className="space-y-2 text-muted-foreground ml-6">
              <li>• Получай 30% от игровой комиссии оборота своих рефералов</li>
              <li>• Комиссия выплачивается автоматически при достижении минимума (100 USDT оборота)</li>
              <li>• Нет лимита на количество приглашенных людей</li>
              <li>• Реферальная ссылка уникальна и не изменяется</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-base mb-3 text-amber-700 dark:text-amber-300">🎁 Для реферала (приглашённый):</p>
            <ul className="space-y-2 text-muted-foreground ml-6">
              <li>• Получи +100% к первому пополнению в виде бонуса</li>
              <li>• Максимум 10,000 USDT бонуса за одно пополнение</li>
              <li>• Отыграй бонус в 10x перед выводом</li>
              <li>• Бонус автоматически переводится в основной баланс после выполнения условий</li>
              <li>• Действует 7 дней с момента активации</li>
              <li>• Код вводится один раз и не может быть изменен</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-base mb-3 text-slate-700 dark:text-slate-300">🔒 Общие правила:</p>
            <ul className="space-y-2 text-muted-foreground ml-6">
              <li>• Минимум 100 USDT оборота для выплаты комиссии</li>
              <li>• Минимум 1 USDT для вывода комиссии</li>
              <li>• Выплаты производятся на основной баланс</li>
              <li>• Система прозрачна и работает в реальном времени</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}