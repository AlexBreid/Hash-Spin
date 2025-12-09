import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, CheckCircle, AlertCircle, Loader, TrendingUp, Award, Zap, Target, Sparkles, ArrowUpRight, Crown, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface ReferralStats {
  myReferralCode: string;
  myReferralsCount?: number;
  myRefeersCount?: number;
  referredByCode?: string;
  referrerUsername?: string;
  bonusPercentage?: number;
  commissionRate?: number;
  referrerType?: string;
  totalTurnover?: number | string;
  totalCommissionPaid?: number | string;
  pendingTurnover?: number | string;
}

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  if (typeof value === 'object' && value.toString) {
    try {
      const str = value.toString();
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    } catch (e) {
      return 0;
    }
  }
  return 0;
}

export function ReferralsPage() {
  const { isAuthenticated } = useAuth();
  const [inputCode, setInputCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const hasLoadedRef = useRef(false);

  const { data: statsData, execute: loadStats } = useFetch(
    'REFERRAL_GET_referral_stats',
    'GET'
  );

  const { execute: linkReferrer } = useFetch(
    'REFERRAL_POST_referral_link-referrer',
    'POST'
  );

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
      
      if (result && result.data) {
        setStats(result.data as ReferralStats);
      } else if (result) {
        setStats(result as ReferralStats);
      }
      
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

  const totalTurnover = toNumber(stats?.totalTurnover);
  const totalCommissionPaid = toNumber(stats?.totalCommissionPaid);
  const pendingTurnover = toNumber(stats?.pendingTurnover);
  const commissionRate = stats?.commissionRate || 30;
  const referralsCount = stats?.myReferralsCount || stats?.myRefeersCount || 0;

  return (
    <div className="pb-24 pt-6 px-4 space-y-4">
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION - ГЛАВНАЯ КАРТОЧКА С КОДОМ */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Заголовок */}
        <div className="space-y-1 px-1">
          <div className="flex items-center gap-2">
            <Crown className="w-7 h-7 text-amber-500" />
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-500 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
              Реферальная Программа
            </h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Приглашай друзей и зарабатывай постоянно 🚀</p>
        </div>

        {/* ГЛАВНАЯ КАРТОЧКА - МОЙ КОД */}
        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-0 shadow-2xl">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-semibold">ВАШ РЕФЕРАЛЬНЫЙ КОД</p>
                  <p className="text-white/60 text-xs">Поделись и зарабатывай</p>
                </div>
              </div>
              <Sparkles className="w-6 h-6 text-white/40 animate-pulse" />
            </div>

            {/* КОД И КОПИРОВАНИЕ */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 mb-4 border border-white/20">
              <p className="text-center font-mono text-4xl font-black text-white tracking-wider drop-shadow-lg">
                {stats?.myReferralCode || 'ЗАГРУЗКА...'}
              </p>
            </div>

            <Button
              onClick={copyCode}
              className="w-full bg-white text-indigo-600 hover:bg-white/90 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Copy className="w-5 h-5" />
              <span>СКОПИРОВАТЬ КОД</span>
            </Button>

            <p className="text-white/70 text-xs mt-4 text-center font-medium">
              📤 Отправь этот код друзьям и получай {commissionRate}% от их игр навсегда!
            </p>
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* БОЛЬШИЕ ЦИФРЫ СТАТИСТИКИ */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        {/* Рефералов */}
        <Card className="p-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400/60 dark:from-emerald-950/40 dark:to-teal-950/20 dark:border-emerald-700/60">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-2">👥 Рефералов</p>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300">{referralsCount}</p>
            </div>
            <div className="p-3 bg-emerald-600/30 rounded-lg">
              <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        {/* Комиссия */}
        <Card className="p-5 bg-gradient-to-br from-orange-500/20 to-rose-500/10 border-2 border-orange-400/60 dark:from-orange-950/40 dark:to-rose-950/20 dark:border-orange-700/60">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">⚡ Комиссия</p>
              <p className="text-4xl font-black text-orange-700 dark:text-orange-300">{commissionRate}%</p>
            </div>
            <div className="p-3 bg-orange-600/30 rounded-lg">
              <Flame className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        {/* Оборот */}
        <Card className="p-5 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-2 border-cyan-400/60 dark:from-cyan-950/40 dark:to-blue-950/20 dark:border-cyan-700/60">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide mb-2">📊 Оборот</p>
              <p className="text-3xl font-black text-cyan-700 dark:text-cyan-300">${totalTurnover.toFixed(0)}</p>
            </div>
            <div className="p-3 bg-cyan-600/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </Card>

        {/* Выплачено */}
        <Card className="p-5 bg-gradient-to-br from-lime-500/20 to-green-500/10 border-2 border-lime-400/60 dark:from-lime-950/40 dark:to-green-950/20 dark:border-lime-700/60">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-lime-700 dark:text-lime-400 uppercase tracking-wide mb-2">💰 Выплачено</p>
              <p className="text-3xl font-black text-lime-700 dark:text-lime-300">${totalCommissionPaid.toFixed(0)}</p>
            </div>
            <div className="p-3 bg-lime-600/30 rounded-lg">
              <Award className="w-6 h-6 text-lime-600 dark:text-lime-400" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* УСЛОВИЯ БОНУСА - ОТДЕЛЬНАЯ КАРТОЧКА */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {!stats?.referredByCode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-yellow-500/15 to-amber-500/10 border-2 border-yellow-400/60 dark:from-yellow-950/40 dark:to-amber-950/20 dark:border-yellow-700/60">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-600/20 rounded-xl">
                <Gift className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg text-yellow-900 dark:text-yellow-200 mb-3">
                  🎁 Что получит друг при регистрации?
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">+</div>
                    <div>
                      <p className="font-bold text-yellow-900 dark:text-yellow-200">100% Бонус к первому депозиту</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">Пример: пополнил 100$ → получит 100$ бонуса</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-yellow-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">+</div>
                    <div>
                      <p className="font-bold text-yellow-900 dark:text-yellow-200">Максимум 10,000$ бонуса</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">Лимит за одно пополнение не превышает 10,000$</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* УСЛОВИЯ ОТЫГРЫША - ОТДЕЛЬНАЯ КАРТОЧКА */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {!stats?.referredByCode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500/15 to-indigo-500/10 border-2 border-purple-400/60 dark:from-purple-950/40 dark:to-indigo-950/20 dark:border-purple-700/60">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-600/20 rounded-xl">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-lg text-purple-900 dark:text-purple-200 mb-3">
                  🎯 Условия отыгрыша бонуса
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                    <div>
                      <p className="font-bold text-purple-900 dark:text-purple-200">Отыграй бонус в 10x</p>
                      <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">Пример: получил 100$ бонуса → нужно поставить 1,000$ в играх</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                    <div>
                      <p className="font-bold text-purple-900 dark:text-purple-200">Бонус автоматически переходит в MAIN</p>
                      <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">После выполнения условий деньги доступны для вывода</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                    <div>
                      <p className="font-bold text-purple-900 dark:text-purple-200">Срок действия: 7 дней</p>
                      <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">Бонус сгорает, если не выполнить условия за неделю</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* КАК ЗАРАБАТЫВАЕШЬ ТЫ */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 bg-gradient-to-br from-emerald-500/15 to-green-500/10 border-2 border-emerald-400/60 dark:from-emerald-950/40 dark:to-green-950/20 dark:border-emerald-700/60">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-emerald-900 dark:text-emerald-200 mb-3">
                💸 Как зарабатываешь ты?
              </h3>
              <div className="space-y-3">
                <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 border-l-4 border-emerald-600 dark:border-emerald-400">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-2">
                    ✅ {commissionRate}% от оборота каждого реферала
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Если друг потратил 1,000$ в играх → казино получит комиссию → ты получишь {commissionRate}% от этой комиссии
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 border-l-4 border-emerald-600 dark:border-emerald-400">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-2">
                    🔄 Выплата автоматическая
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Деньги начисляются сразу на твой основной баланс. Минимальный оборот для выплаты: 100$ USDT
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 border-l-4 border-emerald-600 dark:border-emerald-400">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 mb-2">
                    ♾️ Без ограничений на количество
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Приглашай сколько угодно рефералов — каждый будет приносить {commissionRate}% комиссии
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ПРОЦЕСС - КАК ЭТО РАБОТАЕТ */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="p-6 bg-gradient-to-br from-indigo-500/15 to-blue-500/10 border-2 border-indigo-400/60 dark:from-indigo-950/40 dark:to-blue-950/20 dark:border-indigo-700/60">
          <h3 className="font-black text-lg text-indigo-900 dark:text-indigo-200 mb-6">
            📚 Как это работает? (3 простых шага)
          </h3>
          <div className="space-y-4">
            {/* Шаг 1 */}
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg">
                1️⃣
              </div>
              <div>
                <p className="font-bold text-indigo-900 dark:text-indigo-200 text-base mb-1">
                  Скопируй свой реферальный код
                </p>
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  Код виден в центре страницы — нажми "СКОПИРОВАТЬ" и отправь другу
                </p>
              </div>
            </div>

            {/* Стрелка */}
            <div className="flex justify-center">
              <ArrowUpRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400 rotate-90" />
            </div>

            {/* Шаг 2 */}
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg">
                2️⃣
              </div>
              <div>
                <p className="font-bold text-indigo-900 dark:text-indigo-200 text-base mb-1">
                  Друг вводит код при регистрации
                </p>
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  Он получит +100% бонус к первому депозиту. Например: пополнил 500$ → получит 500$ бонуса
                </p>
              </div>
            </div>

            {/* Стрелка */}
            <div className="flex justify-center">
              <ArrowUpRight className="w-6 h-6 text-indigo-600 dark:text-indigo-400 rotate-90" />
            </div>

            {/* Шаг 3 */}
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg">
                3️⃣
              </div>
              <div>
                <p className="font-bold text-indigo-900 dark:text-indigo-200 text-base mb-1">
                  Получай {commissionRate}% на каждый его оборот
                </p>
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  Друг играет, проигрывает — ты зарабатываешь. Выплаты автоматические, без лимитов!
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ВВОД РЕФЕРАЛЬНОГО КОДА (если не введен) */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {!stats?.referredByCode ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-rose-500/15 to-red-500/10 border-2 border-rose-400/60 dark:from-rose-950/40 dark:to-red-950/20 dark:border-rose-700/60">
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-rose-600/20 rounded-xl">
                <Gift className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-lg text-rose-900 dark:text-rose-200">
                  Было ли вас кто-то пригласил? 🎁
                </h3>
                <p className="text-sm text-rose-800 dark:text-rose-300 mt-1">
                  Если вас пригласил друг — введите его код и получайте +100% к первому депозиту!
                </p>
              </div>
            </div>

            <form onSubmit={handleLinkReferrer} className="space-y-3">
              <Input
                type="text"
                placeholder="Введите реферальный код (например: ABC123)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="rounded-xl bg-white/50 dark:bg-black/30 border-rose-300/50 dark:border-rose-700/50 focus:border-rose-500 text-base py-3"
                disabled={linking}
              />

              <Button
                type="submit"
                disabled={linking || !inputCode.trim()}
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl font-bold py-3 shadow-lg transition-all"
              >
                {linking ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Привязка...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Ввести код и получить бонус!
                  </>
                )}
              </Button>

              <p className="text-xs text-rose-700 dark:text-rose-300 text-center font-semibold">
                ⚠️ Внимание: код можно ввести только один раз! Выбирай внимательно 🎯
              </p>
            </form>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500/20 to-green-500/10 border-2 border-emerald-400/60 dark:from-emerald-950/40 dark:to-green-950/20 dark:border-emerald-700/60">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-600/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-lg text-emerald-700 dark:text-emerald-300 mb-2">
                  ✅ Вы привязаны к рефереру!
                </h3>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 mb-3">
                  Реферер: <span className="font-bold">{stats?.referrerUsername}</span>
                </p>
                <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3 border-l-4 border-emerald-600 dark:border-emerald-400">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                    🎁 При первом депозите вы получите +100% бонуса!
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ПОЛНЫЕ УСЛОВИЯ - ОТДЕЛЬНАЯ КАРТОЧКА */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Card className="p-6 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 border-2 border-slate-300/50 dark:border-slate-700/50">
          <h3 className="font-black text-lg mb-5 text-slate-900 dark:text-slate-100">
            📋 Полные условия программы
          </h3>
          
          <div className="space-y-5">
            {/* Для Реферера */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">✓</div>
                <p className="font-bold text-base text-slate-900 dark:text-slate-100">Для вас (реферер)</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 ml-8">
                <li>• Получайте {commissionRate}% от игровой комиссии каждого реферала</li>
                <li>• Комиссия выплачивается автоматически на основной баланс</li>
                <li>• Нет лимита на количество приглашённых людей</li>
                <li>• Минимальный оборот реферала для выплаты: 100 USDT</li>
                <li>• Минимальная выплата: 1 USDT</li>
              </ul>
            </div>

            {/* Для Реферала */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">🎁</div>
                <p className="font-bold text-base text-slate-900 dark:text-slate-100">Для друга (реферал)</p>
              </div>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 ml-8">
                <li>• +100% бонус к первому депозиту</li>
                <li>• Максимум 10,000 USDT бонуса за одно пополнение</li>
                <li>• Отыграй бонус в 10x перед выводом (пример: 100$ бонуса = 1,000$ игр)</li>
                <li>• Бонус автоматически переводится в основной баланс после выполнения</li>
                <li>• Срок действия бонуса: 7 дней с момента активации</li>
                <li>• Код вводится один раз и не может быть изменён</li>
              </ul>
            </div>

            {/* Прозрачность */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">🔒</div>
                <p className="font-bold text-base text-slate-900 dark:text-slate-100">Как это считается?</p>
              </div>
              <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 border-l-4 border-green-600 dark:border-green-400 ml-8">
                <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <span className="font-bold">Комиссия = (Оборот × 3% [дом. преимущество]) × {commissionRate}%</span>
                  <br />
                  <br />
                  Пример: Реферал потратил 1,000$
                  <br />
                  → Казино получает доход: 1,000$ × 3% = 30$
                  <br />
                  → Вы получаете: 30$ × {commissionRate}% = {(30 * commissionRate / 100).toFixed(2)}$
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ════════════════════════════════════════════════════════════════════════════ */}
      {/* ПРИМЕРЫ ЗАРАБОТКОВ - КРАСИВАЯ ТАБЛИЦА */}
      {/* ════════════════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 bg-gradient-to-br from-violet-500/15 to-purple-500/10 border-2 border-violet-400/60 dark:from-violet-950/40 dark:to-purple-950/20 dark:border-violet-700/60">
          <h3 className="font-black text-lg mb-4 text-violet-900 dark:text-violet-200">
            📈 Примеры заработков
          </h3>
          
          <div className="space-y-3">
            {[
              { referrals: 5, turnover: 5000, commission: 45 },
              { referrals: 10, turnover: 15000, commission: 135 },
              { referrals: 20, turnover: 50000, commission: 450 },
              { referrals: 50, turnover: 200000, commission: 1800 }
            ].map((example, idx) => (
              <div key={idx} className="bg-white/50 dark:bg-black/20 rounded-xl p-4 border-l-4 border-violet-600 dark:border-violet-400">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-violet-900 dark:text-violet-200">
                    {example.referrals} рефералов × {example.turnover.toLocaleString()}$ оборота
                  </p>
                  <p className="font-black text-xl text-violet-700 dark:text-violet-300">
                    = ${example.commission.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-violet-800 dark:text-violet-300">
                  Средний оборот на реферала: ${(example.turnover / example.referrals).toFixed(0)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-violet-800 dark:text-violet-300 mt-4 text-center font-semibold italic">
            Это примеры при среднем обороте 1,000$ на реферала
          </p>
        </Card>
      </motion.div>

      {/* Spacer */}
      <div className="h-2" />
    </div>
  );
}