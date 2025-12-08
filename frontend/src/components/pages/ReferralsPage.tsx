import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, CheckCircle, AlertCircle, Loader, TrendingUp, Award, Zap, Target, Share2 } from 'lucide-react';
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
          <h1 className="text-3xl font-bold text-white mb-2">🎁 Реферальная программа</h1>
          <p className="text-gray-400">Приглашайте друзей и получайте награды!</p>
        </div>
        <Card className="p-5 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <p className="text-blue-300 font-semibold">⚠️ Пожалуйста, войдите в систему</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-cyan-400" />
          <p className="text-gray-400">Загружение данных...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="pb-24 pt-6 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">🎁 Реферальная программа</h1>
          <p className="text-gray-400">Приглашайте друзей и получайте награды!</p>
        </div>
        <Card className="p-5 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-red-300 font-semibold">❌ {error}</p>
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
    <div className="pb-24 pt-6 px-4 space-y-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">🎁 Реферальная программа</h1>
        <p className="text-gray-400">Приглашайте друзей и игройте вместе!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Приглашено */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 bg-slate-900/50 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Приглашено</span>
            </div>
            <p className="text-3xl font-bold text-blue-400">{stats?.myRefeersCount || 0}</p>
          </div>
        </motion.div>

        {/* Бонусы */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 bg-slate-900/50 border border-cyan-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-gray-400">Бонусы</span>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{stats?.totalCommissionPaid || 0}</p>
          </div>
        </motion.div>
      </div>

      {/* Доступно бонусов - большая карточка */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="p-5 bg-gradient-to-br from-emerald-900/40 to-teal-900/20 border border-emerald-500/40 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400" />
                Доступно бонусов
              </p>
              <p className="text-4xl font-bold text-emerald-400">{stats?.pendingTurnover || 0}</p>
            </div>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold px-6">
              Использовать
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Ваша реферальная ссылка */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-5 bg-slate-900/50 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white">Ваша реферальная ссылка</h3>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2 items-center bg-blue-900/30 border border-blue-500/30 p-3 rounded-lg">
              <input
                type="text"
                value={`https://game-portal.com/ref/${stats?.myReferralCode}`}
                readOnly
                className="flex-1 bg-transparent text-blue-300 text-sm font-mono outline-none"
              />
              <button
                onClick={copyCode}
                className="p-2 hover:bg-blue-600/20 rounded-lg transition"
              >
                <Copy className="w-4 h-4 text-blue-400" />
              </button>
            </div>

            <div className="flex gap-2 items-center bg-blue-900/30 border border-blue-500/30 p-3 rounded-lg">
              <input
                type="text"
                value={stats?.myReferralCode || ''}
                readOnly
                className="flex-1 bg-transparent text-blue-300 text-sm font-mono outline-none"
              />
              <button
                onClick={copyCode}
                className="p-2 hover:bg-blue-600/20 rounded-lg transition"
              >
                <Copy className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Что ты получаешь */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-5 bg-slate-900/50 border border-purple-500/30 rounded-xl">
          <h3 className="font-bold text-white mb-4 text-lg">💰 Что ты получаешь?</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="w-1 bg-purple-500 rounded-full flex-shrink-0"></div>
              <div>
                <p className="text-purple-300 font-semibold">30% от игровой комиссии</p>
                <p className="text-gray-400 text-xs mt-1">От оборота каждого приглашённого реферала</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-1 bg-purple-500 rounded-full flex-shrink-0"></div>
              <div>
                <p className="text-purple-300 font-semibold">Автоматические выплаты</p>
                <p className="text-gray-400 text-xs mt-1">Комиссия выплачивается на ваш баланс</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Если не привязан - форма ввода */}
      {!stats?.referredByCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-5 bg-slate-900/50 border border-amber-500/30 rounded-xl">
            <h3 className="font-bold text-white mb-4 text-lg">🎁 Введите код реферера</h3>
            <p className="text-gray-400 text-sm mb-4">
              Если вас пригласил друг, введите его код и получайте +100% к первому пополнению!
            </p>

            <form onSubmit={handleLinkReferrer} className="space-y-3">
              <Input
                type="text"
                placeholder="Введите реферальный код..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="bg-amber-900/30 border border-amber-500/30 text-white placeholder:text-gray-500 rounded-lg focus:border-amber-500/60 focus:bg-amber-900/40"
                disabled={linking}
              />

              <Button
                type="submit"
                disabled={linking || !inputCode.trim()}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold"
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

              <p className="text-xs text-gray-500 text-center">
                ⚠️ Код можно ввести только один раз!
              </p>
            </form>
          </div>
        </motion.div>
      )}

      {/* Если привязан - инфо */}
      {stats?.referredByCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="p-5 bg-emerald-900/30 border border-emerald-500/40 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <h3 className="font-bold text-white">Вы привязаны к рефереру</h3>
            </div>

            <div className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
              <p className="text-gray-400 text-sm mb-2">Реферер:</p>
              <p className="font-semibold text-emerald-300">{stats?.referrerUsername}</p>
            </div>

            <p className="text-sm text-emerald-300 mt-4">
              ✅ Вы получите +100% бонус к первому пополнению!
            </p>
          </div>
        </motion.div>
      )}

      {/* Как это работает */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="p-5 bg-slate-900/50 border border-slate-700/50 rounded-xl">
          <h3 className="font-bold text-white mb-5 text-lg">📚 Как это работает?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-semibold text-white">Поделись кодом</p>
                <p className="text-gray-400 text-sm">Отправь реферальный код другу</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-cyan-500/20 border border-cyan-500/40 rounded-full flex items-center justify-center">
                <span className="text-cyan-400 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-semibold text-white">Друг регистрируется</p>
                <p className="text-gray-400 text-sm">Используй код при регистрации</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="font-semibold text-white">Получай выплаты</p>
                <p className="text-gray-400 text-sm">30% от его оборота автоматически</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Условия */}
      <div className="p-5 bg-slate-900/50 border border-slate-700/50 rounded-xl">
        <h3 className="font-bold text-white mb-5 text-lg">📋 Условия программы</h3>
        <div className="space-y-5 text-sm">
          <div>
            <p className="font-semibold text-blue-300 mb-2">✅ Для реферера:</p>
            <ul className="space-y-1 text-gray-400 text-xs ml-4">
              <li>• 30% от игровой комиссии оборота рефералов</li>
              <li>• Автоматические выплаты от 100 USDT оборота</li>
              <li>• Неограниченное число приглашенных</li>
              <li>• Реферальная ссылка не изменяется</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-amber-300 mb-2">🎁 Для реферала:</p>
            <ul className="space-y-1 text-gray-400 text-xs ml-4">
              <li>• +100% к первому пополнению (макс 10,000 USDT)</li>
              <li>• Отыграй в 10x перед выводом</li>
              <li>• Действует 7 дней с активации</li>
              <li>• Код вводится один раз</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}