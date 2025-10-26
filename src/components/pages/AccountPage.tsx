import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Star, TrendingUp, Clock, Trophy, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------
// КОНФИГУРАЦИЯ — ИСПРАВЛЕНО: убраны пробелы в конце URL!
// ---------------------------------------------------------------------
const API_BASE_URL = 'https://bullheadedly-mobilizable-paulene.ngrok-free.dev';

// ---------------------------------------------------------------------
// ИНТЕРФЕЙС ДАННЫХ
// ---------------------------------------------------------------------
interface UserData {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  vipLevel: string;
  level: number;
  totalScore: number;
  totalGames: number;
  createdAt: string;
}

const initialUserData: UserData = {
  id: '0',
  username: 'loading',
  firstName: 'Загрузка',
  lastName: null,
  photoUrl: null,
  vipLevel: '—',
  level: 0,
  totalScore: 0,
  totalGames: 0,
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------
// ХУК ДЛЯ ЗАГРУЗКИ ДАННЫХ ПРОФИЛЯ
// ---------------------------------------------------------------------
function useUserData() {
  const [data, setData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('casino_jwt_token');

      if (!token) {
        setError('Требуется авторизация.');
        setIsLoading(false);
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get<UserData>(
          `${API_BASE_URL}/api/v1/user/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log('✅ Fetched user data:', response.data);
        setData(response.data);
      } catch (err) {
        console.error('❌ Failed to fetch user data:', err);
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          localStorage.removeItem('casino_jwt_token');
          navigate('/login');
          setError('Сессия истекла. Войдите снова. (Код 401)');
        } else if (axios.isAxiosError(err)) {
          const status = err.response?.status ? ` (Status: ${err.response.status})` : '';
          const responseData = err.response?.data ? JSON.stringify(err.response.data) : 'Нет данных ответа';
          const message = err.response?.data?.error || err.message;

          setError(
            `[API ОШИБКА] Не удалось получить данные профиля${status}:\n` +
            `Сообщение: ${message}\n` +
            `Ответ сервера: ${responseData}`
          );
        } else {
          setError(`[СЕТЕВАЯ ОШИБКА] ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  return { data, isLoading, error };
}

// ---------------------------------------------------------------------
// КОМПОНЕНТ ACCOUNT PAGE — С ЗАЩИТОЙ ОТ ПАДЕНИЙ
// ---------------------------------------------------------------------
export function AccountPage() {
  const { data, isLoading, error } = useUserData();

  // Если ошибка — показываем только экран ошибки
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-red-500 p-4 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">
          ❌ ОШИБКА ЗАГРУЗКИ ПРОФИЛЯ
        </h1>
        <Card className="p-4 bg-red-900/20 border-red-500/50 max-w-lg w-full">
          <p className="text-red-300 font-medium mb-2">Детали ошибки:</p>
          <pre className="text-xs text-left whitespace-pre-wrap break-all text-red-100 bg-red-900/50 p-3 rounded-lg border border-red-500/20 overflow-auto max-h-64">
            {error}
          </pre>
        </Card>
        <Button
          onClick={() => window.location.reload()}
          className="mt-6 bg-red-500 hover:bg-red-600"
        >
          Повторить попытку
        </Button>
      </div>
    );
  }

  // Используем initialUserData, пока данные не загружены
  const user = data || initialUserData;

  // Безопасное получение инициалов
  const getAvatarFallback = (name: string | null) => {
    if (!name || name.trim().length === 0) return '??';
    const trimmedName = name.trim();
    const parts = trimmedName.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmedName.substring(0, 2).toUpperCase();
  };

  const displayName = user.firstName || user.username || 'Неизвестный игрок';

  // 🔒 Безопасная обработка даты
  const registrationDate = (() => {
    if (!user.createdAt) return '—';
    const date = new Date(user.createdAt);
    return isNaN(date.getTime())
      ? '—'
      : date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  })();

  // 🔒 Безопасная обработка числа totalScore
  const formattedTotalScore =
    typeof user.totalScore === 'number' && !isNaN(user.totalScore)
      ? user.totalScore.toLocaleString('ru-RU', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—';

  return (
    <div className="pb-24 pt-6 px-4">
      {isLoading && (
        <div className="flex justify-center mb-6">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      <Card className="p-6 mb-6 bg-gradient-to-br from-card to-card/50 border-primary/20">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="w-20 h-20 border-2 border-primary">
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-bold">
              {getAvatarFallback(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">
              {isLoading ? 'Загрузка...' : displayName}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <Star className="w-4 h-4 text-accent" />
              <p className="text-accent font-medium">
                {isLoading ? '—' : user.vipLevel} статус
              </p>
            </div>
            <p className="text-muted-foreground text-sm">
              Игрок с {registrationDate}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl p-5 mb-6 border border-primary/20">
          <div className="flex items-center space-x-3 mb-3">
            <Trophy className="w-6 h-6 text-primary" />
            <span className="text-muted-foreground">Уровень игрока</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {isLoading ? '—' : user.level}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button className="bg-accent hover:bg-accent/90 py-3 rounded-2xl font-semibold transition-all duration-300">
            Достижения
          </Button>
          <Button
            variant="outline"
            className="py-3 rounded-2xl font-semibold border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Рейтинг
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">Общий счёт (Net)</span>
          </div>
          <p className="text-xl font-bold text-success">
            {isLoading ? '—' : formattedTotalScore}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-sm text-muted-foreground">Игр сыграно</span>
          </div>
          <p className="text-xl font-bold text-accent">
            {isLoading ? '—' : user.totalGames.toLocaleString()}
          </p>
        </Card>
      </div>
    </div>
  );
}