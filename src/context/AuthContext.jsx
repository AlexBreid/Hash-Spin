import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Ключ, который мы будем использовать ВЕЗДЕ
const TOKEN_KEY = 'casino_jwt_token';
const USER_KEY = 'user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Инициализация при загрузке приложения
  useEffect(() => {
    const initializeAuth = () => {
      // Используем константу
      const savedToken = localStorage.getItem(TOKEN_KEY); 
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);
          console.log('✅ Auth restored from localStorage');
        } catch (err) {
          console.error('❌ Error parsing saved user:', err);
          // Используем константы
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    // Используем константы
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    console.log('✅ User logged in:', newUser.username);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Используем константы
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    console.log('✅ User logged out');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
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