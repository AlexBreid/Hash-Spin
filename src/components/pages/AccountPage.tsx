import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://bullheadedly-mobilizable-paulene.ngrok-free.dev'; // ← без пробелов!

export function AccountPage() {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [rawData, setRawData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setDebugInfo('🔍 Начинаю загрузку профиля...');

      const token = localStorage.getItem('casino_jwt_token');Ы
      if (!token) {
        setDebugInfo('❌ Токен отсутствует. Перенаправление на /login...');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      setDebugInfo(`📡 Отправляю запрос к: ${API_BASE_URL}/api/v1/user/profile`);

      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });

        setRawData(response.data);
        setDebugInfo('✅ Успех! Данные получены. Рендерим профиль...');
        // Если дойдём сюда — значит, данные есть → можно рендерить
      } catch (err: any) {
        let msg = '💥 Ошибка при запросе:\n';
        if (err.code === 'ECONNABORTED') {
          msg += 'Таймаут запроса (сервер не ответил за 10 сек)';
        } else if (err.response) {
          msg += `Статус: ${err.response.status}\n`;
          msg += `Ответ: ${JSON.stringify(err.response.data, null, 2)}`;
        } else if (err.request) {
          msg += 'Нет ответа от сервера (возможно, CORS или ngrok недоступен)';
        } else {
          msg += err.message || String(err);
        }
        setDebugInfo(msg);
        console.error(err);
      }
    };

    fetchData();
  }, [navigate]);

  // ПОКА НЕ БУДЕМ РЕНДЕРИТЬ ПРОФИЛЬ — СНАЧАЛА УБЕДИМСЯ, ЧТО ВСЁ РАБОТАЕТ
  if (rawData) {
    return (
      <div className="p-4 bg-background text-foreground min-h-screen">
        <h2 className="text-2xl font-bold mb-4">✅ Профиль загружен!</h2>
        <pre className="bg-card p-4 rounded text-sm overflow-auto">
          {JSON.stringify(rawData, null, 2)}
        </pre>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Обновить
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-foreground">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-center text-muted-foreground whitespace-pre-wrap">
        {debugInfo}
      </p>
      <Button
        onClick={() => window.location.reload()}
        className="mt-6"
        variant="outline"
      >
        Повторить
      </Button>
    </div>
  );
}