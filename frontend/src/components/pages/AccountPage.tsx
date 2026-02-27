import { useState, useEffect, useRef } from 'react';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import {
  Loader2,
  Flame,
  Trophy,
  Zap,
  Clock,
  Star,
  TrendingUp,
  CreditCard,
  ArrowUpCircle,
  History,
  Shield,
  MessageSquare,
  BarChart3,
  Gift,
  Check,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface GameStat {
  gameType: string;
  totalGames: number;
  largestWin: number;
}

interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  vipLevel: string;
  vipRank?: string;
  level: number;
  totalGames: number;
  winningBets: number;
  totalScore?: number;
  largestWin?: {
    amount: number;
    gameType: string;
  };
  createdAt: string;
  isAdmin?: boolean;
  gameStats?: GameStat[];
}

interface ActiveBonus {
  id: string;
  grantedAmount: string;
  requiredWager: string;
  wageredAmount: string;
  expiresAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ЦВЕТОВАЯ ПАЛИТРА (использует CSS переменные)
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: 'var(--background)',
  card: 'var(--card)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  accent: 'var(--accent)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
};

const VIP_RANKS = {
  bronze: { 
    name: 'Бронза', 
    icon: '🥉',
    gradient: 'linear-gradient(135deg, #8B4513, #CD7F32)'
  },
  silver: { 
    name: 'Серебро', 
    icon: '🥈',
    gradient: 'linear-gradient(135deg, #708090, #C0C0C0)'
  },
  gold: { 
    name: 'Золото', 
    icon: '🥇',
    gradient: 'linear-gradient(135deg, #DAA520, #FFD700)'
  },
  platinum: { 
    name: 'Платина', 
    icon: '💎',
    gradient: 'linear-gradient(135deg, #71797E, #E5E4E2)'
  },
  diamond: { 
    name: 'Бриллиант', 
    icon: '✨',
    gradient: 'linear-gradient(135deg, #00CED1, #00FFFF)'
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  try {
    const str = value.toString();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  } catch (e) {
    return 0;
  }
}

function calculateVipRank(totalGames: number): string {
  if (totalGames >= 1500) return 'diamond';
  if (totalGames >= 500) return 'platinum';
  if (totalGames >= 150) return 'gold';
  if (totalGames >= 50) return 'silver';
  return 'bronze';
}

// ✅ ДИНАМИЧЕСКОЕ ОТОБРАЖЕНИЕ НАЗВАНИЙ ИГР
function getGameDisplayName(gameType: string): string {
  const gameNames: Record<string, string> = {
    'CRASH': 'Турбо Краш',
    'MINESWEEPER': 'Сапёр Про',
    'PLINKO': 'Plinko',
    'COINFLIP': 'Орёл и решка',
    'SLOT': 'Слоты',
    'ROULETTE': 'Рулетка',
    'BLACKJACK': 'Блэкджек',
    'LIVE_DEALER': 'Живой дилер',
  };
  
  // Если игра не найдена, возвращаем красивое название из типа
  return gameNames[gameType.toUpperCase()] || gameType.charAt(0) + gameType.slice(1).toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 КОМПОНЕНТ: MetricCard
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  delay?: number;
}

const MetricCard = ({ 
  icon, 
  label, 
  value, 
  unit = '', 
  color = COLORS.primary, 
  delay = 0 
}: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-2xl p-6 border transition-all hover:border-opacity-100"
    style={{
      background: `color-mix(in srgb, ${color} 15%, transparent)`,
      borderColor: color,
      borderOpacity: 0.3,
    }}
  >
    <div className="flex items-center space-x-3 mb-3">
      <div style={{ color }}>
        {icon}
      </div>
      <p style={{ color: COLORS.mutedForeground }} className="text-sm font-medium">
        {label}
      </p>
    </div>
    <p style={{ color: COLORS.foreground }} className="text-2xl font-bold">
      {value}
      {unit && <span className="text-sm ml-2" style={{ color: COLORS.mutedForeground }}>{unit}</span>}
    </p>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎁 КОМПОНЕНТ: ИНФОРМАЦИЯ ОБ АКТИВНОМ БОНУСЕ
// ═══════════════════════════════════════════════════════════════════════════════

const BonusCard = ({ bonus, onCancel }: { bonus: ActiveBonus; onCancel?: () => Promise<void> }) => {
  const wagered = toNumber(bonus.wageredAmount);
  const required = toNumber(bonus.requiredWager);
  const granted = toNumber(bonus.grantedAmount);
  const noWager = required <= 0;
  const remaining = Math.max(0, required - wagered);
  const progress = noWager ? 100 : Math.min((wagered / required) * 100, 100);
  const [cancelling, setCancelling] = useState(false);

  const expiresAt = bonus.expiresAt ? new Date(bonus.expiresAt) : null;
  const now = new Date();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  const handleCancel = async () => {
    if (!onCancel || !window.confirm('Отменить бонус? Весь бонусный счёт будет обнулён. Продолжить?')) return;
    setCancelling(true);
    try {
      await onCancel();
    } finally {
      setCancelling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl p-6 mb-6 border transition-all"
      style={{
        background: `color-mix(in srgb, ${COLORS.success} 15%, transparent)`,
        borderColor: COLORS.success,
        borderOpacity: 0.3,
      }}
    >
      {/* ЗАГОЛОВОК */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">🎁</div>
        <div>
          <h3 style={{ color: COLORS.foreground }} className="text-lg font-bold">
            Активный бонус
          </h3>
          <p style={{ color: COLORS.mutedForeground }} className="text-xs">
            {noWager ? 'Бонус без отыгрыша' : 'Отыграйте требуемую сумму чтобы вывести выигрыш'}
          </p>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ О БОНУСЕ (две колонки) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          className="rounded-xl p-4 text-center border transition-all"
          style={{
            background: `color-mix(in srgb, ${COLORS.success} 15%, transparent)`,
            borderColor: COLORS.success,
            borderOpacity: 0.3,
          }}
        >
          <p style={{ color: COLORS.mutedForeground }} className="text-xs font-medium mb-2">
            Размер бонуса
          </p>
          <p style={{ color: COLORS.success }} className="text-2xl font-bold">
            {granted.toFixed(2)}
          </p>
          <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-1">
            USDT
          </p>
        </div>

        <div
          className="rounded-xl p-4 text-center border transition-all"
          style={{
            background: `color-mix(in srgb, ${COLORS.primary} 15%, transparent)`,
            borderColor: COLORS.primary,
            borderOpacity: 0.3,
          }}
        >
          <p style={{ color: COLORS.mutedForeground }} className="text-xs font-medium mb-2">
            {noWager ? 'Без отыгрыша' : 'Осталось отыграть'}
          </p>
          <p style={{ color: COLORS.primary }} className="text-2xl font-bold">
            {noWager ? '0' : remaining.toFixed(2)}
          </p>
          <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-1">
            USDT
          </p>
        </div>
      </div>

      {/* ПРОГРЕСС-БАР */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p style={{ color: COLORS.mutedForeground }} className="text-xs font-medium">
            Прогресс отыгрыша
          </p>
          <p style={{ color: COLORS.success }} className="text-sm font-bold">
            {progress.toFixed(0)}%
          </p>
        </div>

        <div
          className="w-full h-3 rounded-full overflow-hidden border transition-all"
          style={{
            background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
            borderColor: COLORS.success,
            borderOpacity: 0.3,
          }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.primary}, ${COLORS.success})`,
              boxShadow: `0 0 16px color-mix(in srgb, ${COLORS.success} 50%, transparent)`,
            }}
          />
        </div>

        <div className="flex justify-between text-xs mt-3" style={{ color: COLORS.mutedForeground }}>
          <span>Отыграно: {wagered.toFixed(2)} / {noWager ? '0' : required.toFixed(2)}</span>
          {!noWager && <span>Отыгрыш от {granted.toFixed(2)}</span>}
        </div>
      </div>

      {/* ДНЕЙ ДО ИСТЕЧЕНИЯ */}
      {expiresAt && (
        <div
          className="rounded-xl p-4 flex items-center gap-3 border transition-all"
          style={{
            background: 'color-mix(in srgb, #EF4444 15%, transparent)',
            borderColor: '#EF4444',
            borderOpacity: 0.3,
          }}
        >
          <Clock size={18} style={{ color: '#EF4444' }} />
          <p style={{ color: '#EF4444' }} className="font-medium">
            ⏰ Осталось {daysLeft} дн{daysLeft !== 1 ? '' : 'я'}
          </p>
        </div>
      )}

      {/* КНОПКА ОТМЕНЫ БОНУСА */}
      {onCancel && (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3 rounded-xl border-2 font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              borderColor: '#EF4444',
              color: '#EF4444',
              background: 'color-mix(in srgb, #EF4444 10%, transparent)',
            }}
          >
            {cancelling ? 'Отмена...' : 'Отменить бонус (бонусный счёт будет обнулён)'}
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export function AccountPage() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activeBonus, setActiveBonus] = useState<ActiveBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarFallback, setAvatarFallback] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState<{
    valid: boolean;
    code: string;
    name: string;
    isFreebet?: boolean;
    freebetAmount?: number;
    percentage: number;
    wagerMultiplier: number;
    minDeposit: number;
    maxDeposit: number | null;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);
  const [applyingFreebet, setApplyingFreebet] = useState(false);

  const hasLoadedRef = useRef(false);
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const { data, loading: profileLoading, error: profileError, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  const { data: bonusData, execute: fetchActiveBonus } = useFetch('USER_GET_active-bonus', 'GET');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      
      fetchProfile().catch(() => {
        setError('Failed to load profile');
        setLoading(false);
      });
      
      fetchActiveBonus().catch(() => {});
    }
  }, [fetchProfile, fetchActiveBonus]);

  useEffect(() => {
    if (data) {
      if (data.success && data.data) {
        setProfileData(data.data as UserProfile);
      } else if (data.id && data.username) {
        setProfileData(data as UserProfile);
      } else if (data.data) {
        setProfileData(data.data as UserProfile);
      }
      setError(null);
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (bonusData) {
      try {
        if (bonusData.id && bonusData.grantedAmount !== undefined && bonusData.requiredWager !== undefined) {
          setActiveBonus(bonusData as ActiveBonus);
          return;
        }
        
        if (bonusData.success && bonusData.data) {
          setActiveBonus(bonusData.data as ActiveBonus);
          return;
        }
        
        if (bonusData.data) {
          setActiveBonus(bonusData.data as ActiveBonus);
          return;
        }
      } catch {
        // Silent fail
      }
    }
  }, [bonusData]);

  useEffect(() => {
    if (profileError) {
      setError(profileError);
      setLoading(false);
    }
  }, [profileError]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎁 ВАЛИДАЦИЯ ПРОМОКОДА
  // ═══════════════════════════════════════════════════════════════════════════════

  const validatePromoCode = async (code: string) => {
    if (!code || code.trim().length === 0) {
      setPromoValid(null);
      setPromoError(null);
      return;
    }

    setPromoValidating(true);
    setPromoError(null);

    try {
      const response = await fetch(`${API_URL}/api/v1/deposit/validate-promo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: code.trim().toUpperCase() })
      });

      const data = await response.json();

      if (data.success && data.data?.valid && data.data?.promo) {
        setPromoValid({
          valid: true,
          code: data.data.promo.code,
          name: data.data.promo.name,
          isFreebet: data.data.promo.isFreebet || false,
          freebetAmount: data.data.promo.freebetAmount || undefined,
          percentage: data.data.promo.percentage || 0,
          wagerMultiplier: data.data.promo.wagerMultiplier,
          minDeposit: data.data.promo.minDeposit || 0,
          maxDeposit: data.data.promo.maxDeposit || null,
        });
        setPromoError(null);
        // Сохраняем промокод в localStorage для использования при депозите (только для обычных бонусов)
        if (!data.data.promo.isFreebet) {
          localStorage.setItem('saved_promo_code', code.trim().toUpperCase());
        }
      } else {
        setPromoValid(null);
        setPromoError(data.data?.reason || data.message || 'Промокод недействителен');
        localStorage.removeItem('saved_promo_code');
      }
    } catch (error) {
      setPromoValid(null);
      setPromoError('Ошибка проверки промокода');
      localStorage.removeItem('saved_promo_code');
    } finally {
      setPromoValidating(false);
    }
  };

  // Используем useRef для хранения timeout
  const promoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePromoCodeChange = (value: string) => {
    setPromoCode(value);
    
    // Очищаем предыдущий timeout
    if (promoTimeoutRef.current) {
      clearTimeout(promoTimeoutRef.current);
    }
    
    // Валидируем с задержкой
    promoTimeoutRef.current = setTimeout(() => {
      validatePromoCode(value);
    }, 500);
  };

  const applyFreebet = async () => {
    if (!promoValid?.isFreebet || !promoCode.trim()) return;
    
    setApplyingFreebet(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/deposit/apply-freebet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() })
      });

      const data = await response.json();

      if (data.success) {
        setPromoCode('');
        setPromoValid(null);
        setPromoError(null);
        // Обновляем данные профиля и бонуса
        await fetchProfile();
        await fetchActiveBonus();
        // Показываем успешное сообщение
        alert(data.message || 'Фрибет успешно применён!');
      } else {
        setPromoError(data.message || 'Ошибка применения фрибета');
      }
    } catch (error) {
      setPromoError('Ошибка применения фрибета');
    } finally {
      setApplyingFreebet(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎯 РЕНДЕР ПРОФИЛЯ
  // ═══════════════════════════════════════════════════════════════════════════════

  if (profileData) {
    const {
      username,
      firstName,
      lastName,
      totalGames,
      winningBets,
      totalScore = 0,
      largestWin,
      photoUrl,
      createdAt,
      level,
      vipRank = 'bronze',
    } = profileData;

    const calculatedVipRank = vipRank || calculateVipRank(totalGames);
    const vipInfo = VIP_RANKS[calculatedVipRank as keyof typeof VIP_RANKS] || VIP_RANKS.bronze;
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username;
    const lossCount = totalGames - winningBets;
    const safeLargestWin = largestWin ? toNumber(largestWin.amount) : 0;
    const winRate = totalGames > 0 ? ((winningBets / totalGames) * 100).toFixed(1) : '0';
    const safeTotalScore = toNumber(totalScore);

    const getInitials = (fName: string, lName: string | null) => {
      const first = fName ? fName[0] : '';
      const last = lName ? lName[0] : '';
      return (first + last).toUpperCase().substring(0, 2) || username.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(firstName || "", lastName);
    const dateJoined = new Date(createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    return (
      <div 
        style={{ 
          backgroundColor: COLORS.background, 
          minHeight: '100vh', 
          padding: '24px 16px',
          transition: 'background-color 300ms ease, color 300ms ease'
        }} 
        className="pb-24"
      >
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          
          {/* 🎪 ПРОФИЛЬ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 mb-6 border transition-all"
            style={{
              background: COLORS.card,
              borderColor: COLORS.border,
            }}
          >
            {/* АВАТАР И ИМЯ */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-full border-4 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 transition-all overflow-hidden"
                style={{
                  background: avatarFallback || !photoUrl ? vipInfo.gradient : 'transparent',
                  borderColor: COLORS.primary,
                  boxShadow: `0 0 24px color-mix(in srgb, ${COLORS.primary} 60%, transparent)`,
                }}
              >
                {!avatarFallback && photoUrl ? (
                  <img 
                    src={photoUrl} 
                    alt="User" 
                    className="w-full h-full object-cover"
                    onError={() => setAvatarFallback(true)}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </motion.div>

              <div>
                <h1 style={{ color: COLORS.foreground }} className="text-2xl font-bold">
                  {fullName || username}
                </h1>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={16} style={{ color: COLORS.success }} className="fill-current" />
                  <span style={{ color: COLORS.success }} className="font-medium">
                    {vipInfo.name} статус
                  </span>
                </div>
                <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-1">
                  Игрок с {dateJoined}
                </p>
              </div>
            </div>

            {/* УРОВЕНЬ ИГРОКА */}
            <div
              className="rounded-2xl p-6 border transition-all mb-6"
              style={{
                background: `color-mix(in srgb, ${COLORS.primary} 20%, transparent)`,
                borderColor: COLORS.primary,
                borderOpacity: 0.3,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Trophy size={24} style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.mutedForeground }} className="text-sm font-medium">
                  Уровень игрока
                </span>
              </div>
              <p style={{ color: COLORS.primary }} className="text-4xl font-bold">
                {level}
              </p>
            </div>

            {/* КНОПКИ ПОПОЛНЕНИЯ И ВЫВОДА - КОМПАКТНЫЙ ДИЗАЙН */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <motion.button
                onClick={() => navigate('/deposit')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl p-3 border transition-all flex items-center justify-center gap-2 font-medium text-sm min-w-0"
                style={{
                  background: `color-mix(in srgb, ${COLORS.success} 15%, transparent)`,
                  borderColor: COLORS.success,
                  borderOpacity: 0.3,
                  color: COLORS.success,
                }}
              >
                <CreditCard size={18} />
                <span className="truncate">Пополнить</span>
              </motion.button>

              <motion.button
                onClick={() => navigate('/withdraw')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl p-3 border transition-all flex items-center justify-center gap-2 font-medium text-sm min-w-0"
                style={{
                  background: `color-mix(in srgb, ${COLORS.primary} 15%, transparent)`,
                  borderColor: COLORS.primary,
                  borderOpacity: 0.3,
                  color: COLORS.primary,
                }}
              >
                <ArrowUpCircle size={18} />
                <span className="truncate">Вывести</span>
              </motion.button>
            </div>

            {/* КНОПКИ ДЕЙСТВИЙ: ИСТОРИЯ И ЗАЯВКИ */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <motion.button
                onClick={() => navigate('/history')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl p-3 border transition-all flex items-center justify-center gap-2 font-medium text-sm"
                style={{
                  background: `linear-gradient(135deg, 
                    color-mix(in srgb, ${COLORS.accent} 15%, transparent), 
                    color-mix(in srgb, ${COLORS.primary} 10%, transparent)
                  )`,
                  borderColor: `color-mix(in srgb, ${COLORS.accent} 40%, ${COLORS.primary})`,
                  color: COLORS.foreground,
                }}
              >
                <History size={18} style={{ color: COLORS.accent }} />
                <span>История</span>
              </motion.button>

              <motion.button
                onClick={() => navigate('/support?view=list')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-xl p-3 border transition-all flex items-center justify-center gap-2 font-medium text-sm"
                style={{
                  background: `linear-gradient(135deg, 
                    color-mix(in srgb, #06b6d4 15%, transparent), 
                    color-mix(in srgb, #3b82f6 10%, transparent)
                  )`,
                  borderColor: '#06b6d4',
                  borderOpacity: 0.5,
                  color: COLORS.foreground,
                }}
              >
                <MessageSquare size={18} className="text-cyan-500" />
                <span>Мои заявки</span>
              </motion.button>
            </div>

            {/* 🎁 ПРОМОКОД */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl p-4 border transition-all mb-4"
              style={{
                background: `color-mix(in srgb, ${COLORS.accent} 10%, ${COLORS.card})`,
                borderColor: COLORS.border,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Gift size={18} style={{ color: COLORS.accent }} />
                <h3 style={{ color: COLORS.foreground }} className="font-semibold text-sm">
                  Промокод
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => handlePromoCodeChange(e.target.value)}
                    placeholder="Введите промокод"
                    className="flex-1 rounded-lg px-3 py-2 text-sm border transition-all"
                    style={{
                      background: COLORS.background,
                      borderColor: promoValid?.valid ? COLORS.success : COLORS.border,
                      color: COLORS.foreground,
                    }}
                    disabled={promoValidating}
                  />
                  {promoValidating && (
                    <div className="flex items-center justify-center w-10">
                      <Loader2 size={16} className="animate-spin" style={{ color: COLORS.primary }} />
                    </div>
                  )}
                  {promoValid?.valid && !promoValidating && (
                    <div className="flex items-center justify-center w-10">
                      <Check size={18} style={{ color: COLORS.success }} />
                    </div>
                  )}
                  {promoError && !promoValidating && (
                    <div className="flex items-center justify-center w-10">
                      <X size={18} style={{ color: '#EF4444' }} />
                    </div>
                  )}
                </div>

                {promoValid?.valid && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg p-3"
                    style={{
                      background: `color-mix(in srgb, ${COLORS.success} 15%, transparent)`,
                      border: `1px solid ${COLORS.success}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Check size={16} style={{ color: COLORS.success }} />
                      <p style={{ color: COLORS.success }} className="text-sm font-semibold">
                        {promoValid.name}
                      </p>
                    </div>
                    {promoValid.isFreebet ? (
                      <>
                        <p style={{ color: COLORS.mutedForeground }} className="text-xs">
                          Фрибет: {promoValid.freebetAmount || 0} USDT на бонусный баланс
                        </p>
                        <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-1">
                          Отыгрыш: {promoValid.wagerMultiplier}x
                        </p>
                        <button
                          onClick={applyFreebet}
                          disabled={applyingFreebet}
                          className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-all"
                          style={{
                            background: COLORS.success,
                            color: '#fff',
                            opacity: applyingFreebet ? 0.6 : 1,
                          }}
                        >
                          {applyingFreebet ? 'Применяется...' : 'Применить фрибет'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ color: COLORS.mutedForeground }} className="text-xs">
                          Бонус: +{promoValid.percentage}% при депозите
                          {promoValid.minDeposit && promoValid.minDeposit > 0 && (
                            <span> (мин. {promoValid.minDeposit} USDT)</span>
                          )}
                        </p>
                        <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-1">
                          Отыгрыш: {promoValid.wagerMultiplier}x
                        </p>
                      </>
                    )}
                  </motion.div>
                )}

                {promoError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg p-2"
                    style={{
                      background: 'color-mix(in srgb, #EF4444 15%, transparent)',
                      border: '1px solid #EF4444',
                    }}
                  >
                    <p style={{ color: '#EF4444' }} className="text-xs">
                      {promoError}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* КНОПКА АДМИН-ПАНЕЛИ (только для админов) */}
            {profileData?.isAdmin && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <motion.button
                  onClick={() => navigate('/admin-withdrawals')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl p-3 border transition-all flex items-center justify-center gap-2 font-medium text-sm"
                  style={{
                    background: `linear-gradient(135deg, 
                      color-mix(in srgb, #8B5CF6 20%, transparent), 
                      color-mix(in srgb, #6D28D9 15%, transparent)
                    )`,
                    borderColor: '#8B5CF6',
                    color: COLORS.foreground,
                  }}
                >
                  <Shield size={18} style={{ color: '#8B5CF6' }} />
                  <span>Выводы</span>
                </motion.button>
                <motion.button
                  onClick={() => navigate('/admin/stats')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="rounded-xl p-3 border transition-all flex items-center justify-center gap-2 font-medium text-sm"
                  style={{
                    background: `linear-gradient(135deg, 
                      color-mix(in srgb, #10B981 20%, transparent), 
                      color-mix(in srgb, #059669 15%, transparent)
                    )`,
                    borderColor: '#10B981',
                    color: COLORS.foreground,
                  }}
                >
                  <BarChart3 size={18} style={{ color: '#10B981' }} />
                  <span>Статистика</span>
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* 🎁 АКТИВНЫЙ БОНУС */}
          {activeBonus && (
            <BonusCard
              bonus={activeBonus}
              onCancel={async () => {
                try {
                  const res = await fetch(`${API_URL}/cancel-active-bonus`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  const json = await res.json();
                  if (res.ok && json.success) {
                    setActiveBonus(null);
                    fetchActiveBonus().catch(() => {});
                  } else {
                    throw new Error(json.message || json.error || 'Ошибка отмены');
                  }
                } catch (e) {
                  throw e;
                }
              }}
            />
          )}

          {/* 📊 ОСНОВНЫЕ МЕТРИКИ */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetricCard
              icon={<TrendingUp size={20} />}
              label="Общий счёт"
              value={safeTotalScore.toLocaleString('ru-RU')}
              color={COLORS.success}
              delay={0.3}
            />
            <MetricCard
              icon={<Clock size={20} />}
              label="Игр сыграно"
              value={totalGames.toLocaleString('ru-RU')}
              color={COLORS.primary}
              delay={0.35}
            />
            <MetricCard
              icon={<Flame size={20} />}
              label="Выигрышей"
              value={winningBets.toLocaleString('ru-RU')}
              color={COLORS.success}
              delay={0.4}
            />
            {largestWin && safeLargestWin > 0 && (
              <MetricCard
                icon={<Zap size={20} />}
                label="Макс выигрыш"
                value={safeLargestWin.toFixed(2)}
                unit="USDT"
                color="#FBBF24"
                delay={0.45}
              />
            )}
          </div>

          {/* WIN RATE */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-6 border transition-all"
            style={{
              background: `color-mix(in srgb, ${COLORS.primary} 10%, ${COLORS.card})`,
              borderColor: COLORS.border,
            }}
          >
            <div className="text-center">
              <p style={{ color: COLORS.mutedForeground }} className="text-xs font-medium mb-2">
                Win Rate
              </p>
              <p style={{ color: COLORS.success }} className="text-2xl font-bold">
                {winRate}%
              </p>
            </div>
          </motion.div>

          {/* 📊 СТАТИСТИКА ПО ИГРАМ (ДИНАМИЧЕСКАЯ) */}
          {profileData.gameStats && profileData.gameStats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl p-6 border transition-all"
              style={{
                background: COLORS.card,
                borderColor: COLORS.border,
              }}
            >
              <h3 style={{ color: COLORS.foreground }} className="text-lg font-bold mb-4">
                Статистика по играм
              </h3>
              <div className="space-y-4">
                {profileData.gameStats.map((gameStat, index) => {
                  const gameName = getGameDisplayName(gameStat.gameType);
                  
                  return (
                    <motion.div
                      key={gameStat.gameType}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="rounded-xl p-4 border transition-all"
                      style={{
                        background: `color-mix(in srgb, ${COLORS.primary} 5%, ${COLORS.card})`,
                        borderColor: COLORS.border,
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 style={{ color: COLORS.foreground }} className="font-semibold text-base">
                          {gameName}
                        </h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p style={{ color: COLORS.mutedForeground }} className="text-xs mb-1">
                            Игр сыграно
                          </p>
                          <p style={{ color: COLORS.primary }} className="text-sm font-semibold">
                            {gameStat.totalGames}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: COLORS.mutedForeground }} className="text-xs mb-1">
                            Макс. выигрыш
                          </p>
                          <p style={{ color: gameStat.largestWin > 0 ? COLORS.success : COLORS.mutedForeground }} className="text-sm font-semibold">
                            {gameStat.largestWin > 0 ? `${gameStat.largestWin.toFixed(2)} USDT` : '—'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOADING / ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{ backgroundColor: COLORS.background }}
      className="min-h-screen flex items-center justify-center flex-col gap-4 transition-colors duration-300"
    >
      {loading || profileLoading ? (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={48} style={{ color: COLORS.primary }} />
          </motion.div>
          <p style={{ color: COLORS.mutedForeground }}>Загрузка профиля...</p>
        </>
      ) : error ? (
        <>
          <p style={{ color: '#EF4444', fontWeight: 'bold', textAlign: 'center' }}>❌ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-xl font-semibold transition-all"
            style={{
              background: COLORS.primary,
              color: 'white',
            }}
          >
            Повторить
          </button>
        </>
      ) : (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={48} style={{ color: COLORS.primary }} />
          </motion.div>
          <p style={{ color: COLORS.mutedForeground }}>Инициализация...</p>
        </>
      )}
    </div>
  );
}