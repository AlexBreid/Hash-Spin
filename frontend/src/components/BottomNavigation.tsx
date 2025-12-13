import { Home, Trophy, Users, User, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

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
          }}
        >
          {/* ЛЕВАЯ ЧАСТЬ - 2 кнопки (home, records) */}
          <div className="flex items-center justify-center gap-2 absolute left-4 top-1/2 -translate-y-1/2">
            {navItems.slice(0, 2).map((item) => {
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

          {/* ЦЕНТР - ГЛАВНАЯ (круг, выпирает вверх) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-4">
            {/* ФОНОВЫЙ КРУГ ДЛЯ АКТИВНОГО СОСТОЯНИЯ */}
            {currentPage === 'home' && (
              <div
                style={{
                  position: 'absolute',
                  width: '64px',
                  height: '64px',
                  left: '-8px',
                  top: '-8px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1))',
                  border: '2px solid rgba(59, 130, 246, 0.5)',
                }}
              >
                <motion.div
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(59, 130, 246, 0.3)',
                      '0 0 30px rgba(59, 130, 246, 0.5)',
                      '0 0 20px rgba(59, 130, 246, 0.3)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}

            <motion.button
              onClick={() => onPageChange('home')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              className="relative flex flex-col items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: '56px',
                height: '56px',
                color: currentPage === 'home' ? '#3B82F6' : '#94A3B8',
                backgroundColor: currentPage === 'home' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.1)',
              }}
            >
              <motion.div
                animate={{
                  scale: currentPage === 'home' ? 1.2 : 1,
                  color: currentPage === 'home' ? '#3B82F6' : '#94A3B8',
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-6 h-6"
              >
                <Home className="w-full h-full" strokeWidth={2} />
              </motion.div>
            </motion.button>
          </div>

          {/* ПРАВАЯ ЧАСТЬ - 3 кнопки (referrals, account, settings) */}
          <div className="flex items-center justify-center gap-2 absolute right-4 top-1/2 -translate-y-1/2">
            {navItems.slice(2, 5).map((item) => {
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