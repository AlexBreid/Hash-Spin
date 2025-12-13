import { Home, Trophy, Users, User, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'records', icon: Trophy, label: 'Рекорды' },
  { id: 'referrals', icon: Users, label: 'Рефералы' },
  { id: 'account', icon: User, label: 'Аккаунт' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
];

const COLORS = {
  background: '#09090B',
  card: '#18181B',
  primary: '#06B6D4',      // Cyan
  primaryDark: '#0891B2',  // Dark Cyan
  success: '#10B981',      // Green
  muted: '#3F3F46',
  border: 'rgba(6, 182, 212, 0.2)',
  foreground: '#FAFAFA',
};

export function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  const activeIndex = navItems.findIndex(item => item.id === currentPage);

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* ФОНОВЫЙ БЛОБ С ГРАДИЕНТОМ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* ОСНОВНОЙ КОНТЕЙНЕР С ГРАДИЕНТОМ И БОРДЕРОМ */}
        <div
          className="relative mx-auto max-w-md rounded-3xl p-3 backdrop-blur-xl border transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${COLORS.card}E6, ${COLORS.card}CC)`,
            border: `2px solid ${COLORS.border}`,
            boxShadow: `0 8px 32px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
          }}
        >
          {/* АКТИВНЫЙ ФОНОВЫЙ ЭЛЕМЕНТ (огибает активную кнопку) */}
          <AnimatePresence>
            <motion.div
              key={`highlight-${activeIndex}`}
              layoutId="nav-background"
              className="absolute rounded-2xl"
              style={{
                left: activeIndex === 0 ? 'calc(0% + 6px)' : 
                       activeIndex === 1 ? 'calc(20% + 6px)' :
                       activeIndex === 2 ? 'calc(50% - 36px)' :
                       activeIndex === 3 ? 'calc(80% - 66px)' :
                       'calc(100% - 66px)',
                top: '6px',
                width: activeIndex === 2 ? '72px' : '56px',
                height: '56px',
              }}
              transition={{
                type: 'spring',
                damping: 20,
                stiffness: 300,
                mass: 1,
              }}
            >
              {/* ВНУТРЕННИЙ ГРАДИЕНТ */}
              <div
                className="w-full h-full rounded-2xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary}40, ${COLORS.primaryDark}30)`,
                  border: `2px solid ${COLORS.primary}60`,
                  boxShadow: `0 0 20px ${COLORS.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                }}
              >
                {/* АНИМИРОВАННЫЙ БЛЕСК */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
                  }}
                  animate={{ x: ['100%', '-100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* НАВИГАЦИОННЫЕ КНОПКИ */}
          <div className="flex items-center justify-around relative z-10">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const isCenter = index === 2; // Индекс главной (центральная)

              return (
                <motion.button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  whileHover={{ scale: isActive ? 1.08 : 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  className={`
                    relative flex flex-col items-center justify-center 
                    rounded-2xl transition-all duration-300 
                    ${isCenter ? 'w-16 h-16 -mt-3' : 'w-14 h-14 px-2'}
                    ${isActive ? 'text-white font-bold' : 'text-zinc-500'}
                  `}
                  style={{
                    color: isActive ? COLORS.primary : '#A1A1A6',
                  }}
                >
                  {/* ИКОНКА С ЦВЕТОМ И УВЕЛИЧЕНИЕМ */}
                  <motion.div
                    animate={{
                      scale: isActive ? (isCenter ? 1.3 : 1.25) : 1,
                      color: isActive ? COLORS.primary : '#A1A1A6',
                    }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className={`${isCenter ? 'w-7 h-7' : 'w-5 h-5'}`}
                  >
                    <Icon className="w-full h-full" strokeWidth={2} />
                  </motion.div>

                  {/* ТЕКСТ МЕТКИ */}
                  {!isCenter && (
                    <motion.span
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ 
                        opacity: isActive ? 1 : 0.6,
                        y: isActive ? 0 : 2,
                      }}
                      transition={{ duration: 0.2 }}
                      className={`text-xs font-medium mt-1 ${isActive ? 'font-semibold' : 'font-normal'}`}
                      style={{
                        color: isActive ? COLORS.primary : '#A1A1A6',
                      }}
                    >
                      {item.label}
                    </motion.span>
                  )}

                  {/* ТЕКСТ ДЛЯ ЦЕНТРАЛЬНОЙ КНОПКИ */}
                  {isCenter && isActive && (
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs font-bold mt-1"
                      style={{ color: COLORS.primary }}
                    >
                      {item.label}
                    </motion.span>
                  )}

                  {/* ПУЛЬСИРУЮЩИЙ ЭФФЕКТ ДЛЯ АКТИВНОЙ КНОПКИ */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        border: `2px solid ${COLORS.primary}`,
                      }}
                      animate={{
                        boxShadow: [
                          `0 0 10px ${COLORS.primary}40`,
                          `0 0 20px ${COLORS.primary}60`,
                          `0 0 10px ${COLORS.primary}40`,
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* ДЕКОРАТИВНЫЙ ЭЛЕМЕНТ ВНИЗУ */}
          <div
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 rounded-full blur-sm"
            style={{
              background: `linear-gradient(90deg, transparent, ${COLORS.primary}60, transparent)`,
              opacity: 0.5,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}