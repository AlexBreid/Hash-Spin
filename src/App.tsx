import { useState, useEffect } from 'react';
// Импортируйте все ваши компоненты страниц
import { TopNavigation } from './components/TopNavigation';
import { BottomNavigation } from './components/BottomNavigation';
import { HomePage } from './components/pages/HomePage';
import { AccountPage } from './components/pages/AccountPage';
import { RecordsPage } from './components/pages/RecordsPage';
import { ReferralsPage } from './components/pages/ReferralsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { SupportPage } from './components/pages/SupportPage';
import { Toaster } from "./components/ui/sonner";

// *** ФУНКЦИЯ ПЕРЕИМЕНОВАНА В AppLayout ***
export default function AppLayout() { 
    const [currentPage, setCurrentPage] = useState('home');
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        // Apply dark mode class to document
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        
        // ВАЖНО: Проверка авторизации. Если нет JWT-токена, перенаправить на /login.
        // Эту логику лучше вынести в отдельный компонент Guard, но для простоты:
        const token = localStorage.getItem('casino_jwt_token');
        if (!token) {
            // Если вы используете useNavigate (нужно импортировать), можно перенаправить.
            // Но в Mini App мы просто показываем страницу входа или заглушку.
            // В данной архитектуре предполагаем, что пользователь авторизован,
            // поскольку /auth уже выполнил проверку.
        }
        
    }, [isDarkMode]);

    const handleThemeToggle = () => {
        setIsDarkMode(!isDarkMode);
    };

    const handleProfileClick = () => {
        setCurrentPage('account');
    };

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage />;
            case 'records':
                return <RecordsPage />;
            case 'referrals':
                return <ReferralsPage />;
            case 'account':
                return <AccountPage />;
            case 'settings':
                return <SettingsPage isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} onNavigate={setCurrentPage} />;
            case 'support':
                return <SupportPage />;
            default:
                return <HomePage />;
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground w-full max-w-[390px] mx-auto relative" style={{ height: '850px' }}>
            <TopNavigation onProfileClick={handleProfileClick} />
            
            <main className="h-[calc(850px-140px)] overflow-y-auto">
                {renderCurrentPage()}
            </main>
            
            <BottomNavigation 
                currentPage={currentPage} 
                onPageChange={setCurrentPage} 
            />
            
            <Toaster />
        </div>
    );
}