import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, CheckCircle, AlertCircle, Loader, TrendingUp, Award } from 'lucide-react';
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
          <h1 className="text-2xl font-bold mb-2">Реферальная программа</h1>
          <p className="text-muted-foreground">Приглашайте друзей и получайте бонусы!</p>
        </div>
        <Card className="p-5 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <p className="text-yellow-600 dark:text-yellow-500">⚠️ Пожалуйста, войдите в систему</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загружение данных...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="pb-24 pt-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Реферальная программа</h1>
          <p className="text-muted-foreground">Приглашайте друзей и получайте бонусы!</p>
        </div>
        <Card className="p-5 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-500">❌ {error}</p>
          <Button
            onClick={loadStatsData}
            className="mt-4"
            variant="outline"
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
      <div>
        <h1 className="text-2xl font-bold mb-2">🎁 Реферальная программа</h1>
        <p className="text-muted-foreground">Приглашайте друзей и зарабатывайте на их игре</p>
      </div>

      {/* Ваш реферальный код */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-5 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-lg">Ваш реферальный код</h3>
          </div>
          
          <div className="flex gap-3 items-center">
            <div className="flex-1 p-3 bg-background/50 rounded-lg border border-primary/20">
              <p className="text-center font-mono text-lg font-bold text-primary">
                {stats?.myReferralCode || 'N/A'}
              </p>
            </div>
            <Button
              size="sm"
              onClick={copyCode}
              variant="outline"
              className="px-4 rounded-lg"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            📤 Поделитесь этим кодом с друзьями и получайте {stats?.commissionRate}% комиссии от их потерь!
          </p>
        </Card>
      </motion.div>

      {/* Статистика */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 gap-3"
      >
        <Card className="p-4 bg-gradient-to-br from-success/20 to-success/5 border-success/30">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-success" />
            <span className="text-xs text-muted-foreground">Рефералов</span>
          </div>
          <p className="text-2xl font-bold text-success">{stats?.myRefeersCount || 0}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Оборот</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">${(stats?.totalTurnover || 0).toFixed(0)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-green-600" />
            <span className="text-xs text-muted-foreground">Выплачено</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${(stats?.totalCommissionPaid || 0).toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-orange-600" />
            <span className="text-xs text-muted-foreground">Ставка</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats?.commissionRate}%</p>
        </Card>
      </motion.div>

      {/* Что ты получаешь за рефералов */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-5 dark:from-blue-950/30 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
          <h3 className="font-bold text-lg mb-4">💰 Что ты получаешь за рефералов?</h3>
          <div className="space-y-3">
            <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <p className="text-xs text-muted-foreground mt-1">30% оборота от твоих рефералов</p>
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
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-5 dark:from-purple-950/30 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
            <h3 className="font-bold text-lg mb-4">🎁 Что ты получишь введя реферала?</h3>
            <div className="space-y-3">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg border-2 border-yellow-500">
                <p className="font-semibold text-sm">💎 Приветственный бонус</p>
                <p className="text-sm font-bold text-yellow-600 mt-2">+100% к твоему первому пополнению</p>
                <p className="text-xs text-muted-foreground mt-1">📈 Пример: Пополнил 10 USDT → получишь 10 USDT бонусом</p>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="font-semibold text-sm">📊 Требования на вывод</p>
                <p className="text-xs text-muted-foreground mt-1">Отыграй бонус в 10x перед выводом</p>
                <p className="text-xs text-muted-foreground mt-1">Пример: 10 USDT бонуса → отыграй 100 USDT в играх</p>
              </div>
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                <p className="font-semibold text-sm">⏰ Срок действия</p>
                <p className="text-xs text-muted-foreground mt-1">Бонус действует 7 дней с момента активации</p>
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
          <Card className="p-5 bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-accent" />
              <h3 className="font-bold text-lg">Введите реферальный код</h3>
            </div>

            <form onSubmit={handleLinkReferrer} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Если вас пригласил друг, введите его реферальный код и получайте +100% к первому пополнению!
              </p>

              <Input
                type="text"
                placeholder="Введите код реферера..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="rounded-lg bg-background/50"
                disabled={linking}
              />

              <Button
                type="submit"
                disabled={linking || !inputCode.trim()}
                className="w-full bg-accent hover:bg-accent/90 text-white rounded-lg font-semibold"
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

              <p className="text-xs text-muted-foreground text-center">
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
          <Card className="p-5 bg-gradient-to-br from-success/20 to-success/5 border-success/30">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-success" />
              <h3 className="font-bold text-lg">Вы привязаны к рефереру</h3>
            </div>

            <div className="p-3 bg-background/50 rounded-lg border border-success/30">
              <p className="text-sm text-muted-foreground mb-2">Реферер:</p>
              <p className="font-semibold text-lg">{stats?.referrerUsername}</p>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
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
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-5">📚 Как работает реферальная система</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold">Поделись своим кодом</p>
                <p className="text-sm text-muted-foreground">Отправь реферальный код своему другу</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold">Друг регистрируется</p>
                <p className="text-sm text-muted-foreground">Друг использует твой код при регистрации</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-success-foreground font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold">Получайте выплаты</p>
                <p className="text-sm text-muted-foreground">{stats?.commissionRate}% комиссии от его потерь — автоматически!</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Полные условия */}
      <Card className="p-5 bg-muted/50">
        <h3 className="font-bold mb-4">📋 Полные условия реферальной программы</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold mb-2">✅ Для реферера (пригласивший):</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• Получай {stats?.commissionRate}% комиссии от прибыли казино от своих рефералов</li>
              <li>• При привлечении 10+ активных рефералов можешь получить статус ВОРКЕР (5% профита)</li>
              <li>• Комиссия выплачивается автоматически при достижении минимума (100 USDT оборота)</li>
              <li>• Нет лимита на количество приглашенных людей</li>
              <li>• Реферальная ссылка уникальна и не изменяется</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">🎁 Для реферала (приглашённый):</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• Получи +100% к первому пополнению в виде бонуса</li>
              <li>• Максимум 10,000 USDT бонуса за одно пополнение</li>
              <li>• Отыграй бонус в 10x перед выводом</li>
              <li>• Бонус автоматически переводится в основной баланс после выполнения условий</li>
              <li>• Действует 7 дней с момента активации</li>
              <li>• Код вводится один раз и не может быть изменен</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">🔒 Общие правила:</p>
            <ul className="space-y-1 text-muted-foreground ml-4">
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