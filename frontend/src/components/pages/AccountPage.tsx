import { useState, useEffect, useRef } from "react";
import { useFetch } from "../../hooks/useDynamicApi";
import { useAuth } from "../../context/AuthContext";
import {
  Loader2,
  Flame,
  Trophy,
  Zap,
  Clock,
  Star,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
// 🎨 ЦВЕТОВАЯ ПАЛИТРА (из CSS переменных)
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: '#0A0F1E',      // Очень тёмный синий (основной фон)
  card: '#0B1C3A',            // Тёмный синий (карточки)
  primary: '#3B82F6',         // Яркий синий (основной)
  success: '#10B981',         // Зелёный (успех)
  accent: '#10B981',          // Зелёный (акцент)
  muted: '#1E3A8A',           // Мягкий синий (приглушённый)
  border: 'rgba(59, 130, 246, 0.15)',  // Синяя граница
  foreground: '#ffffff',      // Белый текст
  mutedForeground: '#94A3B8', // Серый текст
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
// 🎯 КОМПОНЕНТ: MetricCard (с новыми цветами)
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
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      border: `1px solid ${color}30`,
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
// 🎁 КОМПОНЕНТ: ИНФОРМАЦИЯ ОБ АКТИВНОМ БОНУСЕ (если есть)
// ═══════════════════════════════════════════════════════════════════════════════

const BonusCard = ({ bonus }: { bonus: ActiveBonus }) => {
  const wagered = toNumber(bonus.wageredAmount);
  const required = toNumber(bonus.requiredWager);
  const granted = toNumber(bonus.grantedAmount);
  const remaining = Math.max(0, required - wagered);
  const progress = Math.min((wagered / required) * 100, 100);
  
  const expiresAt = new Date(bonus.expiresAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl p-6 mb-6 border"
      style={{
        background: `linear-gradient(135deg, ${COLORS.success}15, ${COLORS.success}08)`,
        border: `1px solid ${COLORS.success}30`,
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
          className="rounded-xl p-4 text-center border"
          style={{
            background: `${COLORS.success}15`,
            border: `1px solid ${COLORS.success}30`,
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
          className="rounded-xl p-4 text-center border"
          style={{
            background: `${COLORS.primary}15`,
            border: `1px solid ${COLORS.primary}30`,
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
          className="w-full h-3 rounded-full overflow-hidden border"
          style={{
            background: COLORS.muted + '40',
            border: `1px solid ${COLORS.success}30`,
          }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.primary}, ${COLORS.success})`,
              boxShadow: `0 0 16px ${COLORS.success}80`,
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
        className="rounded-xl p-4 flex items-center gap-3 border"
        style={{
          background: '#EF444415',
          border: '1px solid #EF444430',
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
// 📱 ГЛАВНЫЙ КОМПОНЕНТ (БЕЗ КНОПОК, С ФАЛБЭКОМ НА БОНУС)
// ═══════════════════════════════════════════════════════════════════════════════

export function AccountPage() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activeBonus, setActiveBonus] = useState<ActiveBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      // 🎁 Пытаемся загрузить бонус (НО НЕ ПАДАЕМ ЕСЛИ ОШИБКА)
      fetchActiveBonus()
        .then(() => console.log('✅ Бонус загружен'))
        .catch((err: Error) => {
          console.warn('⚠️ Бонус не загружен (это нормально):', err.message);
          // Не вызываем setError - продолжаем работу
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

  // 🎁 Обработка бонуса (с фалбэком)
  useEffect(() => {
    if (bonusData) {
      console.log('✅ Bonus data:', bonusData);
      try {
        if (bonusData.success && bonusData.data) {
          setActiveBonus(bonusData.data as ActiveBonus);
        } else if (bonusData.data) {
          setActiveBonus(bonusData.data as ActiveBonus);
        }
      } catch (err) {
        console.warn('⚠️ Error parsing bonus:', err);
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

    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '24px 16px' }} className="pb-24">
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          
          {/* 🎪 ПРОФИЛЬ (как на скриншоте) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 mb-6 border"
            style={{
              background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.card}80)`,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {/* АВАТАР И ИМЯ */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
                style={{
                  background: vipInfo.gradient,
                  borderColor: COLORS.primary,
                  boxShadow: `0 0 24px ${COLORS.primary}60`,
                }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="User" className="w-full h-full object-cover rounded-full" />
                ) : (
                  initials
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

            {/* УРОВЕНЬ ИГРОКА (большая карточка) */}
            <div
              className="rounded-2xl p-6 border"
              style={{
                background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.accent}10)`,
                border: `1px solid ${COLORS.primary}30`,
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
          </motion.div>

          {/* 🎁 АКТИВНЫЙ БОНУС (если есть) */}
          {activeBonus && (
            <BonusCard bonus={activeBonus} />
          )}

          {/* 📊 ОСНОВНЫЕ МЕТРИКИ (4 карточки) */}
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

          {/* WIN RATE И ПОРАЖЕНИЯ */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-6 border grid grid-cols-2 gap-4"
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.card})`,
              border: `1px solid ${COLORS.border}`,
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
            <div className="text-center">
              <p style={{ color: COLORS.mutedForeground }} className="text-xs font-medium mb-2">
                Поражений
              </p>
              <p style={{ color: '#EF4444' }} className="text-2xl font-bold">
                {lossCount.toLocaleString('ru-RU')}
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
      className="min-h-screen flex items-center justify-center flex-col gap-4"
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
              color: COLORS.foreground,
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