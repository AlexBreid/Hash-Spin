import { motion } from 'framer-motion';
import { 
  UserX, 
  LogIn, 
  UserPlus, 
  MessageCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface NotAuthenticatedProps {
  title?: string;
  description?: string;
  onLogin: () => void;
  onRegister: () => void;
}

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

export function NotAuthenticated({ 
  title = 'Вы не авторизованы',
  description = 'Войдите или зарегистрируйтесь, чтобы получить доступ к этому разделу',
  onLogin,
  onRegister
}: NotAuthenticatedProps) {
  const handleTelegramRegister = () => {
    window.open(TELEGRAM_BOT_URL, '_blank');
  };

  return (
    <div 
      className="min-h-[70vh] flex items-center justify-center p-6"
      style={{ backgroundColor: COLORS.background }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        {/* Иконка */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full"
          style={{ 
            background: `linear-gradient(135deg, ${COLORS.primary}30, ${COLORS.accent}30)`,
            border: `2px solid ${COLORS.border}`
          }}
        >
          <UserX className="w-10 h-10" style={{ color: COLORS.mutedForeground }} />
        </motion.div>

        {/* Заголовок */}
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ color: COLORS.foreground }} 
          className="text-2xl font-bold mb-2"
        >
          {title}
        </motion.h2>

        {/* Описание */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ color: COLORS.mutedForeground }} 
          className="text-sm mb-8"
        >
          {description}
        </motion.p>

        {/* Кнопки */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {/* Регистрация через Telegram */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleTelegramRegister}
            className="w-full p-4 rounded-2xl flex items-center gap-3 text-white font-semibold transition-all"
            style={{ 
              backgroundColor: COLORS.telegram,
              boxShadow: `0 4px 20px ${COLORS.telegram}30`
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold">Зарегистрироваться</p>
              <p className="text-xs opacity-80">Через Telegram бота</p>
            </div>
            <UserPlus className="w-5 h-5 opacity-60" />
          </motion.button>

          {/* Вход */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogin}
            className="w-full p-4 rounded-2xl flex items-center gap-3 font-semibold border transition-all"
            style={{ 
              backgroundColor: COLORS.card,
              borderColor: COLORS.border,
              color: COLORS.foreground
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${COLORS.primary}20` }}
            >
              <LogIn className="w-5 h-5" style={{ color: COLORS.primary }} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold">Войти в аккаунт</p>
              <p className="text-xs" style={{ color: COLORS.mutedForeground }}>
                У меня уже есть аккаунт
              </p>
            </div>
            <ArrowRight className="w-5 h-5" style={{ color: COLORS.mutedForeground }} />
          </motion.button>
        </motion.div>

      </motion.div>
    </div>
  );
}

export default NotAuthenticated;
