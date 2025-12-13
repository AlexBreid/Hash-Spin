import { Home, Trophy, Users, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

// Исключаем "home" из боковых групп — он будет отдельно по центру
const leftNavItems = [
  { id: 'records', icon: Trophy, label: 'Рекорды' },
];

const rightNavItems = [
  { id: 'referrals', icon: Users, label: 'Рефералы' },
  { id: 'account', icon: User, label: 'Аккаунт' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
];

export function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4"
      style={{ backgroundColor: 'transparent' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        {/* ОСНОВНОЙ КОНТЕЙНЕР - ДЛИННЫЙ БЛОК */}
        <div
          className="relative mx-auto rounded-full p-2 backdrop-blur-md border"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)',
            width: '100%',
            maxWidth: '400px',
            height: '64px',
          }}
        >
          {/* ЛЕВАЯ ЧАСТЬ - 1 кнопка (records) */}
          <div className="flex items-center justify-center gap-2 absolute left-4 top-1/2 -translate-y-1/2">
            {leftNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-300 w-12 h-12"
                  style={{
                    color: isActive ? '#3B82F6' : '#94A3B8',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '0.75rem',
                        border: '1px solid #3B82F6',
                        boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
                      }}
                    >
                      <motion.div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '0.75rem',
                        }}
                        animate={{
                          boxShadow: [
                            '0 0 12px rgba(59, 130, 246, 0.4)',
                            '0 0 20px rgba(59, 130, 246, 0.6)',
                            '0 0 12px rgba(59, 130, 246, 0.4)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  )}

                  <span className="text-xs font-medium mt-1" style={{ color: isActive ? '#3B82F6' : '#94A3B8' }}>
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* ЦЕНТР - ГЛАВНАЯ (home) — увеличена и выпирает вверх */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            {currentPage === 'home' && (
              <div
                style={{
                  position: 'absolute',
                  width: '72px',
                  height: '72px',
                  left: '-12px',
                  top: '-12px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.15))',
                  border: '2px solid rgba(59, 130, 246, 0.6)',
                  zIndex: -1,
                }}
              >
                <motion.div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(59, 130, 246, 0.4)',
                      '0 0 30px rgba(59, 130, 246, 0.6)',
                      '0 0 20px rgba(59, 130, 246, 0.4)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}

            <motion.button
              onClick={() => onPageChange('home')}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="relative flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: '64px',
                height: '64px',
                color: currentPage === 'home' ? '#FFFFFF' : '#94A3B8',
                backgroundColor: currentPage === 'home'
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(148, 163, 184, 0.1)',
                boxShadow: currentPage === 'home'
                  ? '0 4px 20px rgba(59, 130, 246, 0.5)'
                  : 'none',
                zIndex: 10,
              }}
            >
              <motion.div
                animate={{
                  scale: currentPage === 'home' ? 1.25 : 1,
                  color: currentPage === 'home' ? '#FFFFFF' : '#94A3B8',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <Home className="w-7 h-7" strokeWidth={2.5} />
              </motion.div>
            </motion.button>
          </div>

          {/* ПРАВАЯ ЧАСТЬ - 3 кнопки */}
          <div className="flex items-center justify-center gap-2 absolute right-4 top-1/2 -translate-y-1/2">
            {rightNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex flex-col items-center justify-center rounded-xl p-2 transition-all duration-300 w-12 h-12"
                  style={{
                    color: isActive ? '#3B82F6' : '#94A3B8',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '0.75rem',
                        border: '1px solid #3B82F6',
                        boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
                      }}
                    >
                      <motion.div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '0.75rem',
                        }}
                        animate={{
                          boxShadow: [
                            '0 0 12px rgba(59, 130, 246, 0.4)',
                            '0 0 20px rgba(59, 130, 246, 0.6)',
                            '0 0 12px rgba(59, 130, 246, 0.4)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  )}

                  <span className="text-xs font-medium mt-1" style={{ color: isActive ? '#3B82F6' : '#94A3B8' }}>
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}