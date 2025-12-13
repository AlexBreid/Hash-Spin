import { useState, useEffect, useRef } from "react";
import { useFetch } from "../../hooks/useDynamicApi";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import {
  Loader2,
  Flame,
  Trophy,
  Zap,
  Clock,
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
// 🎨 ЦВЕТОВАЯ СХЕМА VIP
// ═══════════════════════════════════════════════════════════════════════════════

const VIP_COLORS: Record<string, any> = {
  bronze: { name: 'Бронза', color: '#cd7f32', bgGradient: 'linear-gradient(135deg, #8B4513, #CD7F32)', icon: '🥉' },
  silver: { name: 'Серебро', color: '#c0c0c0', bgGradient: 'linear-gradient(135deg, #708090, #C0C0C0)', icon: '🥈' },
  gold: { name: 'Золото', color: '#ffd700', bgGradient: 'linear-gradient(135deg, #DAA520, #FFD700)', icon: '🥇' },
  platinum: { name: 'Платина', color: '#e5e4e2', bgGradient: 'linear-gradient(135deg, #71797E, #E5E4E2)', icon: '💎' },
  diamond: { name: 'Бриллиант', color: '#00ffff', bgGradient: 'linear-gradient(135deg, #00CED1, #00FFFF)', icon: '✨' },
};

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

const MetricCard = ({ icon, label, value, unit = '', color = '#0ea5e9', delay = 0 }: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(6, 182, 212, 0.05))',
      border: `2px solid ${color}40`,
      borderRadius: '16px',
      padding: '24px',
      textAlign: 'center',
      flex: 1,
    }}
  >
    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px 0', fontWeight: '600' }}>{label}</p>
    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', margin: '0' }}>
      {value}
      {unit && <span style={{ fontSize: '14px', marginLeft: '4px', color: '#9ca3af' }}>{unit}</span>}
    </p>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🎁 КОМПОНЕНТ: ИНФОРМАЦИЯ ОБ АКТИВНОМ БОНУСЕ
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
      transition={{ delay: 0.4 }}
      style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))',
        border: '2px solid #fbbf2440',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ fontSize: '32px' }}>🎁</div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 4px 0' }}>
            Активный бонус
          </h3>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0' }}>
            Отыграйте требуемую сумму чтобы вывести выигрыш
          </p>
        </div>
      </div>

      {/* ИНФОРМАЦИЯ О БОНУСЕ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid #10b98140',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px 0' }}>Размер бонуса</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', margin: '0' }}>
            {granted.toFixed(2)} USDT
          </p>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid #3b82f640',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 4px 0' }}>Осталось отыграть</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', margin: '0' }}>
            {remaining.toFixed(2)} USDT
          </p>
        </div>
      </div>

      {/* ПРОГРЕСС-БАР С КРАСИВОЙ АНИМАЦИЕЙ */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0', fontWeight: '600' }}>
            Прогресс отыгрыша
          </p>
          <p style={{ fontSize: '12px', color: '#fbbf24', margin: '0', fontWeight: 'bold' }}>
            {progress.toFixed(0)}%
          </p>
        </div>

        {/* КРАСИВЫЙ ПРОГРЕСС-БАР */}
        <div style={{
          width: '100%',
          height: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          position: 'relative',
        }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* БЛЕСК ЭФФЕКТ */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                animation: 'shine 2s infinite',
              }}
            />
          </motion.div>
        </div>

        {/* ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0' }}>
            Отыграно: {wagered.toFixed(2)} / {required.toFixed(2)} USDT
          </p>
          <p style={{ fontSize: '10px', color: '#9ca3af', margin: '0' }}>
            10x от {granted.toFixed(2)} USDT
          </p>
        </div>
      </div>

      {/* ВРЕМЯ ДО ИСТЕЧЕНИЯ */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid #ef444440',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <Clock size={16} style={{ color: '#ef4444' }} />
        <p style={{ fontSize: '13px', color: '#ef4444', margin: '0', fontWeight: '600' }}>
          ⏰ Осталось {daysLeft} дн{daysLeft !== 1 ? '' : 'я'}
        </p>
      </div>

      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 ГЛАВНЫЙ КОМПОНЕНТ (ОБЛЕГЧЁННАЯ ВЕРСИЯ)
// ═══════════════════════════════════════════════════════════════════════════════

export function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [activeBonus, setActiveBonus] = useState<ActiveBonus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  const { data, loading: profileLoading, error: profileError, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  const { data: bonusData, execute: fetchActiveBonus } = useFetch('USER_GET_active_bonus', 'GET');

  const mainBg = '#0a0f1a';
  const accentColor = '#0ea5e9';
  const greenAccent = '#10b981';
  const redAccent = '#ef4444';

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('🔄 Загружаю профиль и активный бонус...');
      fetchProfile().catch((err: Error) => {
        console.error('❌ Profile error:', err.message);
        setError('Failed to load profile');
        setLoading(false);
      });
      fetchActiveBonus().catch((err: Error) => {
        console.warn('⚠️ No active bonus:', err.message);
      });
    }
  }, [fetchProfile, fetchActiveBonus]);

  // ✅ Обработка ответа профиля
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

  // ✅ Обработка ответа активного бонуса
  useEffect(() => {
    if (bonusData) {
      console.log('✅ Bonus data:', bonusData);
      
      if (bonusData.success && bonusData.data) {
        setActiveBonus(bonusData.data as ActiveBonus);
      } else if (bonusData.id) {
        setActiveBonus(bonusData as ActiveBonus);
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
      largestWin,
      photoUrl,
      createdAt,
      level,
      vipRank = 'bronze',
    } = profileData;

    const calculatedVipRank = vipRank || calculateVipRank(totalGames);
    const vipInfo = VIP_COLORS[calculatedVipRank] || VIP_COLORS.bronze;
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username;
    const lossCount = totalGames - winningBets;
    const safeLargestWin = largestWin ? toNumber(largestWin.amount) : 0;

    const getInitials = (fName: string, lName: string | null) => {
      const first = fName ? fName[0] : '';
      const last = lName ? lName[0] : '';
      return (first + last).toUpperCase().substring(0, 2) || username.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(firstName || "", lastName);
    const dateJoined = new Date(createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    return (
      <div style={{ backgroundColor: mainBg, minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
          
          {/* 🎪 ЗАГОЛОВОК И АВАТАР */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: `linear-gradient(135deg, ${vipInfo.bgGradient})`,
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '32px',
              border: `2px solid ${vipInfo.color}40`,
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
            }}
          >
            {/* АВАТАР */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: vipInfo.bgGradient,
                border: `3px solid ${vipInfo.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: `0 0 30px ${vipInfo.color}`,
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                right: '-8px',
                fontSize: '36px',
                background: mainBg,
                borderRadius: '50%',
                padding: '4px',
                border: `2px solid ${vipInfo.color}`,
              }}>
                {vipInfo.icon}
              </div>
            </motion.div>

            {/* ИНФОРМАЦИЯ */}
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px 0' }}>
                {fullName || username}
              </h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span style={{
                  background: vipInfo.bgGradient,
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}>
                  {vipInfo.icon} {vipInfo.name} • Уровень {level}
                </span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0' }}>
                📅 Игрок с {dateJoined}
              </p>
            </div>
          </motion.div>

          {/* 🎁 АКТИВНЫЙ БОНУС (ЕСЛИ ЕСТЬ) */}
          {activeBonus && (
            <BonusCard bonus={activeBonus} />
          )}

          {/* ОСНОВНЫЕ МЕТРИКИ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <MetricCard
              icon={<Trophy className="w-8 h-8" style={{ margin: '0 auto', color: accentColor }} />}
              label="Всего игр сыграно"
              value={totalGames > 0 ? totalGames.toLocaleString('ru-RU') : '0'}
              color={accentColor}
              delay={0.3}
            />
            {largestWin && safeLargestWin > 0 && (
              <MetricCard
                icon={<Flame className="w-8 h-8" style={{ margin: '0 auto', color: '#fbbf24' }} />}
                label="Максимальный выигрыш"
                value={safeLargestWin.toFixed(2)}
                unit="USDT"
                color="#fbbf24"
                delay={0.35}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOADING / ERROR STATES
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      backgroundColor: mainBg,
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {loading || profileLoading ? (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 className="w-12 h-12" style={{ color: accentColor }} />
          </motion.div>
          <p style={{ color: '#9ca3af' }}>Загрузка профиля...</p>
        </>
      ) : error ? (
        <>
          <p style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>❌ {error}</p>
          <Button onClick={() => window.location.reload()} style={{
            background: accentColor,
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}>
            Повторить
          </Button>
        </>
      ) : (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 className="w-12 h-12" style={{ color: accentColor }} />
          </motion.div>
          <p style={{ color: '#9ca3af' }}>Инициализация...</p>
        </>
      )}
    </div>
  );
}