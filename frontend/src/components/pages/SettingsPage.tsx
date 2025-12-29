import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { LogOut, HelpCircle, MessageCircle, LogIn, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SettingsPageProps {
  onNavigate?: (page: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { logout, user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pb-24 pt-6 px-4 space-y-4">
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
          ⚙️ Настройки
        </h1>
        {isAuthenticated && user && (
          <p className="text-muted-foreground text-sm mt-1">Аккаунт: <span className="font-semibold text-foreground">{user?.username || user?.email}</span></p>
        )}
      </motion.div>

      {/* ТЕМА */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 }}
      >
        <Card className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-400/60 dark:from-amber-950/40 dark:to-orange-950/20 dark:border-amber-700/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-amber-600/20 dark:bg-amber-600/20 rounded-xl">
              {theme === 'dark' ? (
                <Moon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              ) : (
                <Sun className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <h3 className="font-bold text-lg text-amber-900 dark:text-amber-200">Тема</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-zinc-800/50 rounded-xl border border-amber-400/50 dark:border-amber-700/50">
              <div>
                <p className="text-foreground font-semibold">Текущая тема</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {theme === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
                </p>
              </div>
              <Button
                onClick={toggleTheme}
                className={`font-semibold rounded-lg px-6 ${
                  theme === 'dark' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'bg-amber-400 hover:bg-amber-500 text-amber-900'
                }`}
              >
                {theme === 'dark' ? '☀️ Свет' : '🌙 Темнота'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ПОДДЕРЖКА */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-400/60 dark:from-green-950/40 dark:to-emerald-950/20 dark:border-green-700/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-green-600/20 rounded-xl">
              <HelpCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-bold text-lg text-green-900 dark:text-green-200">Поддержка</h3>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full justify-start py-3 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-900 dark:text-green-200 hover:text-white dark:hover:text-white transition-all border border-green-400/50"
              onClick={() => navigate('/support')}
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Справка и FAQ</div>
                <div className="text-xs opacity-70">Ответы на все вопросы</div>
              </div>
            </Button>
            
            <Button 
              className="w-full justify-start py-3 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-900 dark:text-green-200 hover:text-white dark:hover:text-white transition-all border border-green-400/50"
              onClick={() => navigate('/support?section=bonus')}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Бонус для рефералов</div>
                <div className="text-xs opacity-70">Информация о бонусе при регистрации по реферальной ссылке</div>
              </div>
            </Button>

            <Button 
              className="w-full justify-start py-3 rounded-xl bg-green-600/20 hover:bg-green-600 text-green-900 dark:text-green-200 hover:text-white dark:hover:text-white transition-all border border-green-400/50"
              onClick={() => navigate('/support?section=referral')}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Программа рефералов</div>
                <div className="text-xs opacity-70">Как зарабатывать на друзьях</div>
              </div>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* АККАУНТ */}
      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-red-500/20 to-rose-500/10 border-2 border-red-400/60 dark:from-red-950/40 dark:to-rose-950/20 dark:border-red-700/60">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-red-600/20 rounded-xl">
                <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-lg text-red-900 dark:text-red-200">Аккаунт</h3>
            </div>

            <div className="space-y-3">
              <Button 
                variant="destructive"
                className="w-full justify-start py-3 rounded-xl font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div>Выйти из аккаунта</div>
                  <div className="text-xs opacity-70">Завершить сессию</div>
                </div>
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* LOGIN CARD IF NOT AUTHENTICATED */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-2 border-blue-400/60 dark:from-blue-950/40 dark:to-cyan-950/20 dark:border-blue-700/60">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-blue-600/20 rounded-xl">
                <LogIn className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-lg text-blue-900 dark:text-blue-200">Аккаунт</h3>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full justify-start py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={() => navigate('/login')}
              >
                <LogIn className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div>Войти в аккаунт</div>
                  <div className="text-xs opacity-70">Аутентифицироваться</div>
                </div>
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* INFO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 border border-slate-300/50 dark:border-slate-700/50">
          <div className="flex gap-3">
            <div className="p-2 bg-slate-300 dark:bg-slate-700 rounded-lg flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <p className="font-semibold mb-1">💡 Совет</p>
              <p className="text-xs">Всегда проверяй раздел "Справка" если у тебя есть вопросы. Там ты найдёшь ответы на все важные вопросы!</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}