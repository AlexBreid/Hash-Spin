import { useState, useEffect, useRef } from "react";
import { useFetch } from "../../hooks/useDynamicApi";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Loader2, User, Crown, BarChart2, Calendar, Star, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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

export function AccountPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  
  // ✅ Флаг чтобы загрузить только один раз
  const hasLoadedRef = useRef(false);

  const { data, loading, error, execute: fetchProfile } = useFetch('USER_GET_profile', 'GET');

  // Загружаем профиль ОДИН РАЗ при монтировании
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchProfile().catch(err => {
        console.error('Ошибка загрузки профиля:', err);
      });
    }
  }, []); // Пустой массив зависимостей - только один раз!

  // Обновляем profileData когда пришли данные
  useEffect(() => {
    if (data) {
      setProfileData(data as UserProfile);
    }
  }, [data]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  // *** РЕНДЕР ПРОФИЛЯ ***
  if (profileData) {
    const { username, firstName, lastName, vipLevel, level, totalScore, totalGames, createdAt, photoUrl } =
      profileData;

    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username;
    const levelProgress = Math.min((level % 10) * 10, 100);

    return (
      <div className="p-6 bg-background text-foreground min-h-screen flex flex-col items-center pt-10">
        <Card className="w-full max-w-md shadow-xl border rounded-2xl overflow-hidden">
          <CardHeader className="text-center bg-primary text-primary-foreground p-8">
            {photoUrl ? (
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                src={photoUrl}
                className="w-28 h-28 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-md"
                alt="User"
                style={{ display: 'block' }}
              />
            ) : (
              <User className="w-16 h-16 mx-auto mb-3" />
            )}

            <CardTitle className="text-3xl font-bold">{fullName}</CardTitle>
            <p className="text-sm opacity-90">@{username}</p>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* VIP LEVEL */}
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Crown style={{ width: '20px', height: '20px', color: '#fbbf24', marginRight: '12px' }} />
                <span style={{ fontWeight: '600', color: '#e5e7eb' }}>VIP уровень</span>
              </div>
              <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>{vipLevel || "Нет"}</span>
            </motion.div>

            {/* LEVEL */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <BarChart2 style={{ width: '20px', height: '20px', color: '#60a5fa', marginRight: '8px' }} />
                  <span style={{ fontWeight: '500', fontSize: '14px', color: '#e5e7eb' }}>Уровень</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#e5e7eb' }}>{level}</span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '12px', backgroundColor: '#374151', borderRadius: '9999px', overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', backgroundColor: '#3b82f6' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </motion.div>

            {/* TOTAL SCORE */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Star style={{ width: '20px', height: '20px', color: '#fbbf24', marginRight: '8px' }} />
                <span style={{ fontWeight: '500', color: '#e5e7eb' }}>Очки</span>
              </div>
              <span style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                {totalScore.toLocaleString("ru-RU")}
              </span>
            </motion.div>

            {/* TOTAL GAMES */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '20px', marginRight: '8px' }}>🎲</span>
                <span style={{ fontWeight: '500', color: '#e5e7eb' }}>Всего игр</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#e5e7eb' }}>{totalGames}</span>
            </motion.div>

            {/* CREATED AT */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#9ca3af', borderTop: '1px solid #374151', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Calendar style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                <span>Аккаунт создан:</span>
              </div>
              <span>{formatDate(createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* BUTTONS */}
        <div className="mt-8 w-full max-w-md space-y-4">
          <Button onClick={handleLogout} variant="destructive" className="w-full flex items-center gap-2">
            <LogOut className="w-5 h-5" /> Выйти
          </Button>
        </div>
      </div>
    );
  }

  // --- LOADING / ERROR ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      {loading && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Загрузка профиля...</p>
        </>
      )}

      {error && (
        <>
          <p className="text-red-600 mb-4 font-semibold">Ошибка: {error}</p>
          <Button 
            onClick={() => {
              hasLoadedRef.current = false;
              fetchProfile();
            }}
          >
            Повторить
          </Button>
        </>
      )}

      {!loading && !error && !profileData && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Инициализация...</p>
        </>
      )}
    </div>
  );
}