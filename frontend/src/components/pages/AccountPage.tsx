import { useState, useEffect, useRef } from "react";
import { useFetch } from "../../hooks/useDynamicApi";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2, User, Crown, BarChart2, Calendar, Star, LogOut, Send, Zap, Trophy, TrendingUp } from "lucide-react";
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
  vipRank?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  level: number;
  totalScore: number;
  totalGames: number;
  winRate?: number;
  totalWagered?: number;
  createdAt: string;
}

interface BalanceData {
  tokenId: number;
  symbol: string;
  amount: number;
  type: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ЦВЕТОВАЯ СХЕМА VIP СТАТУСОВ
// ═══════════════════════════════════════════════════════════════════════════════

const VIP_COLORS = {
  bronze: {
    name: 'Бронза',
    color: '#cd7f32',
    lightColor: 'rgba(205, 127, 50, 0.1)',
    bgGradient: 'linear-gradient(135deg, #8B4513, #CD7F32)',
    icon: '🥉',
    minGames: 0,
    maxGames: 49,
  },
  silver: {
    name: 'Серебро',
    color: '#c0c0c0',
    lightColor: 'rgba(192, 192, 192, 0.1)',
    bgGradient: 'linear-gradient(135deg, #708090, #C0C0C0)',
    icon: '🥈',
    minGames: 50,
    maxGames: 149,
  },
  gold: {
    name: 'Золото',
    color: '#ffd700',
    lightColor: 'rgba(255, 215, 0, 0.1)',
    bgGradient: 'linear-gradient(135deg, #DAA520, #FFD700)',
    icon: '🥇',
    minGames: 150,
    maxGames: 499,
  },
  platinum: {
    name: 'Платина',
    color: '#e5e4e2',
    lightColor: 'rgba(229, 228, 226, 0.1)',
    bgGradient: 'linear-gradient(135deg, #71797E, #E5E4E2)',
    icon: '💎',
    minGames: 500,
    maxGames: 1499,
  },
  diamond: {
    name: 'Бриллиант',
    color: '#00ffff',
    lightColor: 'rgba(0, 255, 255, 0.1)',
    bgGradient: 'linear-gradient(135deg, #00CED1, #00FFFF)',
    icon: '✨',
    minGames: 1500,
    maxGames: Infinity,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ФУНКЦИЯ: ОПРЕДЕЛИТЬ VIP РАНГ ПО КОЛИЧЕСТВУ ИГР
// ═══════════════════════════════════════════════════════════════════════════════

function calculateVipRank(totalGames: number): 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' {
  if (totalGames >= 1500) return 'diamond';
  if (totalGames >= 500) return 'platinum';
  if (totalGames >= 150) return 'gold';
  if (totalGames >= 50) return 'silver';
  return 'bronze';
}

/**
 * Получить прогресс до следующего ранга
 */
function getVipProgress(totalGames: number) {
  const ranks = [
    { rank: 'bronze' as const, min: 0, max: 49 },
    { rank: 'silver' as const, min: 50, max: 149 },
    { rank: 'gold' as const, min: 150, max: 499 },
    { rank: 'platinum' as const, min: 500, max: 1499 },
    { rank: 'diamond' as const, min: 1500, max: Infinity },
  ];

  const currentRank = ranks.find(r => totalGames >= r.min && totalGames <= r.max);
  const nextRank = ranks.find(r => r.min > totalGames);

  if (!currentRank) return { current: 'bronze' as const, next: 'silver' as const, progress: 0, gamesNeeded: 50 };

  if (currentRank.rank === 'diamond') {
    return { current: 'diamond' as const, next: null, progress: 100, gamesNeeded: 0 };
  }

  const gamesInCurrent = totalGames - currentRank.min;
  const gamesInCurrentRange = currentRank.max - currentRank.min + 1;
  const progress = Math.round((gamesInCurrent / gamesInCurrentRange) * 100);
  const gamesNeeded = nextRank ? nextRank.min - totalGames : 0;

  return {
    current: currentRank.rank,
    next: nextRank?.rank || null,
    progress,
    gamesNeeded,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 КОМПОНЕНТ СТРАНИЦЫ АККАУНТА
// ═══════════════════════════════════════════════════════════════════════════════

export function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [balances, setBalances] = useState<BalanceData[]>([]);

  const hasLoadedRef = useRef(false);

  const { data, loading, error, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  const { data: balanceData, execute: fetchBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 ЦВЕТОВАЯ ПАЛИТРА
  // ═══════════════════════════════════════════════════════════════════════════════
  const mainBg = '#0a0f1a';
  const cardBg = '#0d1425';
  const profileCardBg = 'linear-gradient(145deg, #0d1829, #0a0f1a)';
  const accentColor = '#0ea5e9';
  const greenAccent = '#10b981';
  const warningColor = '#f59e0b';

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchProfile().catch((err: Error) => console.error('❌ Ошибка профиля:', err.message));
      fetchBalance().catch((err: Error) => console.error('❌ Ошибка баланса:', err.message));
    }
  }, [fetchProfile, fetchBalance]);

  useEffect(() => {
    if (data) {
      setProfileData(data as UserProfile);
    }
  }, [data]);

  useEffect(() => {
    if (balanceData && balanceData.success && Array.isArray(balanceData.data)) {
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎯 РЕНДЕР ПРОФИЛЯ
  // ═══════════════════════════════════════════════════════════════════════════════

  if (profileData) {
    const { username, firstName, lastName, vipLevel, level, totalScore, totalGames, createdAt, photoUrl } = profileData;

    // 📊 ВЫЧИСЛЯЕМ ДИНАМИЧЕСКИ
    const vipRank = calculateVipRank(totalGames);
    const vipInfo = VIP_COLORS[vipRank];
    const vipProgress = getVipProgress(totalGames);

    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username;

    const getInitials = (fName: string, lName: string | null) => {
      const first = fName ? fName[0] : '';
      const last = lName ? lName[0] : '';
      return (first + last).toUpperCase().substring(0, 2) || username.substring(0, 2).toUpperCase();
    };

    const initials = getInitials(firstName || "", lastName);
    const dateJoined = new Date(createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

    // 📈 ВЫЧИСЛЯЕМ ДОПОЛНИТЕЛЬНУЮ СТАТИСТИКУ
    const winRate = totalGames > 0 ? Math.round((totalScore / (totalScore + Math.abs(Math.min(totalScore, 0)))) * 100) : 0;
    const avgBetSize = totalScore > 0 ? (totalScore / totalGames).toFixed(2) : '0.00';
    const daysActive = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));

    return (
      <div className="p-4 sm:p-6 text-foreground min-h-screen flex flex-col items-center pb-20" style={{ backgroundColor: mainBg }}>
        
        {/* 🎪 ГЛАВНАЯ КАРТОЧКА ПРОФИЛЯ */}
        <Card className="w-full max-w-2xl shadow-2xl border-none rounded-3xl overflow-hidden" style={{ backgroundColor: cardBg }}>
          
          {/* 🔝 ВЕРХНИЙ БЛОК С АВАТАРОМ И СТАТУСОМ */}
          <div style={{ padding: '32px 24px', background: profileCardBg }}>
            
            {/* Аватар и основная информация */}
            <div className="flex items-center space-x-6 mb-8">
              {/* 🖼️ Аватар */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 'bold',
                  color: '#fff',
                  background: vipInfo.bgGradient,
                  boxShadow: `0 0 20px ${vipInfo.color}`,
                  border: `3px solid ${vipInfo.color}`,
                  position: 'relative',
                  overflow: 'hidden',
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
                {/* VIP значок */}
                <div style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  fontSize: '28px',
                  background: mainBg,
                  borderRadius: '50%',
                  padding: '2px',
                  border: `2px solid ${vipInfo.color}`,
                }}>
                  {vipInfo.icon}
                </div>
              </motion.div>

              {/* Информация о пользователе */}
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-3xl font-extrabold mb-1" style={{ color: '#fff' }}>
                    {fullName || username}
                  </h1>
                  
                  {/* VIP Ранг */}
                  <div className="flex items-center space-x-2 mb-2">
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: vipInfo.bgGradient,
                      color: '#fff',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                    }}>
                      {vipInfo.icon} {vipInfo.name}
                    </span>
                  </div>

                  {/* Статус и дата */}
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    Игрок с {dateJoined} • {daysActive} дней активности
                  </p>
                </motion.div>
              </div>
            </div>

            {/* 📊 ПРОГРЕСС К СЛЕДУЮЩЕМУ РАНГУ */}
            {vipProgress.next && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '16px',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: '#e5e7eb' }}>
                    До {VIP_COLORS[vipProgress.next as keyof typeof VIP_COLORS].name}
                  </span>
                  <span className="text-xs font-bold" style={{ color: warningColor }}>
                    {vipProgress.gamesNeeded} игр
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vipProgress.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: vipInfo.bgGradient,
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </motion.div>
            )}

