import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Moon, Sun, Globe, HelpCircle, LogOut, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SettingsPageProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onNavigate?: (page: string) => void;
}

export function SettingsPage({ isDarkMode, onThemeToggle, onNavigate }: SettingsPageProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="pb-24 pt-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Настройки</h1>
      </div>

      {/* Theme Settings */}
      <Card className="p-5 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Внешний вид</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isDarkMode ? (
              <Moon className="w-6 h-6 text-primary" />
            ) : (
              <Sun className="w-6 h-6 text-primary" />
            )}
            <div>
              <p className="font-semibold">Тёмная тема</p>
              <p className="text-sm text-muted-foreground">Переключение тёмной/светлой темы</p>
            </div>
          </div>
          <Switch checked={isDarkMode} onCheckedChange={onThemeToggle} />
        </div>
      </Card>

      {/* Language Settings */}
      <Card className="p-5 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Язык и регион</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6" />
              <div>
                <p className="font-semibold">Язык интерфейса</p>
                <p className="text-sm text-muted-foreground">Выберите предпочитаемый язык</p>
              </div>
            </div>
            <Select defaultValue="ru">
              <SelectTrigger className="w-32 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Support */}
      <Card className="p-5 mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Поддержка</h3>
        </div>
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start py-3 rounded-2xl border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            onClick={() => onNavigate?.('support')}
          >
            <HelpCircle className="w-5 h-5 mr-3" />
            Помощь и FAQ
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start py-3 rounded-2xl border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            onClick={() => onNavigate?.('support')}
          >
            <HelpCircle className="w-5 h-5 mr-3" />
            Связаться с поддержкой
          </Button>
        </div>
      </Card>

      {/* Logout */}
      <Card className="p-5">
        <div className="space-y-3">
          <Button 
            variant="destructive" 
            className="w-full justify-start py-3 rounded-2xl font-semibold"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Выйти из аккаунта
          </Button>
        </div>
      </Card>
    </div>
  );
}