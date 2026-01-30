/**
 * Хук для работы с Telegram WebApp API
 * Поддерживает openInvoice() для оплаты Stars
 */

import { useEffect, useState, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  ready: () => void;
  expand: () => void;
  close: () => void;
  openInvoice: (url: string, callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  openTelegramLink: (url: string) => void;
  openLink: (url: string) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegramWebApp() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setWebApp(tg);
      setIsAvailable(true);
      tg.ready();
      tg.expand();
      
    }
  }, []);
  
  const openInvoice = useCallback((url: string): Promise<'paid' | 'cancelled' | 'failed' | 'pending'> => {
    return new Promise((resolve) => {
      if (!webApp) {
        resolve('failed');
        return;
      }
      webApp.openInvoice(url, (status) => {
        resolve(status);
      });
    });
  }, [webApp]);
  
  const openTelegramLink = useCallback((url: string) => {
    if (webApp) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [webApp]);
  
  const hapticFeedback = useCallback((type: 'success' | 'error' | 'warning') => {
    webApp?.HapticFeedback?.notificationOccurred(type);
  }, [webApp]);
  
  return {
    isAvailable,
    user: webApp?.initDataUnsafe?.user || null,
    platform: webApp?.platform || 'unknown',
    openInvoice,
    openTelegramLink,
    hapticFeedback,
    webApp
  };
}

export default useTelegramWebApp;
