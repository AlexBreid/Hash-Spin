import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  Lock, 
  UserPlus, 
  LogIn, 
  X, 
  MessageCircle,
  Key,
  Send,
  Loader2
} from 'lucide-react';

interface AuthRequiredProps {
  children: React.ReactNode;
  message?: string;
}

// Компонент-обёртка, который показывает контент или экран авторизации
export function AuthRequired({ children, message = 'Для доступа к этой странице необходима авторизация' }: AuthRequiredProps) {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  return <AuthRequiredScreen message={message} />;
}

// Экран "Требуется авторизация"
export function AuthRequiredScreen({ message }: { message: string }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleRegister = () => {
    // Открываем Telegram бота для регистрации
    window.open('https://t.me/SafariUpbot', '_blank');
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center mb-6"
      >
        <Lock className="w-12 h-12 text-orange-400" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-center mb-3"
      >
        Требуется авторизация
      </motion.h1>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-gray-400 text-center mb-8 max-w-xs"
      >
        {message}
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-xs space-y-3"
      >
        {/* Register Button */}
        <button
          onClick={handleRegister}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
        >
          <UserPlus className="w-5 h-5" />
          Зарегистрироваться
        </button>
        
        <p className="text-center text-xs text-gray-500">через Telegram бота</p>

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-gray-500">или</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Login Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-xl font-semibold text-white flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Войти в аккаунт
        </button>
      </motion.div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <LoginModal onClose={() => setShowLoginModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Модалка выбора способа входа
function LoginModal({ onClose }: { onClose: () => void }) {
  const [method, setMethod] = useState<'select' | 'credentials'>('select');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleTelegramLogin = () => {
    // Открываем бота для получения ссылки
    window.open('https://t.me/SafariUpbot?start=login', '_blank');
    onClose();
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/login-with-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.token && data.user) {
        login(data.token, data.user);
        onClose();
      } else {
        setError(data.error || 'Неверный логин или пароль');
      }
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#101423] rounded-t-3xl sm:rounded-3xl w-full max-w-sm overflow-hidden border border-white/10"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {method === 'select' ? 'Выберите способ входа' : 'Вход по логину'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {method === 'select' ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Telegram Button */}
                <button
                  onClick={handleTelegramLogin}
                  className="w-full p-4 bg-[#0088cc] rounded-xl flex items-center gap-4 hover:bg-[#0099dd] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Send className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Через Telegram</p>
                    <p className="text-sm text-white/70">Быстрый и безопасный вход</p>
                  </div>
                </button>

                {/* Credentials Button */}
                <button
                  onClick={() => setMethod('credentials')}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Key className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Логин и пароль</p>
                    <p className="text-sm text-gray-400">Если вы установили пароль</p>
                  </div>
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleCredentialsLogin}
                className="space-y-4"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setMethod('select')}
                  className="text-sm text-gray-400 hover:text-white mb-2"
                >
                  ← Назад к выбору
                </button>

                {/* Username */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Логин или Telegram ID</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                    placeholder="username или 123456789"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Войти
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AuthRequired;
