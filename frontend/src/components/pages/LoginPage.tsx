import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// --- КОНФИГУРАЦИЯ ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const LOGIN_ENDPOINT_TOKEN = `${API_BASE_URL}/login-with-token`;
const LOGIN_ENDPOINT_CREDENTIALS = `${API_BASE_URL}/login-with-credentials`;

// --- ТИПЫ UI КОМПОНЕНТОВ ---
type Loader2Props = { className?: string; };
type ButtonProps = { children: React.ReactNode; onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void; disabled?: boolean; className?: string; type?: "button" | "submit" | "reset"; };
type InputProps = { type?: string; placeholder?: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; };
type CardProps = { children: React.ReactNode; className?: string; };

const Loader2: React.FC<Loader2Props> = ({ className = "w-4 h-4" }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const Button: React.FC<ButtonProps> = ({ children, onClick, disabled, className = '', type = 'button' }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-300 shadow-lg ${disabled ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white transform hover:scale-[1.01]'} ${className}`}>
        {children}
    </button>
);
const Input: React.FC<InputProps> = ({ type = 'text', placeholder, value, onChange, disabled }) => (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} disabled={disabled} className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-3 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200" />
);
const Card: React.FC<CardProps> = ({ children, className = '' }) => (
    <div className={`bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-gray-700 ${className}`}>
        {children}
    </div>
);

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const getUrlParameter = (name: string): string => {
    if (typeof window === 'undefined') return ''; 
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

// --- ОСНОВНОЙ КОМПОНЕНТ ---
type LoginPageProps = {
    onLoginSuccess?: () => void; 
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) { 
    const navigate = useNavigate();
    const { login, isAuthenticated, loading: authLoading } = useAuth();

    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [authMethod, setAuthMethod] = useState<'form' | 'token'>('form'); 
    
    // 🆕 Флаг что мы уже пытались авторизоваться по токену
    const [tokenAttempted, setTokenAttempted] = useState<boolean>(false);

    const handleNavigation = useCallback(() => {
        // Очищаем URL от токена перед редиректом
        if (window.location.search.includes('token=')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (onLoginSuccess) {
            onLoginSuccess();
        } else {
            navigate('/');
        }
    }, [onLoginSuccess, navigate]);

    // 🆕 FIX: Если пользователь УЖЕ авторизован - сразу редиректим без показа ошибки
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            console.log('✅ [LoginPage] Пользователь уже авторизован, редирект на главную');
            
            // Очищаем токен из URL если он есть
            if (window.location.search.includes('token=')) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            handleNavigation();
        }
    }, [authLoading, isAuthenticated, handleNavigation]);

    // Авторизация по токену (из Telegram)
    useEffect(() => {
        // 🆕 FIX: НЕ пытаемся авторизоваться если:
        // 1. Ещё загружается состояние авторизации
        // 2. Пользователь уже авторизован  
        // 3. Мы уже пытались авторизоваться по токену
        if (authLoading || isAuthenticated || tokenAttempted) {
            return;
        }

        const token = getUrlParameter('token');

        if (token) {
            setTokenAttempted(true); // Помечаем что попытка была
            setAuthMethod('token');
            setMessage('🔗 Обнаружен токен Telegram. Выполняю автоматический вход...');
            setLoading(true);
            
            fetch(LOGIN_ENDPOINT_TOKEN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })
            .then(res => res.json())
            .then((data: { success: boolean, token?: string, user?: any, error?: string }) => {
                if (data.success && data.token && data.user) {
                    login(data.token, data.user); 
                    setMessage('✅ Успешный вход! Перенаправление...');
                    setTimeout(handleNavigation, 1000); 
                } else {
                    setMessage(`❌ Ошибка токена: ${data.error || 'Invalid, expired, or used token'}`);
                    setLoading(false);
                    
                    // Очищаем URL от невалидного токена
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            })
            .catch((error: Error) => {
                setMessage(`💥 Ошибка сети/сервера: ${error.message}. Пожалуйста, попробуйте войти вручную.`);
                setLoading(false);
                
                // Очищаем URL
                window.history.replaceState({}, document.title, window.location.pathname);
            });
        }
    }, [authLoading, isAuthenticated, tokenAttempted, handleNavigation, login]);

    // Авторизация по логину/паролю
    const handleFormSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('🔑 Выполняю вход...');

        if (!username || !password) {
            setMessage('❗️ Пожалуйста, введите логин и пароль.');
            setLoading(false);
            return;
        }
        
        try {
            const response = await fetch(LOGIN_ENDPOINT_CREDENTIALS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            
            if (response.ok && data.success && data.token && data.user) {
                login(data.token, data.user);
                setMessage('✅ Успешный вход! Перенаправление...');
                setTimeout(handleNavigation, 1000); 
            } else {
                setMessage(`❌ Ошибка входа: ${data.error || 'Неверный логин или пароль.'}`);
            }
        } catch (error: any) {
            setMessage(`💥 Ошибка сети: Не удалось связаться с сервером (${API_BASE_URL}).`);
        } finally {
            setLoading(false);
        }
    }, [username, password, handleNavigation, login]);

    // 🆕 Показываем лоадер пока проверяем авторизацию
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#101423] text-white flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-400" />
                    <p className="text-gray-400">Проверка авторизации...</p>
                </div>
            </div>
        );
    }

    // 🆕 Если уже авторизован - показываем сообщение (на случай медленного редиректа)
    if (isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#101423] text-white flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-green-400" />
                    <p className="text-green-400">✅ Вы уже авторизованы! Перенаправление...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#101423] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-10">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                        Авторизация Казино
                    </span>
                </h1>
                <Card className="max-w-md w-full">
                    <div className={`p-4 rounded-xl mb-6 ${loading ? 'bg-blue-900/50' : message.includes('❌') ? 'bg-red-900/30' : 'bg-transparent'}`}>
                        <p className={`text-center font-medium ${
                            loading ? 'text-blue-300' : 
                            message.includes('❌') ? 'text-red-400' :
                            message.includes('✅') ? 'text-green-400' :
                            'text-gray-400'
                        }`}>
                            {message || 
                            (authMethod === 'token' ? 'Ожидаем ответа сервера...' : 'Введите ваши данные для входа.')}
                        </p>
                    </div>

                    {authMethod === 'form' ? (
                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            <Input
                                type="text"
                                placeholder="Логин (Username или ID)"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                            />
                            <Input
                                type="password"
                                placeholder="Пароль"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <Button type="submit" disabled={loading} className="mt-4">
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <Loader2 className="w-5 h-5 mr-2" /> 
                                        Вход...
                                    </span>
                                ) : (
                                    'Войти в аккаунт'
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center space-y-4">
                            {loading && <Loader2 className="w-8 h-8 text-blue-400" />}
                            <p className="text-sm text-gray-400 text-center">
                                Если автоматический вход не сработает, попробуйте обновить страницу или 
                                запросите новую ссылку у Telegram-бота.
                            </p>
                            {/* 🆕 Кнопка для ручного входа если токен не сработал */}
                            {!loading && message.includes('❌') && (
                                <Button 
                                    onClick={() => {
                                        setAuthMethod('form');
                                        setMessage('');
                                    }}
                                    className="mt-4"
                                >
                                    Войти вручную
                                </Button>
                            )}
                        </div>
                    )}
                </Card>
                <div className="mt-8 text-center text-sm text-gray-500">
                    Нет аккаунта? Начните игру через <a href="https://t.me/SafariXCasinoBot" className="text-blue-400 hover:underline">Telegram</a>.
                </div>
            </div>
        </div>
    );
}