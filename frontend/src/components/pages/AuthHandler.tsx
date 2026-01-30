// src/pages/AuthHandler.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Ключи для localStorage (должны совпадать с AuthContext)
const TOKEN_KEY = 'casino_jwt_token';
const USER_KEY = 'user';

const AuthHandler: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Авторизация...');

    const isLoading = status === 'Авторизация...';

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oneTimeToken = params.get('token');

        // 🆕 FIX: Проверяем, авторизован ли пользователь УЖЕ
        const existingToken = localStorage.getItem(TOKEN_KEY);
        const existingUser = localStorage.getItem(USER_KEY);

        if (existingToken && existingUser) {
            
            // Уже авторизован - просто редиректим на главную
            navigate('/', { replace: true });
            return;
        }

        if (!oneTimeToken) {
            setStatus('Ошибка: Токен не найден. Перенаправление на страницу входа.');
            navigate('/login', { replace: true }); 
            return;
        }

        const handleLogin = async () => {
            try {
                const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login-with-token`, { 
                    token: oneTimeToken
                });

                const { token: sessionToken, user } = response.data;
                
                // 🆕 Сохраняем и токен, и пользователя
                localStorage.setItem(TOKEN_KEY, sessionToken);
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                
                setStatus(`Успешный вход! Добро пожаловать, ${user.firstName || user.username}.`);
                
                navigate('/', { replace: true }); 

            } catch (error) {
                setStatus('Ошибка авторизации. Проблема с токеном или API. Пожалуйста, попробуйте снова.'); 
                

                navigate('/login', { replace: true }); 
            }
        };

        handleLogin();
    }, [location.search, navigate]);

    return (
        // ИСПРАВЛЕНО: Используем bg-background и text-foreground для поддержки темы
        <div className="auth-handler-page flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
            
            {/* Анимация загрузки */}
            {isLoading && (
                // Используем border-primary (синий цвет в вашей палитре)
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-6"></div>
            )}

            <h1 className="text-2xl font-bold text-center">{status}</h1>
            
            {/* Кнопка отображается только при ошибке */}
            {status.includes('Ошибка') && (
                <button 
                    onClick={() => navigate('/login')} 
                    // Используем bg-destructive (красный цвет в вашей палитре)
                    className="mt-6 p-3 px-6 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/80 transition duration-300 shadow-lg"
                >
                    Перейти ко входу
                </button>
            )}
        </div>
    );
};

export default AuthHandler;
