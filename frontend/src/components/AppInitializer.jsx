import { useApiEndpoints } from '../hooks/useDynamicApi';
import { Loader2 } from 'lucide-react';

/**
 * Компонент-инициализатор который загружает endpoints ПРИ ЗАПУСКЕ ПРИЛОЖЕНИЯ
 * Обёртывает весь остальной контент приложения
 */
export function AppInitializer({ children }) {
  const { endpoints, loading, error } = useApiEndpoints();

  // Если endpoints загружаются, показываем лоадер
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Инициализация приложения...</p>
      </div>
    );
  }

  // Если ошибка при загрузке endpoints
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">Ошибка инициализации</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-red-500">
            Убедитесь, что API сервер запущен на http://localhost:4000
          </p>
        </div>
      </div>
    );
  }

  // Endpoints загружены успешно, показываем приложение
  return <>{children}</>;
}