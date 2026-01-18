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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DepositPage from './DepositPage';
import { WithdrawPage } from './WithdrawPage';

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

const BonusCard = ({ bonus }: { bonus: ActiveBonus }) => {
  console.log('🎁 BonusCard rendering with:', bonus);
  
  const wagered = toNumber(bonus.wageredAmount);
  const required = toNumber(bonus.requiredWager);
  const granted = toNumber(bonus.grantedAmount);
  const remaining = Math.max(0, required - wagered);
  const progress = Math.min((wagered / required) * 100, 100);
  
  const expiresAt = new Date(bonus.expiresAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  console.log('🎁 BonusCard computed:', { wagered, required, granted, remaining, progress, daysLeft });
  
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
            Отыграйте требуемую сумму чтобы вывести выигрыш
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
            Осталось отыграть
          </p>
          <p style={{ color: COLORS.primary }} className="text-2xl font-bold">
            {remaining.toFixed(2)}
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
          <span>Отыграно: {wagered.toFixed(2)} / {required.toFixed(2)}</span>
          <span>10x от {granted.toFixed(2)}</span>
        </div>
      </div>

      {/* ДНЕЙ ДО ИСТЕЧЕНИЯ */}
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
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const hasLoadedRef = useRef(false);

  const { data, loading: profileLoading, error: profileError, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  const { data: bonusData, execute: fetchActiveBonus } = useFetch('USER_GET_active-bonus', 'GET');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('🔄 Загружаю профиль...');
      
      fetchProfile().catch((err: Error) => {
        console.error('❌ Profile error:', err.message);
        setError('Failed to load profile');
        setLoading(false);
      });
      
      fetchActiveBonus()
        .then(() => console.log('✅ Бонус загружен'))
        .catch((err: Error) => {
          console.warn('⚠️ Бонус не загружен (это нормально):', err.message);
        });
    }
  }, [fetchProfile, fetchActiveBonus]);

  useEffect(() => {
    if (data) {
      console.log('✅ Profile data:', data);
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
      console.log('🎁 Raw bonusData:', bonusData);
      try {
        if (bonusData.id && bonusData.grantedAmount !== undefined && bonusData.requiredWager !== undefined) {
          console.log('✅ [DIRECT BONUS] Setting active bonus:', bonusData);
          setActiveBonus(bonusData as ActiveBonus);
          return;
        }
        
        if (bonusData.success && bonusData.data) {
          console.log('✅ [WRAPPED BONUS] Setting from success.data:', bonusData.data);
          setActiveBonus(bonusData.data as ActiveBonus);
          return;
        }
        
        if (bonusData.data) {
          console.log('✅ [DATA FIELD BONUS] Setting from data field:', bonusData.data);
          setActiveBonus(bonusData.data as ActiveBonus);
          return;
        }
        
        console.warn('⚠️ Bonus data структура не поддерживается:', bonusData);
      } catch (err) {
        console.error('❌ Error parsing bonus:', err);
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

    console.log('🎯 Rendering AccountPage with activeBonus:', activeBonus);

    // Если показываем страницу депозита или вывода
    if (showDeposit) {
      return <DepositPage onBack={() => setShowDeposit(false)} />;
    }

    if (showWithdraw) {
      return <WithdrawPage onBack={() => setShowWithdraw(false)} />;
    }

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
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => setShowDeposit(true)}
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
                onClick={() => setShowWithdraw(true)}
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
          </motion.div>

          {/* 🎁 АКТИВНЫЙ БОНУС */}
          {activeBonus && (
            <>
              <BonusCard bonus={activeBonus} />
            </>
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