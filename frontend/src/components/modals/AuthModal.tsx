import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageCircle, 
  User, 
  Lock, 
  ArrowRight,
  Loader2,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TELEGRAM_BOT_URL = 'https://t.me/SafariXCasinoBot';

const COLORS = {
  background: '#0a0e1a',
  card: '#111827',
  primary: '#3b82f6',
  success: '#10b981',
  accent: '#8b5cf6',
  foreground: '#f9fafb',
  mutedForeground: '#9ca3af',
  border: '#1f2937',
  telegram: '#0088cc',
};

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'choice' | 'login'>('choice');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTelegramAuth = () => {
    // Открываем Telegram бота для регистрации/авторизации
    window.open(TELEGRAM_BOT_URL, '_blank');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Введите логин и пароль');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/login-with-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token && data.user) {
        // Сохраняем токен и пользователя
        localStorage.setItem('casino_jwt_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        onLoginSuccess();
        onClose();
      } else {
        setError(data.error || 'Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setMode('choice');
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ backgroundColor: COLORS.card }}
        >
          {/* Декоративное свечение */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-purple-500/20 to-transparent blur-3xl pointer-events-none" />

          {/* Кнопка закрытия */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: COLORS.mutedForeground }} />
          </button>

          <div className="relative p-6">
            {/* Заголовок */}
            <div className="text-center mb-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>

              <h2 style={{ color: COLORS.foreground }} className="text-2xl font-bold mb-1">
                {mode === 'choice' ? 'Вход в аккаунт' : 'Вход по паролю'}
              </h2>
              <p style={{ color: COLORS.mutedForeground }} className="text-sm">
                {mode === 'choice' 
                  ? 'Выберите способ авторизации' 
                  : 'Введите ваши данные для входа'}
              </p>
            </div>

            {/* Режим выбора */}
            {mode === 'choice' && (
              <div className="space-y-3">
                {/* Кнопка Telegram */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTelegramAuth}
                  className="w-full p-4 rounded-2xl flex items-center gap-4 text-white font-semibold transition-all"
                  style={{ 
                    backgroundColor: COLORS.telegram,
                    boxShadow: `0 4px 20px ${COLORS.telegram}40`
                  }}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold">Войти через Telegram</p>
                    <p className="text-xs opacity-80">Быстрый и безопасный вход</p>
                  </div>
                  <ExternalLink className="w-5 h-5 opacity-60" />
                </motion.button>

                {/* Разделитель */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px" style={{ backgroundColor: COLORS.border }} />
                  <span className="text-xs" style={{ color: COLORS.mutedForeground }}>или</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: COLORS.border }} />
                </div>

                {/* Кнопка логин/пароль */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('login')}
                  className="w-full p-4 rounded-2xl flex items-center gap-4 font-semibold border transition-all"
                  style={{ 
                    backgroundColor: COLORS.card,
                    borderColor: COLORS.border,
                    color: COLORS.foreground
                  }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${COLORS.primary}20` }}
                  >
                    <User className="w-6 h-6" style={{ color: COLORS.primary }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold">Войти с паролем</p>
                    <p className="text-xs" style={{ color: COLORS.mutedForeground }}>
                      Используйте логин и пароль
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5" style={{ color: COLORS.mutedForeground }} />
                </motion.button>

                {/* Подсказка для новых */}
                <div 
                  className="mt-4 p-3 rounded-xl text-center text-xs"
                  style={{ 
                    backgroundColor: `${COLORS.success}15`,
                    border: `1px solid ${COLORS.success}30`
                  }}
                >
                  <p style={{ color: COLORS.success }}>
                    💡 Нет аккаунта? Зарегистрируйтесь через Telegram-бота!
                  </p>
                </div>
              </div>
            )}

            {/* Режим логина */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Поле логина */}
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.foreground }}
                  >
                    Логин или Telegram ID
                  </label>
                  <div className="relative">
                    <User 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: COLORS.mutedForeground }}
                    />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Введите логин"
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: COLORS.background,
                        borderColor: COLORS.border,
                        color: COLORS.foreground,
                        '--tw-ring-color': COLORS.primary
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Поле пароля */}
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.foreground }}
                  >
                    Пароль
                  </label>
                  <div className="relative">
                    <Lock 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: COLORS.mutedForeground }}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Введите пароль"
                      disabled={loading}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border transition-colors focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: COLORS.background,
                        borderColor: COLORS.border,
                        color: COLORS.foreground,
                        '--tw-ring-color': COLORS.primary
                      } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Ошибка */}
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl text-sm text-center"
                    style={{ 
                      backgroundColor: '#ef444420',
                      color: '#fca5a5'
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Кнопка входа */}
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ 
                    background: loading 
                      ? COLORS.border 
                      : `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    <>
                      Войти
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                {/* Кнопка назад */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('choice');
                    setError('');
                  }}
                  className="w-full py-2 text-sm font-medium transition-colors"
                  style={{ color: COLORS.mutedForeground }}
                >
                  ← Выбрать другой способ
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AuthModal;
