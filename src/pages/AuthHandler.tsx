// src/pages/AuthHandler.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ИСПРАВЛЕНО: Базовый URL вашего API (без пути к сервису)
const API_BASE_URL = 'https://bullheadedly-mobilizable-paulene.ngrok-free.dev'; 

const AuthHandler: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Авторизация...');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oneTimeToken = params.get('token');

        if (!oneTimeToken) {
            setStatus('Ошибка: Токен не найден. Перенаправление на страницу входа.');
            // Перенаправляем на /login, который мы настроили в index.tsx
            navigate('/login'); 
            return;
        }

        const handleLogin = async () => {
            try {
                // 1. Отправляем токен на бэкенд для обмена
                // Указываем полный путь к эндпоинту бэкенда
                const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login-with-token`, { 
                    token: oneTimeToken
                });

                const { token: sessionToken, user } = response.data;
                
                // 2. Сохраняем постоянный токен
                localStorage.setItem('casino_jwt_token', sessionToken);
                
                setStatus(`Успешный вход! Добро пожаловать, ${user.firstName || user.username}.`);
                
                // 3. Очищаем URL и перенаправляем на главную
                navigate('/', { replace: true }); 

            } catch (error) {
                setStatus('Ошибка авторизации. Токен недействителен или просрочен.');
                console.error("Auth Error:", error);
                // При ошибке отправляем на страницу входа
                navigate('/login'); 
            }
        };

        handleLogin();
    }, [location.search, navigate]);

    return (
        <div className="auth-handler-page flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <h1 className="text-2xl font-bold">{status}</h1>
            {status.includes('Ошибка') && (
                <button 
                    onClick={() => navigate('/login')} 
                    className="mt-4 p-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Перейти ко входу
                </button>
            )}
        </div>
    );
};

export default AuthHandler;