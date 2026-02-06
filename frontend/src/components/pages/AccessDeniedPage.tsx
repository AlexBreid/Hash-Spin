import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX, ArrowLeft, Lock } from 'lucide-react';

const COLORS = {
  background: 'var(--background)',
  card: 'var(--card)',
  primary: 'var(--primary)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  error: '#EF4444',
};

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{ backgroundColor: COLORS.background }}
      className="min-h-screen flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {/* Иконка */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${COLORS.error}20, ${COLORS.error}10)`,
            border: `2px solid ${COLORS.error}40`,
          }}
        >
          <ShieldX size={48} style={{ color: COLORS.error }} />
        </motion.div>

        {/* Заголовок */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ color: COLORS.foreground }}
          className="text-2xl font-bold mb-3"
        >
          Доступ запрещён
        </motion.h1>

        {/* Описание */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ color: COLORS.mutedForeground }}
          className="mb-6"
        >
          Эта страница доступна только администраторам.
          У вас нет прав для просмотра этого раздела.
        </motion.p>

        {/* Блок с иконкой замка */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-xl mb-6 flex items-center gap-3"
          style={{
            background: `${COLORS.error}10`,
            border: `1px solid ${COLORS.error}30`,
          }}
        >
          <Lock size={20} style={{ color: COLORS.error }} />
          <span style={{ color: COLORS.error }} className="text-sm">
            Требуются права администратора
          </span>
        </motion.div>

        {/* Кнопка назад */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/account')}
          className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          style={{
            background: COLORS.primary,
            color: 'white',
          }}
        >
          <ArrowLeft size={18} />
          Вернуться в профиль
        </motion.button>
      </motion.div>
    </div>
  );
}

export default AccessDeniedPage;











