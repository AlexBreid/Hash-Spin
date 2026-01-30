import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Interface для баланса пользователя
 */
export interface BalanceData {
  id: number;
  userId: number;
  tokenId: number;
  type: 'MAIN' | 'BONUS';
  amount: string | number; // Decimal из БД приходит как строка
  createdAt: string;
  updatedAt: string;
}

/**
 * Хук для управления балансом пользователя
 * 
 * Использование:
 * const { balances, loading, error, fetchBalances, updateBalance } = useBalance();
 * 
 * // Получить все балансы
 * useEffect(() => {
 *   fetchBalances();
 * }, []);
 * 
 * // Обновить баланс после ставки/выигрыша
 * await updateBalance(tokenId, 100, 'MAIN');
 */
export function useBalance() {
  const { user, token, isAuthenticated } = useAuth();
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Загружает балансы пользователя с сервера
   */
  const fetchBalances = useCallback(async () => {
    if (!isAuthenticated || !token) {
      
      return;
    }

    try {
      setLoading(true);
      setError(null);

      

      const response = await fetch(
        `${API_BASE_URL}/api/v1/wallet/balance`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        
        setBalances(data.data);
      } else {
        throw new Error(data.error || 'Ошибка загрузки балансов');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, user?.id]);

  /**
   * Обновляет баланс пользователя
   * @param tokenId - ID токена (1 = USDT, 2 = BTC, и т.д.)
   * @param amount - Сумма для добавления/вычитания (положительное число)
   * @param type - Тип баланса ('MAIN' или 'BONUS')
   * @param operation - Операция ('add' для добавления, 'subtract' для вычитания)
   */
  const updateBalance = useCallback(
    async (
      tokenId: number,
      amount: number,
      type: 'MAIN' | 'BONUS' = 'MAIN',
      operation: 'add' | 'subtract' = 'add'
    ): Promise<BalanceData | null> => {
      if (!isAuthenticated || !token) {
        throw new Error('Пользователь не авторизован');
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/v1/balance/update-balance`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              tokenId,
              amount,
              type,
              operation,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          
          
          // Обновляем локальное состояние
          setBalances(prev =>
            prev.map(bal =>
              bal.id === data.data.id ? data.data : bal
            )
          );

          return data.data;
        } else {
          throw new Error(data.error || 'Ошибка обновления баланса');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, token]
  );

  /**
   * Получить баланс конкретного типа и токена
   */
  const getBalance = useCallback(
    (tokenId: number, type: 'MAIN' | 'BONUS' = 'MAIN'): number => {
      const balance = balances.find(
        b => b.tokenId === tokenId && b.type === type
      );
      return balance ? parseFloat(balance.amount.toString()) : 0;
    },
    [balances]
  );

  /**
   * Получить общий баланс по всем токенам (основной баланс)
   */
  const getTotalBalance = useCallback((): number => {
    return balances
      .filter(b => b.type === 'MAIN')
      .reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0);
  }, [balances]);

  // Загружаем балансы при монтировании компонента
  useEffect(() => {
    if (isAuthenticated) {
      fetchBalances();
    }
  }, [isAuthenticated, fetchBalances]);

  return {
    balances,
    loading,
    error,
    fetchBalances,
    updateBalance,
    getBalance,
    getTotalBalance,
  };
}

