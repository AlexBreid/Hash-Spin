import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Глобальное хранилище всех API endpoints
 */
let apiEndpoints = null;
let endpointsPromise = null;

/**
 * Загружает список всех API endpoints с сервера
 */
export function useApiEndpoints() {
  const [endpoints, setEndpoints] = useState(apiEndpoints);
  const [loading, setLoading] = useState(!apiEndpoints);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Если endpoints уже загружены, не загружаем снова
    if (apiEndpoints) {
      setEndpoints(apiEndpoints);
      setLoading(false);
      return;
    }

    const loadEndpoints = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`🔄 Загружаю endpoints с ${API_BASE_URL}/api-endpoints...`);

        const response = await fetch(`${API_BASE_URL}/api-endpoints`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        console.log(`📡 Ответ от сервера: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📋 Получены данные:', data);

        if (!data.success) {
          throw new Error(data.error || 'Не удалось загрузить endpoints');
        }

        // Кэшируем endpoints в глобальную переменную
        apiEndpoints = data.endpoints;
        setEndpoints(apiEndpoints);

        console.log(
          `✅ Загружено ${data.totalEndpoints} API endpoints (${Object.keys(apiEndpoints).length} ключей)`
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('❌ Ошибка загрузки endpoints:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadEndpoints();
  }, []);

  return { endpoints, loading, error };
}

/**
 * Получить URL по ключу (например: USER_GET_profile)
 */
export function getApiUrl(key) {
  if (!apiEndpoints) {
    throw new Error(
      'API endpoints не загружены. Убедитесь, что useApiEndpoints() был вызван первым.'
    );
  }

  const endpoint = apiEndpoints[key];

  if (!endpoint) {
    const availableKeys = Object.keys(apiEndpoints).join(', ');
    throw new Error(
      `API endpoint "${key}" не найден.\n\nДоступные:\n${availableKeys}`
    );
  }

  return endpoint;
}

/**
 * Получить полный URL с базовым адресом
 */
export function getFullUrl(key) {
  const endpoint = getApiUrl(key);
  return `${API_BASE_URL}${endpoint.path}`;
}

/**
 * Ждёт загрузки endpoints (возвращает Promise)
 */
function waitForEndpoints() {
  if (apiEndpoints) {
    return Promise.resolve(apiEndpoints);
  }

  if (endpointsPromise) {
    return endpointsPromise;
  }

  endpointsPromise = new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 200; // 10 секунд (200 * 50мс)

    const checkInterval = setInterval(() => {
      attempts++;

      if (apiEndpoints) {
        clearInterval(checkInterval);
        endpointsPromise = null;
        resolve(apiEndpoints);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        endpointsPromise = null;
        reject(
          new Error(
            'API endpoints не загружались более 10 секунд. Проверьте подключение к серверу.'
          )
        );
      }
    }, 50);
  });

  return endpointsPromise;
}

/**
 * Хук для выполнения API запроса
 *
 * Использование:
 * const { data, loading, error, execute } = useFetch('USER_GET_profile', 'GET');
 *
 * // или с POST данными:
 * const { data, loading, error, execute } = useFetch('WALLET_POST_deposit', 'POST');
 * execute({ amount: 100 });
 */
export function useFetch(apiKey, method = 'GET') {
  const { token, isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (body = null) => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !token) {
        throw new Error('Пожалуйста, войдите в систему');
      }

      console.log(`🔄 Ждём endpoints перед запросом ${apiKey}...`);

      // ЖДЁМ загрузки endpoints перед запросом
      await waitForEndpoints();

      console.log(`✅ Endpoints загружены, делаю запрос ${apiKey}...`);

      // Получаем полный URL
      const url = getFullUrl(apiKey);
      console.log(`📍 URL: ${url}`);

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      let response;
      try {
        response = await fetch(url, options);
      } catch (fetchErr) {
        const errorMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error(`❌ Fetch ошибка для ${apiKey}:`, errorMsg);

        // Специальная обработка ERR_INSUFFICIENT_RESOURCES
        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('net::')) {
          throw new Error(
            'Ошибка подключения к серверу. Убедитесь, что API сервер запущен на http://localhost:4000'
          );
        }
        throw fetchErr;
      }

      console.log(`📡 Ответ сервера: ${response.status}`);

      // 304 Not Modified - кэшированный ответ без body
      if (response.status === 304) {
        throw new Error(
          'Получен кэшированный ответ (304). Проверьте настройки кэширования на сервере.'
        );
      }

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Сессия истекла. Пожалуйста, войдите заново.');
        }
        if (response.status === 403) {
          throw new Error('Доступ запрещён.');
        }
        if (response.status === 404) {
          throw new Error(`Endpoint не найден: ${url}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📦 Полный ответ ${apiKey}:`, result);

      if (result.success) {
        console.log(`✅ ${apiKey} успешно загружено`);
        setData(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Запрос не удался');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`❌ Ошибка ${apiKey}:`, errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}