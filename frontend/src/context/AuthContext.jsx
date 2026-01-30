import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext();

const TOKEN_KEY = 'casino_jwt_token';
const USER_KEY = 'user';
const REFRESH_CHECK_INTERVAL = 5 * 60 * 1000;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef(null);
  const initializingRef = useRef(false);

  const refreshToken = useCallback(async (currentToken) => {
    if (!currentToken) return null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.refreshed && data.token) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.token;
      }
      
      return currentToken;
    } catch {
      return currentToken;
    }
  }, []);

  const verifyToken = useCallback(async (currentToken) => {
    if (!currentToken) return false;
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.valid) {
        if (data.needsRefresh) {
          await refreshToken(currentToken);
        }
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }, [refreshToken]);

  const loginWithTelegram = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initData) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login-with-telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ initData: tg.initData })
      });

      const data = await response.json();
      
      if (data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
          try {
            const isValid = await verifyToken(savedToken);
            
            if (isValid) {
              const currentToken = localStorage.getItem(TOKEN_KEY);
              const currentUser = localStorage.getItem(USER_KEY);
              
              setToken(currentToken);
              setUser(JSON.parse(currentUser));
              setLoading(false);
              return;
            } else {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          } catch {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }

        await loginWithTelegram();
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [loginWithTelegram, verifyToken]);

  useEffect(() => {
    if (!token) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    verifyToken(token);

    refreshIntervalRef.current = setInterval(() => {
      verifyToken(token);
    }, REFRESH_CHECK_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [token, verifyToken]);

  const login = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  const restoreSession = useCallback(async () => {
    const telegramSuccess = await loginWithTelegram();
    if (telegramSuccess) return true;
    
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      const isValid = await verifyToken(savedToken);
      if (isValid) {
        const currentToken = localStorage.getItem(TOKEN_KEY);
        const currentUser = localStorage.getItem(USER_KEY);
        if (currentToken && currentUser) {
          setToken(currentToken);
          setUser(JSON.parse(currentUser));
          return true;
        }
      }
    }
    
    return false;
  }, [loginWithTelegram, verifyToken]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    refreshToken,
    restoreSession,
    loginWithTelegram,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
