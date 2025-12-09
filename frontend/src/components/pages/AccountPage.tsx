import { useState, useEffect, useRef } from "react";
import { useFetch } from "../../hooks/useDynamicApi";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  Trophy,
  Flame,
  Percent,
  Clock,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ИНТЕРФЕЙСЫ
// ═══════════════════════════════════════════════════════════════════════════════

interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  vipLevel: string;
  vipRank?: string;
  level: number;
  totalScore: number;
  totalGames: number;
  winningBets: number;
  winRate?: number;
  totalWagered?: number;
  roi?: number;
  daysActive?: number;
  gamesPerDay?: number;
  avgBetSize?: number;
  largestWin?: {
    amount: number;
    gameType: string;
    date: string;
  };
  gameStats?: Record<string, any>;
  createdAt: string;
}

interface BalanceData {
  tokenId: number;
  symbol: string;
  amount: number | string;
  type: string;
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

function calculateVipRank(totalGames: number): string {
  if (totalGames >= 1500) return 'diamond';
  if (totalGames >= 500) return 'platinum';
  if (totalGames >= 150) return 'gold';
  if (totalGames >= 50) return 'silver';
  return 'bronze';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ЦВЕТОВАЯ СХЕМА VIP СТАТУСОВ
// ═══════════════════════════════════════════════════════════════════════════════

const VIP_COLORS: Record<string, any> = {
  bronze: {
    name: 'Бронза',
    color: '#cd7f32',
    bgGradient: 'linear-gradient(135deg, #8B4513, #CD7F32)',
    icon: '🥉',
  },
  silver: {
    name: 'Серебро',
    color: '#c0c0c0',
    bgGradient: 'linear-gradient(135deg, #708090, #C0C0C0)',
    icon: '🥈',
  },
  gold: {
    name: 'Золото',
    color: '#ffd700',
    bgGradient: 'linear-gradient(135deg, #DAA520, #FFD700)',
    icon: '🥇',
  },
  platinum: {
    name: 'Платина',
    color: '#e5e4e2',
    bgGradient: 'linear-gradient(135deg, #71797E, #E5E4E2)',
    icon: '💎',
  },
  diamond: {
    name: 'Бриллиант',
    color: '#00ffff',
    bgGradient: 'linear-gradient(135deg, #00CED1, #00FFFF)',
    icon: '✨',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 КОМПОНЕНТ: StatBox
// ═══════════════════════════════════════════════════════════════════════════════

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  delay?: number;
}

const StatBox = ({ icon, label, value, unit = '', color = '#0ea5e9', delay = 0 }: StatBoxProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{
      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(6, 182, 212, 0.05))',
      border: `1px solid ${color}40`,
      borderRadius: '12px',
      padding: '16px',
      flex: 1,
      minWidth: '120px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600' }}>{label}</span>
      <div style={{ color, opacity: 0.7 }}>{icon}</div>
    </div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
      {value}
      {unit && <span style={{ fontSize: '12px', marginLeft: '4px', color: '#9ca3af' }}>{unit}</span>}
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);

