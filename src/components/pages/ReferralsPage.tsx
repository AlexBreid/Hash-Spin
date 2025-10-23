import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Users, Gift, Copy, Share2 } from 'lucide-react';
import { toast } from "sonner@2.0.3";

interface ReferralStats {
  totalInvited: number;
  pendingBonus: number;
  recentReferrals: Array<{
    id: string;
    username: string;
    date: string;
    status: 'active' | 'pending';
  }>;
}

const referralStats: ReferralStats = {
  totalInvited: 28,
  pendingBonus: 5,
  recentReferrals: [
    { id: '1', username: 'новичок456', date: '05.01.2025', status: 'active' },
    { id: '2', username: 'казинофан', date: '04.01.2025', status: 'active' },
    { id: '3', username: 'слотолюб', date: '03.01.2025', status: 'pending' },
    { id: '4', username: 'покерпро2', date: '02.01.2025', status: 'active' },
  ]
};

export function ReferralsPage() {
  const referralCode = 'GAME2025';
  const referralLink = `https://game-portal.com/ref/${referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast("Ссылка скопирована в буфер обмена!");
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast("Код скопирован в буфер обмена!");
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
          <p className="text-2xl font-bold text-primary">{referralStats.totalInvited}</p>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center space-x-2 mb-3">
            <Gift className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Бонусы</span>
          </div>
          <p className="text-2xl font-bold text-success">{referralStats.pendingBonus}</p>
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
            <p className="text-2xl font-bold text-accent">{referralStats.pendingBonus}</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 font-semibold px-6 py-2 rounded-2xl glow-effect">
            Использовать
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
              value={referralLink}
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
              value={referralCode}
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
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">1</div>
            <p className="text-sm">Поделитесь своей реферальной ссылкой с друзьями</p>
          </div>
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground font-bold flex-shrink-0">2</div>
            <p className="text-sm">Они регистрируются и начинают играть</p>
          </div>
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-success-foreground font-bold flex-shrink-0">3</div>
            <p className="text-sm">Вы оба получаете бонусы для игр!</p>
          </div>
        </div>
      </Card>

      {/* Recent Referrals */}
      <Card className="p-5">
        <h3 className="font-bold text-lg mb-5">Недавние рефералы</h3>
        <div className="space-y-4">
          {referralStats.recentReferrals.map((referral, index) => (
            <div key={referral.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0 card-appear" style={{animationDelay: `${index * 0.1}s`}}>
              <div>
                <p className="font-semibold text-card-foreground">{referral.username}</p>
                <p className="text-sm text-muted-foreground">{referral.date}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${referral.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
                  +1 бонус
                </p>
                <p className="text-xs text-muted-foreground">
                  {referral.status === 'active' ? 'Активен' : 'Ожидает'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}