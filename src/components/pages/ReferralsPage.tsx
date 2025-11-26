import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, Share2, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState, useRef } from 'react';

interface ReferralStats {
  totalInvited: number;
  pendingBonus: number;
  totalCommission: number;
  referralCode: string;
  referralLink: string;
  recentReferrals: Array<{
    id: string;
    username: string;
    date: string;
    status: 'active' | 'pending';
  }>;
  currency: string;
}

export function ReferralsPage() {
  const { isAuthenticated } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const hasLoadedRef = useRef(false);

  // 🔑 Загружаем данные через API - ПРАВИЛЬНЫЙ КЕЙ
  const { data: statsData, loading, error, execute: loadStats } = useFetch(
    'REFERRAL_GET_referral_stats',
    'GET'
  );

  const { execute: claimBonus } = useFetch(
    'REFERRAL_POST_referral_claim-bonus',
    'POST'
  );

  // Загружаем данные ОДИН РАЗ при монтировании
  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadStats().catch(err => {
        console.error('Ошибка загрузки статистики:', err);
      });
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="pb-24 pt-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Реферальная программа</h1>
          <p className="text-muted-foreground">Приглашайте друзей и играйте вместе!</p>
        </div>
        <Card className="p-5 bg-yellow-50 border-yellow-200">
          <p className="text-yellow-600">⚠️ Пожалуйста, войдите в систему</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Загружение данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-24 pt-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Реферальная программа</h1>
          <p className="text-muted-foreground">Приглашайте друзей и играйте вместе!</p>
        </div>
        <Card className="p-5 bg-red-50 border-red-200">
          <p className="text-red-600">❌ Ошибка загрузки: {error}</p>
          <Button
            onClick={() => {
              hasLoadedRef.current = false;
              loadStats();
            }}
            className="mt-4"
            variant="outline"
          >
            Попробовать снова
          </Button>
        </Card>
      </div>
    );
  }

  const data = statsData as ReferralStats | null;

  if (!data) {
    return (
      <div className="pb-24 pt-6 px-4">
        <p className="text-muted-foreground">Данные не загружены</p>
      </div>
    );
  }

  const copyReferralLink = () => {
    navigator.clipboard.writeText(data.referralLink);
    toast.success('Ссылка скопирована в буфер обмена!');
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(data.referralCode);
    toast.success('Код скопирован в буфер обмена!');
  };

  const handleClaimBonus = async () => {
    try {
      setClaiming(true);
      // Используем первый токен (USDT = 1)
      const result = await claimBonus({ tokenId: 1 });
      toast.success(`✅ Бонус ${result.claimedAmount} успешно использован!`);
      // Перезагружаем статистику
      hasLoadedRef.current = false;
      await loadStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Ошибка: ${errorMessage}`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="pb-24 pt-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Реферальная программа</h1>
        <p className="text-muted-foreground">Приглашайте друзей и играйте вместе!</p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Приглашено</span>
          </div>
          <p className="text-2xl font-bold text-primary">{data.totalInvited}</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center space-x-2 mb-3">
            <Gift className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Бонусы</span>
          </div>
          <p className="text-2xl font-bold text-success">{data.pendingBonus}</p>
        </Card>
      </div>

      {/* Pending Bonus */}
      <Card className="p-5 mb-6 bg-gradient-to-r from-accent/20 to-accent/10 border-accent/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Gift className="w-5 h-5 text-accent" />
              <span className="text-muted-foreground">Доступно бонусов</span>
            </div>
            <p className="text-2xl font-bold text-accent">
              {data.totalCommission.toFixed(2)} {data.currency}
            </p>
          </div>
          <Button
            className="bg-accent hover:bg-accent/90 font-semibold px-6 py-2 rounded-2xl glow-effect"
            onClick={handleClaimBonus}
            disabled={claiming || data.totalCommission === 0}
          >
            {claiming ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Обработка...
              </>
            ) : (
              'Использовать'
            )}
          </Button>
        </div>
      </Card>

      {/* Referral Link */}
      <Card className="p-5 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Share2 className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Ваша реферальная ссылка</h3>
        </div>
        <div className="space-y-4">
          <div className="flex space-x-3">
            <Input
              value={data.referralLink}
              readOnly
              className="flex-1 rounded-2xl bg-muted/50"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyReferralLink}
              className="px-4 rounded-2xl hover:bg-primary hover:text-primary-foreground"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex space-x-3">
            <Input
              value={data.referralCode}
              readOnly
              className="flex-1 rounded-2xl bg-muted/50"
              placeholder="Реферальный код"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyReferralCode}
              className="px-4 rounded-2xl hover:bg-primary hover:text-primary-foreground"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* How it Works */}
      <Card className="p-5 mb-6">
        <h3 className="font-bold text-lg mb-4">Как это работает</h3>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
              1
            </div>
            <p className="text-sm">Поделитесь своей реферальной ссылкой с друзьями</p>
          </div>
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold flex-shrink-0">
              2
            </div>
            <p className="text-sm">Они регистрируются и начинают играть</p>
          </div>
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-success-foreground font-bold flex-shrink-0">
              3
            </div>
            <p className="text-sm">Вы оба получаете бонусы для игр!</p>
          </div>
        </div>
      </Card>

      {/* Recent Referrals */}
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-5">Недавние рефералы</h3>
        <div className="space-y-4">
          {data.recentReferrals && data.recentReferrals.length > 0 ? (
            data.recentReferrals.map((referral, index) => (
              <div
                key={referral.id}
                className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0 card-appear"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div>
                  <p className="font-semibold text-card-foreground">{referral.username}</p>
                  <p className="text-sm text-muted-foreground">{referral.date}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      referral.status === 'active' ? 'text-success' : 'text-muted-foreground'
                    }`}
                  >
                    +1 бонус
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {referral.status === 'active' ? 'Активен' : 'Ожидает'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">У вас еще нет рефералов</p>
          )}
        </div>
      </Card>
    </div>
  );
}