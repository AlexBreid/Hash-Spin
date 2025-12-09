import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { LogOut, HelpCircle, Shield, Bell, Lock, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface SettingsPageProps {
  onNavigate?: (page: string) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { logout, user } = useAuth();
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
        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          ⚙️ Настройки
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Аккаунт: <span className="font-semibold">{user?.username || user?.email}</span></p>
      </motion.div>

      {/* БЕЗОПАСНОСТЬ - ГЛАВНАЯ КАРТОЧКА */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-2 border-blue-400/60 dark:from-blue-950/40 dark:to-cyan-950/20 dark:border-blue-700/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-blue-600/20 rounded-xl">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-lg text-blue-900 dark:text-blue-200">Безопасность</h3>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full justify-start py-3 rounded-xl border-blue-300/50 dark:border-blue-700/50 hover:bg-blue-600 hover:text-white transition-all"
              onClick={() => onNavigate?.('security')}
            >
              <Lock className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Изменить пароль</div>
                <div className="text-xs opacity-70">Обновите пароль аккаунта</div>
              </div>
            </Button>

            <Button 
              variant="outline"
              className="w-full justify-start py-3 rounded-xl border-blue-300/50 dark:border-blue-700/50 hover:bg-blue-600 hover:text-white transition-all"
              onClick={() => onNavigate?.('2fa')}
            >
              <Lock className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Двухфакторная аутентификация</div>
                <div className="text-xs opacity-70">Защитите аккаунт дополнительно</div>
              </div>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* УВЕДОМЛЕНИЯ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-gradient-to-br from-violet-500/20 to-purple-500/10 border-2 border-violet-400/60 dark:from-violet-950/40 dark:to-purple-950/20 dark:border-violet-700/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-violet-600/20 rounded-xl">
              <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-bold text-lg text-violet-900 dark:text-violet-200">Уведомления</h3>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full justify-start py-3 rounded-xl border-violet-300/50 dark:border-violet-700/50 hover:bg-violet-600 hover:text-white transition-all"
              onClick={() => onNavigate?.('notifications')}
            >
              <Bell className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Настройки уведомлений</div>
                <div className="text-xs opacity-70">Выбери какие уведомления получать</div>
              </div>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* ДАННЫЕ И КОНФИДЕНЦИАЛЬНОСТЬ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-6 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-400/60 dark:from-amber-950/40 dark:to-orange-950/20 dark:border-amber-700/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-amber-600/20 rounded-xl">
              <Download className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-bold text-lg text-amber-900 dark:text-amber-200">Данные</h3>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline"
              className="w-full justify-start py-3 rounded-xl border-amber-300/50 dark:border-amber-700/50 hover:bg-amber-600 hover:text-white transition-all"
              onClick={() => onNavigate?.('data-export')}
            >
              <Download className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Скачать мои данные</div>
                <div className="text-xs opacity-70">Получи копию всей информации аккаунта</div>
              </div>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* ПОДДЕРЖКА */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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
              variant="outline"
              className="w-full justify-start py-3 rounded-xl border-green-300/50 dark:border-green-700/50 hover:bg-green-600 hover:text-white transition-all"
              onClick={() => onNavigate?.('faq')}
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Помощь и FAQ</div>
                <div className="text-xs opacity-70">Ответы на часто задаваемые вопросы</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full justify-start py-3 rounded-xl border-green-300/50 dark:border-green-700/50 hover:bg-green-600 hover:text-white transition-all"
              onClick={() => onNavigate?.('support')}
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Связаться с поддержкой</div>
                <div className="text-xs opacity-70">Напиши нам если что-то не работает</div>
              </div>
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* ОПАСНАЯ ЗОНА */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="p-6 bg-gradient-to-br from-red-500/20 to-rose-500/10 border-2 border-red-400/60 dark:from-red-950/40 dark:to-rose-950/20 dark:border-red-700/60">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-red-600/20 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-bold text-lg text-red-900 dark:text-red-200">Опасная зона</h3>
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

      {/* INFO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-4 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 border border-slate-300/50 dark:border-slate-700/50">
          <div className="flex gap-3">
            <div className="p-2 bg-slate-300 dark:bg-slate-700 rounded-lg flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <p className="font-semibold mb-1">💡 Совет</p>
              <p className="text-xs">Регулярно проверяй настройки безопасности, чтобы защитить свой аккаунт. Никогда не делись паролем с другими!</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}