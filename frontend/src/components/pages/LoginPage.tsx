import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // <<< 1. ИМПОРТ КОНТЕКСТА

// --- КОНФИГУРАЦИЯ ---
  const API_BASE_URL = import.meta.env.VITE_API_URL;
const LOGIN_ENDPOINT_TOKEN = `${API_BASE_URL}/login-with-token`;
const LOGIN_ENDPOINT_CREDENTIALS = `${API_BASE_URL}/login-with-credentials`;
// (Этот ключ больше не нужен здесь, он управляется AuthContext)
// const JWT_STORAGE_KEY = 'casino_jwt_token'; 

// --- ТИПЫ UI КОМПОНЕНТОВ (Имитация) ---
// ... (Ваши UI компоненты Loader2, Button, Input, Card) ...
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
// ... (Ваша функция getUrlParameter) ...
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
    const { login } = useAuth(); // <<< 2. ПОЛУЧАЕМ ФУНКЦИЮ LOGIN ИЗ КОНТЕКСТА

    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [authMethod, setAuthMethod] = useState<'form' | 'token'>('form'); 

    const handleNavigation = useCallback(() => {
        if (onLoginSuccess) {
            onLoginSuccess();
        } else {
            navigate('/');
        }
    }, [onLoginSuccess, navigate]);


    // 1. Авторизация по токену (из Telegram)
    useEffect(() => {
        const token = getUrlParameter('token');

        if (token) {
            setAuthMethod('token');
            setMessage('🔗 Обнаружен токен Telegram. Выполняю автоматический вход...');
            setLoading(true);
            
            fetch(LOGIN_ENDPOINT_TOKEN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })
            .then(res => res.json())
            // Ожидаем, что data содержит { success, token, user }
            .then((data: { success: boolean, token?: string, user?: any, error?: string }) => {
                // Проверяем, что токен И пользователь получены
                if (data.success && data.token && data.user) {
                    // <<< 3. ВЫЗЫВАЕМ LOGIN ИЗ КОНТЕКСТА
                    login(data.token, data.user); 
                    
                    setMessage('✅ Успешный вход! Перенаправление...');
                    setTimeout(handleNavigation, 1500); 
                } else {
                    setMessage(`❌ Ошибка токена: ${data.error || 'Токен недействителен или не получены данные.'}`);
                    setLoading(false);
                }
            })
            .catch((error: Error) => {
                setMessage(`💥 Ошибка сети/сервера: ${error.message}. Пожалуйста, попробуйте войти вручную.`);
                setLoading(false);
            });
        }
    }, [handleNavigation, login]); // <<< 4. ДОБАВЛЯЕМ LOGIN В ЗАВИСИМОСТИ

    // 2. Авторизация по логину/паролю
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
            
            // Ожидаем, что data содержит { success, token, user }
            if (response.ok && data.success && data.token && data.user) {
                // <<< 3. ВЫЗЫВАЕМ LOGIN ИЗ КОНТЕКСТА
                login(data.token, data.user);
                
                setMessage('✅ Успешный вход! Перенаправление...');
                setTimeout(handleNavigation, 1500); 
            } else {
                setMessage(`❌ Ошибка входа: ${data.error || 'Неверный логин или пароль.'}`);
            }
        } catch (error: any) {
            setMessage(`💥 Ошибка сети: Не удалось связаться с сервером (${API_BASE_URL}).`);
        } finally {
            setLoading(false);
        }
    }, [username, password, handleNavigation, login]); // <<< 4. ДОБАВЛЯЕМ LOGIN В ЗАВИСИМОСТИ

    // ... (Ваш JSX-код для рендеринга формы) ...
    return (
        <div className="min-h-screen bg-[#101423] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-10">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                        Авторизация Казино
                    </span>
                </h1>
                <Card className="max-w-md w-full">
                    <div className={`p-4 rounded-xl mb-6 ${loading ? 'bg-blue-900/50' : 'bg-transparent'}`}>
                        <p className={`text-center font-medium ${loading ? 'text-blue-300' : 'text-gray-400'}`}>
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
        C                 <Input
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
                            <p className="text-sm text-gray-400">
                                Если автоматический вход не сработает, попробуйте обновить страницу или 
                                запросите новую ссылку у Telegram-бота.
    g                   </p>
                        </div>
                    )}
                </Card>
                <div className="mt-8 text-center text-sm text-gray-500">
                    Нет аккаунта? Начните игру через <a href="tg://resolve?domain=YOUR_BOT_USERNAME" className="text-blue-400 hover:underline">Telegram</a>.
                </div>
            </div>
        </div>
    );
}