  const { data, loading: profileLoading, error: profileError, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  const { data: balanceData, execute: fetchBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 ЦВЕТА
  // ═══════════════════════════════════════════════════════════════════════════════

  const mainBg = '#0a0f1a';
  const accentColor = '#0ea5e9';
  const greenAccent = '#10b981';
  const redAccent = '#ef4444';

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('🔄 Начинаю загрузку...');
      fetchProfile().catch((err: Error) => {
        console.error('❌ Profile error:', err.message);
        setError('Failed to load profile');
        setLoading(false);
      });
      fetchBalance().catch((err: Error) => console.error('❌ Balance error:', err.message));
    }
  }, [fetchProfile, fetchBalance]);

  // ✅ ИСПРАВЛЕНИЕ: Обработка разных форматов ответа API
  useEffect(() => {
    console.log('📊 useEffect data изменился:', data);
    
    if (data) {
      console.log('📦 data объект:', data);
      
      // ✅ Проверяем разные форматы ответа
      
      if (data.success && data.data && typeof data.data === 'object') {
        // Формат 1: {success: true, data: {...}}
        console.log('✅ Формат 1: Профиль загружен успешно:', data.data);
        setProfileData(data.data as UserProfile);
        setError(null);
        setLoading(false);
      } else if (data.id && data.username) {
        // Формат 2: Данные приходят напрямую {id, username, ...}
        console.log('✅ Формат 2: Профиль загружен напрямую:', data);
        setProfileData(data as UserProfile);
        setError(null);
        setLoading(false);
      } else if (data.data && typeof data.data === 'object') {
        // Формат 3: Есть data, но нет success флага
        console.log('✅ Формат 3: Профиль загружен (без success):', data.data);
        setProfileData(data.data as UserProfile);
        setError(null);
        setLoading(false);
      } else {
        console.warn('⚠️ Неизвестный формат ответа:', data);
      }
    }
  }, [data]);

  // ✅ Обработка ошибок профиля
  useEffect(() => {
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      setError(profileError);
      setLoading(false);
    }
  }, [profileError]);

  // ✅ Обработка ответа баланса
  useEffect(() => {
    if (balanceData && balanceData.success && Array.isArray(balanceData.data)) {
      console.log('✅ Balance data loaded:', balanceData.data);
      setBalances(balanceData.data);
    }
  }, [balanceData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigateWithdraw = () => {
    navigate("/withdraw");
  };

  const handleRetry = () => {
    console.log('🔄 Повторная загрузка...');
    setLoading(true);
    setError(null);
    hasLoadedRef.current = false;
    fetchProfile().catch((err: Error) => {
      console.error('❌ Retry error:', err.message);
      setError('Failed to load profile');
      setLoading(false);
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎯 РЕНДЕР
  // ═══════════════════════════════════════════════════════════════════════════════

  if (profileData) {
    const {
      username,
      firstName,
      lastName,
      totalScore,
      totalGames,
      winningBets,
      winRate = 0,
      roi = 0,
      daysActive = 1,
      gamesPerDay = 0,
      avgBetSize = 0,
      largestWin,
      gameStats = {},
      photoUrl,
      createdAt,
      level,
      vipRank = 'bronze',
    } = profileData;

    const calculatedVipRank = vipRank || calculateVipRank(totalGames);
    const vipInfo = VIP_COLORS[calculatedVipRank] || VIP_COLORS.bronze;
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username;

    const getInitials = (fName: string, lName: string | null) => {
      const first = fName ? fName[0] : '';
      const last = lName ? lName[0] : '';
      return (first + last).toUpperCase().substring(0, 2) || username.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(firstName || "", lastName);
    const dateJoined = new Date(createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    const lossCount = totalGames - winningBets;

    // Безопасное преобразование всех числовых значений
    const safeRoi = toNumber(roi);
    const safeWinRate = toNumber(winRate);
    const safeAvgBetSize = toNumber(avgBetSize);
    const safeGamesPerDay = toNumber(gamesPerDay);
    const safeTotalScore = toNumber(totalScore);
    const safeLargestWin = largestWin ? toNumber(largestWin.amount) : 0;

    return (
      <div style={{ backgroundColor: mainBg, minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
          
          {/* 🎪 ШАПКА ПРОФИЛЯ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              background: `linear-gradient(135deg, ${vipInfo.bgGradient})`,
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '24px',
              border: `2px solid ${vipInfo.color}40`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              {/* АВАТАР */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: vipInfo.bgGradient,
                  border: `3px solid ${vipInfo.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  fontWeight: 'bold',
                  color: '#fff',
                  boxShadow: `0 0 20px ${vipInfo.color}`,
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="User"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  initials
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    right: '-8px',
                    fontSize: '32px',
                    background: mainBg,
                    borderRadius: '50%',
                    padding: '4px',
                    border: `2px solid ${vipInfo.color}`,
                  }}
                >
                  {vipInfo.icon}
                </div>
              </motion.div>

              {/* ИНФОРМАЦИЯ */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', margin: '0 0 8px 0' }}>
                  {fullName || username}
                </h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: vipInfo.bgGradient,
                      color: '#fff',
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}
                  >
                    {vipInfo.icon} {vipInfo.name}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                    Уровень {level}
                  </span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0' }}>
                  Игрок с {dateJoined} • {daysActive} дней активности
                </p>
              </div>

              {/* КНОПКИ */}
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNavigateWithdraw}
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, #06b6d4)`,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  💸 Вывести
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  🚪 Выход
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* СТРОКА 1: ОСНОВНЫЕ МЕТРИКИ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <StatBox
              icon={<Trophy className="w-5 h-5" />}
              label="Всего игр"
              value={totalGames.toLocaleString('ru-RU')}
              color={accentColor}
              delay={0.3}
            />
            <StatBox
              icon={<TrendingUp className="w-5 h-5" />}
              label="Выигрышей"
              value={winningBets}
              color={greenAccent}
              delay={0.35}
            />
            <StatBox
              icon={<TrendingDown className="w-5 h-5" />}
              label="Проигрышей"
              value={lossCount}
              color={redAccent}
              delay={0.4}
            />
            <StatBox
              icon={<Percent className="w-5 h-5" />}
              label="Win Rate"
              value={safeWinRate}
              unit="%"
              color={greenAccent}
              delay={0.45}
            />
          </div>

          {/* СТРОКА 2: ФИНАНСОВЫЕ МЕТРИКИ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <StatBox
              icon={<DollarSign className="w-5 h-5" />}
              label="Общий счёт"
              value={`${safeTotalScore >= 0 ? '+' : ''}${safeTotalScore.toFixed(2)}`}
              unit="USDT"
              color={safeTotalScore >= 0 ? greenAccent : redAccent}
              delay={0.5}
            />
            <StatBox
              icon={<BarChart3 className="w-5 h-5" />}
              label="ROI"
              value={safeRoi.toFixed(1)}
              unit="%"
              color={safeRoi >= 0 ? greenAccent : redAccent}
              delay={0.55}
            />
            <StatBox
              icon={<Zap className="w-5 h-5" />}
              label="Средняя ставка"
              value={safeAvgBetSize.toFixed(2)}
              unit="USDT"
              color={accentColor}
              delay={0.6}
            />
            <StatBox
              icon={<Clock className="w-5 h-5" />}
              label="Игр в день"
              value={safeGamesPerDay}
              color={accentColor}
              delay={0.65}
            />
          </div>

          {/* СТРОКА 3: ЛУЧШИЙ РЕЗУЛЬТАТ */}
          {largestWin && safeLargestWin > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <StatBox
                icon={<Flame className="w-5 h-5" />}
                label="Самый большой выигрыш"
                value={safeLargestWin.toFixed(2)}
                unit={`USDT (${largestWin.gameType})`}
                color="#fbbf24"
                delay={0.7}
              />
            </div>
          )}

          {/* СТАТИСТИКА ПО ТИПАМ ИГР */}
          {Object.keys(gameStats).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              style={{
                background: `linear-gradient(135deg, rgba(14, 165, 233, 0.05), rgba(6, 182, 212, 0.02))`,
                border: '1px solid rgba(14, 165, 233, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                📊 Статистика по играм
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {Object.entries(gameStats).map(([gameType, stats]: [string, any], idx) => {
                  const count = toNumber(stats.count);
                  const totalBet = toNumber(stats.totalBet);
                  const totalProfit = toNumber(stats.totalProfit);
                  const avgProfit = toNumber(stats.avgProfit);

                  return (
                    <motion.div
                      key={gameType}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + idx * 0.05 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(14, 165, 233, 0.1)',
                      }}
                    >
                      <h4 style={{ color: accentColor, fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px 0', textTransform: 'capitalize' }}>
                        {gameType}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#9ca3af' }}>Игр:</span>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{count}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#9ca3af' }}>Всего ставок:</span>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{totalBet.toFixed(2)} USDT</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#9ca3af' }}>Профит:</span>
                          <span style={{ color: totalProfit >= 0 ? greenAccent : redAccent, fontWeight: 'bold' }}>
                            {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} USDT
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#9ca3af' }}>Средн. ставка:</span>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{avgProfit.toFixed(2)} USDT</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* БАЛАНС */}
          {balances.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              style={{
                background: `linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))`,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '16px',
                padding: '24px',
              }}
            >
              <h3 style={{ color: greenAccent, fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                💰 Доступный баланс
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                {balances.map((balance, idx) => {
                  const amount = toNumber(balance.amount);
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                        {balance.symbol}
                      </div>
                      <div style={{ color: greenAccent, fontSize: '20px', fontWeight: 'bold' }}>
                        {amount.toFixed(8)}
                      </div>
                    </div>
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
      style={{
        backgroundColor: mainBg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {loading || profileLoading ? (
        <>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Loader2 className="w-12 h-12" style={{ color: accentColor }} />
          </motion.div>
          <p style={{ color: '#9ca3af' }}>Загрузка профиля...</p>
        </>
      ) : error ? (
        <>
          <p style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center' }}>❌ Ошибка: {error}</p>
          <Button
            onClick={handleRetry}
            style={{
              background: accentColor,
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
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