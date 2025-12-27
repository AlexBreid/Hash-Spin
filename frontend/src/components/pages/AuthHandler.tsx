// src/pages/AuthHandler.tsx

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ВАЖНО: Убедитесь, что Ngrok ЗАПУЩЕН и это его АКТУАЛЬНЫЙ HTTPS-адрес
// Если Ngrok перезапустится, этот адрес ИЗМЕНИТСЯ, и его нужно будет обновить здесь!
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const AuthHandler: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState('Авторизация...');

    // Определяем, идет ли загрузка, для отображения анимации
    const isLoading = status === 'Авторизация...';

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const oneTimeToken = params.get('token');

        if (!oneTimeToken) {
            setStatus('Ошибка: Токен не найден. Перенаправление на страницу входа.');
            // Добавляем replace: true, чтобы не оставлять страницу с токеном в истории
            navigate('/login', { replace: true }); 
            return;
        }

        const handleLogin = async () => {
            try {
                // 1. Отправляем токен на бэкенд для обмена
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
                // Обработка ошибки, которая сейчас происходит (Token rejected)
                // Ошибка авторизации. Токен недействителен или просрочен.
                setStatus('Ошибка авторизации. Проблема с токеном или API. Пожалуйста, попробуйте снова.'); 
                console.error("Auth Error:", error);

                // Если ошибка - перенаправляем на /login, чтобы избежать бесконечного цикла
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