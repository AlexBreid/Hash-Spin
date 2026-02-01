import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ServerCrash, RefreshCw, Wrench, Clock, Wifi, WifiOff } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ЦВЕТОВАЯ ПАЛИТРА
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: '#0a0a0f',
  card: '#12121a',
  primary: '#8b5cf6',
  accent: '#a855f7',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  muted: '#27272a',
  border: '#3f3f46',
  foreground: '#fafafa',
  mutedForeground: '#a1a1aa',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

interface ServerErrorPageProps {
  onRetry: () => void;
  errorMessage?: string;
}

export function ServerErrorPage({ onRetry, errorMessage }: ServerErrorPageProps) {
  const [retrying, setRetrying] = useState(false);
  const [dots, setDots] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  // Анимация точек
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Автоматический повтор
  useEffect(() => {
    if (!autoRetryEnabled) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          handleRetry();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRetryEnabled]);

  const handleRetry = async () => {
    setRetrying(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onRetry();
    setRetrying(false);
    setCountdown(30);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6"
      style={{
        background: `
          radial-gradient(circle at 20% 20%, ${COLORS.primary}15 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, ${COLORS.error}10 0%, transparent 40%),
          linear-gradient(180deg, ${COLORS.background} 0%, #050508 100%)
        `,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* ИКОНКА */}
        <motion.div
          className="flex justify-center mb-8"
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${COLORS.error}20, ${COLORS.warning}20)`,
              boxShadow: `0 0 60px ${COLORS.error}30, inset 0 0 30px ${COLORS.error}10`,
            }}
          >
            {/* Пульсирующий круг */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${COLORS.error}40` }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ServerCrash size={56} style={{ color: COLORS.error }} />
            </motion.div>
          </div>
        </motion.div>

        {/* ЗАГОЛОВОК */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h1
            className="text-3xl font-bold mb-3"
            style={{ 
              color: COLORS.foreground,
              textShadow: `0 0 30px ${COLORS.primary}50`
            }}
          >
            Технические работы
          </h1>
          <p style={{ color: COLORS.mutedForeground }} className="text-lg">
            Сервер временно недоступен
          </p>
        </motion.div>

        {/* КАРТОЧКА ИНФОРМАЦИИ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6 mb-6"
          style={{
            background: `linear-gradient(135deg, ${COLORS.card}, ${COLORS.muted}50)`,
            border: `1px solid ${COLORS.border}`,
            boxShadow: `0 20px 40px ${COLORS.background}80`,
          }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${COLORS.warning}20` }}
            >
              <Wrench size={24} style={{ color: COLORS.warning }} />
            </div>
            <div>
              <h3 style={{ color: COLORS.foreground }} className="font-semibold mb-1">
                Что происходит?
              </h3>
              <p style={{ color: COLORS.mutedForeground }} className="text-sm">
                Мы проводим плановое обслуживание для улучшения качества сервиса. 
                Это займёт несколько минут.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${COLORS.success}20` }}
            >
              <Clock size={24} style={{ color: COLORS.success }} />
            </div>
            <div>
              <h3 style={{ color: COLORS.foreground }} className="font-semibold mb-1">
                Когда заработает?
              </h3>
              <p style={{ color: COLORS.mutedForeground }} className="text-sm">
                Обычно работы занимают от 1 до 15 минут. 
                Страница автоматически обновится.
              </p>
            </div>
          </div>
        </motion.div>

        {/* СТАТУС ПОДКЛЮЧЕНИЯ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl p-4 mb-6 flex items-center justify-between"
          style={{
            background: `${COLORS.error}10`,
            border: `1px solid ${COLORS.error}30`,
          }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <WifiOff size={20} style={{ color: COLORS.error }} />
            </motion.div>
            <span style={{ color: COLORS.error }} className="font-medium">
              Нет подключения к серверу{dots}
            </span>
          </div>
        </motion.div>

        {/* КНОПКА ПОВТОРА */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRetry}
          disabled={retrying}
          className="w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all"
          style={{
            background: retrying 
              ? COLORS.muted 
              : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            color: 'white',
            boxShadow: retrying ? 'none' : `0 10px 30px ${COLORS.primary}40`,
          }}
        >
          <RefreshCw 
            size={22} 
            className={retrying ? 'animate-spin' : ''} 
          />
          {retrying ? 'Проверка подключения...' : 'Попробовать снова'}
        </motion.button>

        {/* АВТОПОВТОР */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-center"
        >
          <button
            onClick={() => setAutoRetryEnabled(!autoRetryEnabled)}
            className="text-sm transition-colors"
            style={{ color: COLORS.mutedForeground }}
          >
            {autoRetryEnabled ? (
              <span className="flex items-center justify-center gap-2">
                <Wifi size={14} style={{ color: COLORS.success }} />
                Автоповтор через <span style={{ color: COLORS.primary }} className="font-bold">{countdown}</span> сек
              </span>
            ) : (
              <span>Включить автоповтор</span>
            )}
          </button>
        </motion.div>

        {/* ФУТЕР */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-center"
        >
          <p style={{ color: COLORS.mutedForeground }} className="text-xs">
            Приносим извинения за неудобства 💜
          </p>
          {errorMessage && (
            <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-2 opacity-50">
              {errorMessage}
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default ServerErrorPage;







