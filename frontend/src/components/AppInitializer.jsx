import { useApiEndpoints } from '../hooks/useDynamicApi';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Компонент-инициализатор который загружает endpoints ПРИ ЗАПУСКЕ ПРИЛОЖЕНИЯ
 * Обёртывает весь остальной контент приложения
 */
export function AppInitializer({ children }) {
  const { endpoints, loading, error, refetch } = useApiEndpoints();

  // Если endpoints загружаются, показываем лоадер
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-16 h-16 text-primary mb-4" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-lg"
        >
          Инициализация приложения...
        </motion.p>
      </div>
    );
  }

  // Если ошибка при загрузке endpoints - показываем красивую страницу
  if (error) {
    return (
      <ServerErrorPage 
        onRetry={() => {
          // Перезагружаем страницу для повторной инициализации
          window.location.reload();
        }}
        errorMessage={error}
      />
    );
  }

  // Endpoints загружены успешно, показываем приложение
  return <>{children}</>;
}
