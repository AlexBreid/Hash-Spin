import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, CheckCircle, AlertCircle, Loader } from 'lucide-react';
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
        <p className="text-muted-foreground">Введите реферальный код друга и получайте {stats?.bonusPercentage}% бонуса к ВАШИМ пополнениям</p>
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
            📤 Поделитесь этим кодом с друзьями. Они получат {stats?.bonusPercentage}% бонуса к своим пополнениям!
          </p>
        </Card>
      </motion.div>

      {/* Статистика */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-5 bg-gradient-to-br from-success/20 to-success/5 border-success/30">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-success" />
            <span className="text-muted-foreground">Активных рефералов</span>
          </div>
          <p className="text-3xl font-bold text-success">{stats?.myRefeersCount || 0}</p>
        </Card>
      </motion.div>

      {/* Раздел: Введите реферальный код */}
      {!stats?.referredByCode ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-accent" />
              <h3 className="font-bold text-lg">Введите реферальный код</h3>
            </div>

            <form onSubmit={handleLinkReferrer} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Если вас пригласил друг, введите его реферальный код и получайте {stats?.bonusPercentage}% бонуса к его пополнениям!
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
          transition={{ delay: 0.2 }}
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
              ✅ Вы получаете {stats?.bonusPercentage}% бонуса к ВАШИМ пополнениям
            </p>
          </Card>
        </motion.div>
      )}

      {/* Как это работает */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-5">
          <h3 className="font-bold text-lg mb-5">📚 Как работает реферальная система</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold">Получите код от друга</p>
                <p className="text-sm text-muted-foreground">Попросите реферальный код у своего друга</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold">Введите код</p>
                <p className="text-sm text-muted-foreground">На странице реферралов или при регистрации</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-success-foreground font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold">Получайте бонусы</p>
                <p className="text-sm text-muted-foreground">{stats?.bonusPercentage}% к ВАШИМ пополнениям — автоматически!</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Условия */}
      <Card className="p-5 bg-muted/50">
        <h3 className="font-bold mb-3">📋 Условия</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>✓ Реферальный код вводится один раз</li>
          <li>✓ Бонус зачисляется автоматически при пополнении реферала</li>
          <li>✓ Бонус начисляется на ваш основной баланс</li>
          <li>✓ Нет лимита на количество рефералов</li>
        </ul>
      </Card>
    </div>
  );
}