
import { useState, useEffect, useRef } from "react";
import { useFetch } from "../../hooks/useDynamicApi";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2, User, Crown, BarChart2, Calendar, Star, LogOut, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// --- ИНТЕРФЕЙСЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ ---
interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  vipLevel: string;
  level: number;
  totalScore: number;
  totalGames: number;
  createdAt: string;
}

interface BalanceData {
  tokenId: number;
  symbol: string;
  amount: number;
  type: string;
}
// ------------------------------------------

export function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [balances, setBalances] = useState<BalanceData[]>([]);

  const hasLoadedRef = useRef(false);

  const { data, loading, error, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');
  const { data: balanceData, execute: fetchBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  // =======================================================
  // 💡 ИСПРАВЛЕНИЕ: Переменные стилей вынесены в начало
  // =======================================================
  const mainBg = '#0b1320';
  const cardBg = '#141c2c';
  const profileCardBg = 'linear-gradient(145deg, #1b273d, #0d1624)';
  const levelBoxBg = 'linear-gradient(135deg, #2a4060, #1a2a40)';
  const levelBorder = 'linear-gradient(90deg, #10b981, #3b82f6)';
  const achievementButtonBg = '#10b981';
  const ratingButtonBg = '#374151';
  const statBoxBg = '#103030';
  // =======================================================


  // 🔄 Загружаем профиль и баланс ОДИН РАЗ при монтировании
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchProfile().catch(err => console.error('❌ Ошибка профиля:', err));
      fetchBalance().catch(err => console.error('❌ Ошибка баланса:', err));
    }
  }, []);

  // 📊 Обновляем данные профиля
  useEffect(() => {
    if (data) {
      setProfileData(data as UserProfile);
    }
  }, [data]);

  // 💰 Обновляем баланс
  useEffect(() => {
    if (balanceData && balanceData.success && Array.isArray(balanceData.data)) {
      console.log('✅ Баланс загружен:', balanceData.data);
      setBalances(balanceData.data);
    }
  }, [balanceData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // 💳 Перейти на страницу вывода
  const handleNavigateWithdraw = () => {
    navigate("/withdraw");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
    });

  // *** РЕНДЕР ПРОФИЛЯ ***
  if (profileData) {
    const { username, firstName, lastName, vipLevel, level, totalScore, totalGames, createdAt, photoUrl } =
      profileData;

    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username;

    // Эмуляция инициалов (АИ) для заглушки
    const getInitials = (fName: string, lName: string | null) => {
        const first = fName ? fName[0] : '';
        const last = lName ? lName[0] : '';
        return (first + last).toUpperCase().substring(0, 2) || username.substring(0, 2).toUpperCase();
    };
    const initials = getInitials(firstName || "", lastName);
    const dateJoined = new Date(createdAt).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    
    return (
      <div className="p-4 sm:p-6 text-foreground min-h-screen flex flex-col items-center" style={{ backgroundColor: mainBg }}>
        <Card className="w-full max-w-md shadow-2xl border-none rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
          
          {/* Блок Профиля и Уровня */}
          <div style={{ padding: '24px', background: profileCardBg }}>
            
            {/* Аватар, Имя, Статус */}
            <div className="flex items-center space-x-4 mb-6">
                <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#fff',
                    background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                }}>
                    {photoUrl ? (
                        <motion.img
                            src={photoUrl}
                            className="w-full h-full rounded-full object-cover"
                            alt="User"
                        />
                    ) : initials}
                </div>
                <div>
                    <CardTitle className="text-xl font-bold" style={{ color: '#fff' }}>
                        {fullName || username}
                    </CardTitle>
                    <div className="flex items-center text-sm mt-1" style={{ color: '#fcd34d' }}>
                        <Star className="w-4 h-4 mr-1" />
                        <span>{vipLevel || "Нет"} статус</span>
                    </div>
                    <p className="text-xs" style={{ color: '#9ca3af' }}>
                        Игрок с {dateJoined}
                    </p>
                </div>
            </div>

            {/* Уровень игрока (Большой центральный блок) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                background: levelBoxBg,
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                border: '2px solid transparent',
                backgroundImage: `${levelBorder}, ${levelBoxBg}`,
                backgroundClip: 'padding-box, border-box',
                backgroundOrigin: 'border-box',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: '#e5e7eb' }}>
                <Crown className="w-4 h-4 inline-block mr-1 text-yellow-400" /> Уровень игрока
              </p>
              <div className="text-6xl font-extrabold" style={{ color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {level}
              </div>
            </motion.div>
            
          </div>

          {/* Нижние статистические карточки */}
          <CardContent className="p-4 sm:p-6 pt-4 grid grid-cols-2 gap-4">
            
            {/* Общий счёт */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: statBoxBg,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div className="flex items-center mb-1 text-sm" style={{ color: '#10b981' }}>
                <BarChart2 className="w-4 h-4 mr-1" />
                Общий счёт
              </div>
              <p className="text-3xl font-extrabold" style={{ color: '#fff' }}>
                {totalScore.toLocaleString("ru-RU")}
              </p>
            </motion.div>

            {/* Игр сыграно */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                background: statBoxBg,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div className="flex items-center mb-1 text-sm" style={{ color: '#60a5fa' }}>
                <Calendar className="w-4 h-4 mr-1" />
                Игр сыграно
              </div>
              <p className="text-3xl font-extrabold" style={{ color: '#fff' }}>
                {totalGames}
              </p>
            </motion.div>

          </CardContent>
        </Card>
      </div>
    );
  }

  // --- LOADING / ERROR (Используют mainBg, который теперь доступен) ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ backgroundColor: mainBg }}>
      {loading && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" style={{ color: '#3b82f6' }} />
          <p className="text-muted-foreground" style={{ color: '#9ca3af' }}>Загрузка профиля...</p>
        </>
      )}

      {error && (
        <>
          <p className="text-red-600 mb-4 font-semibold">Ошибка: {error}</p>
          <Button 
            onClick={() => {
              hasLoadedRef.current = false;
              fetchProfile();
              fetchBalance();
            }}
          >
            Повторить
          </Button>
        </>
      )}

      {!loading && !error && !profileData && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" style={{ color: '#3b82f6' }} />
          <p className="text-muted-foreground" style={{ color: '#9ca3af' }}>Инициализация...</p>
        </>
      )}
    </div>
  );
}