import React from 'react';

const LoginPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-gray-900 text-white">
            <h1 className="text-xl font-bold mb-4">Авторизация не удалась</h1>
            <p className="text-sm text-gray-400 mb-8">
                Произошла ошибка или ссылка авторизации истекла. Пожалуйста, вернитесь в Telegram-бот и нажмите кнопку "Войти" еще раз.
            </p>
        </div>
    );
};

export default LoginPage;