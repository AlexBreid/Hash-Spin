import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

// ВАЖНО: Убедитесь, что Ngrok ЗАПУЩЕН и это его АКТУАЛЬНЫЙ HTTPS-адрес
const API_BASE_URL = 'https://bullheadedly-mobilizable-paulene.ngrok-free.dev'; 

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
            navigate('/login', { replace: true }); 
            return;
        }

        const handleLogin = async () => {
            try {
                // 1. Отправляем токен на бэкенд для обмена
                // Полный путь: https://bullheadedly-mobilizable-paulene.ngrok-free.dev/api/v1/auth/login-with-token
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
                // Это должно быть самой частой ошибкой (просроченный токен или CORS)
                setStatus('Ошибка авторизации. Токен недействителен или просрочен.');
                console.error("Auth Error:", error);
                navigate('/login', { replace: true }); 
            }
        };

        handleLogin();
    }, [location.search, navigate]);

    return (
        // Улучшены стили для центрирования и добавлен отступ
        <div className="auth-handler-page flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
            
            {/* Анимация загрузки, которая отображается только при 'Авторизация...' */}
            {isLoading && (
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-6"></div>
            )}

            <h1 className="text-2xl font-bold text-center">{status}</h1>
            
            {/* Кнопка отображается только при ошибке */}
            {status.includes('Ошибка') && (
                <button 
                    onClick={() => navigate('/login')} 
                    // Улучшенный красный стиль кнопки
                    className="mt-6 p-3 px-6 bg-red-600 rounded-lg hover:bg-red-700 transition duration-300 shadow-lg"
                >
                    Перейти ко входу
                </button>
            )}
        </div>
    );
};

export default AuthHandler;