            {vipProgress.current === 'diamond' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{
                  background: 'rgba(0, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '16px',
                  textAlign: 'center',
                  color: '#00ffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}
              >
                🎉 Поздравляем! Вы достигли максимального ранга!
              </motion.div>
            )}

          </div>

          {/* 📊 СТАТИСТИКА */}

          <CardContent className="p-6">
            
            {/* Главные KPI */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              
              {/* 🎮 Игр сыграно */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                  background: 'linear-gradient(135deg, #0d2d3d, #0a1f2e)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(14, 165, 233, 0.2)',
                }}
              >
                <div className="flex items-center mb-2 text-sm" style={{ color: accentColor }}>
                  <Zap className="w-5 h-5 mr-2" />
                  Игр сыграно
                </div>
                <p className="text-3xl font-extrabold" style={{ color: '#fff' }}>
                  {totalGames.toLocaleString('ru-RU')}
                </p>
                <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                  {daysActive > 0 ? Math.round(totalGames / daysActive) : 0} в день
                </p>
              </motion.div>

              {/* 💰 Общий счёт */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  background: 'linear-gradient(135deg, #0d2d3d, #0a1f2e)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  border: `1px solid ${totalScore >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}
              >
                <div className="flex items-center mb-2 text-sm" style={{ color: totalScore >= 0 ? greenAccent : '#ef4444' }}>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Общий счёт
                </div>
                <p className="text-3xl font-extrabold" style={{ color: totalScore >= 0 ? greenAccent : '#ef4444' }}>
                  {totalScore.toFixed(2)} USDT
                </p>
                <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>
                  {totalGames > 0 ? (totalScore >= 0 ? '+' : '') + (totalScore / totalGames).toFixed(2) : '0.00'} за игру
                </p>
              </motion.div>

            </div>

            {/* Дополнительная статистика */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-3"
            >
              
              {/* Уровень */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>Уровень</div>
                <div className="text-2xl font-extrabold" style={{ color: accentColor }}>
                  {level}
                </div>
              </div>

              {/* Win Rate */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>Win Rate</div>
                <div className="text-2xl font-extrabold" style={{ color: '#10b981' }}>
                  {winRate}%
                </div>
              </div>

              {/* Макс Ставка */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
              }}>
                <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>Мах Ставка</div>
                <div className="text-2xl font-extrabold" style={{ color: warningColor }}>
                  {avgBetSize}
                </div>
              </div>

            </motion.div>

            {/* Баланс */}
            {balances.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div className="text-sm font-semibold mb-3" style={{ color: greenAccent }}>
                  💰 Доступный баланс
                </div>
                <div className="space-y-2">
                  {balances.map((balance, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span style={{ color: '#e5e7eb' }}>{balance.symbol}</span>
                      <span className="font-bold" style={{ color: '#fff' }}>
                        {typeof balance.amount === 'string' ? parseFloat(balance.amount).toFixed(8) : balance.amount.toFixed(8)} {balance.symbol}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </CardContent>

          {/* 🔘 КНОПКИ ДЕЙСТВИЙ */}

          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            gap: '12px',
            flexDirection: 'column',
          }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNavigateWithdraw}
              style={{
                width: '100%',
                padding: '12px',
                background: `linear-gradient(135deg, ${accentColor}, #06b6d4)`,
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              💸 Вывести средства
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🚪 Выход
            </motion.button>
          </div>

        </Card>

      </div>
    );
  }

  // 📍 LOADING / ERROR СОСТОЯНИЯ

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: mainBg }}>
      {loading && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12" style={{ color: accentColor }} />
          </motion.div>
          <p className="text-muted-foreground mt-4" style={{ color: '#9ca3af' }}>
            Загрузка профиля...
          </p>
        </>
      )}

      {error && (
        <>
          <p className="text-red-600 mb-4 font-semibold">❌ Ошибка: {error}</p>
          <Button 
            onClick={() => {
              hasLoadedRef.current = false;
              fetchProfile().catch((err: Error) => console.error('Fetch error:', err));
              fetchBalance().catch((err: Error) => console.error('Balance error:', err));
            }}
            style={{ background: accentColor, color: '#fff' }}
          >
            Повторить
          </Button>
        </>
      )}

      {!loading && !error && !profileData && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-12 h-12" style={{ color: accentColor }} />
          </motion.div>
          <p className="text-muted-foreground mt-4" style={{ color: '#9ca3af' }}>
            Инициализация...
          </p>
        </>
      )}
    </div>
  );
}