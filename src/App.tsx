import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppInitializer } from './components/AppInitializer';
import { useAuth } from './context/AuthContext';
import { TopNavigation } from './components/TopNavigation';
import { BottomNavigation } from './components/BottomNavigation';
import { HomePage } from './components/pages/HomePage';
import { AccountPage } from './components/pages/AccountPage';
import { RecordsPage } from './components/pages/RecordsPage';
import { ReferralsPage } from './components/pages/ReferralsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { SupportPage } from './components/pages/SupportPage';
import { LoginPage } from './components/pages/LoginPage';
import { Toaster } from './components/ui/sonner';
import { useNavigate } from 'react-router-dom';

// Определяем страницы, которые требуют авторизации
const AUTH_REQUIRED_PAGES = ['home', 'records', 'referrals', 'account', 'settings', 'support'];

/**
 * Внутренний компонент (внутри AuthProvider и AppInitializer), 
 * который содержит всю логику навигации и рендеринга страниц.
 */
function AppContent() {
    // navigate используется здесь для перенаправления после выхода из системы
    const navigate = useNavigate();
    // Хук useAuth() теперь безопасен, так как AppContent находится внутри AuthProvider
    const { isAuthenticated, loading } = useAuth(); 
    
    const [currentPage, setCurrentPage] = useState('home');
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Логика перенаправления при загрузке/авторизации
    useEffect(() => {
        if (loading) {
            return;
        }

        // Если не авторизован - идем на login через роутер
        if (!isAuthenticated && currentPage !== 'login') {
            navigate('/login'); 
            setCurrentPage('login');
        }

        // Если авторизован и на login - идем на home
        // Эта логика сработает СРАЗУ ПОСЛЕ вызова login() в LoginPage
        if (isAuthenticated && currentPage === 'login') {
            setCurrentPage('home');
            // navigate('/') здесь не нужен, т.к. onLoginSuccess из LoginPage уже это делает
        }
    }, [isAuthenticated, loading, currentPage, navigate]);

    // Применение темной темы
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const handlePageChange = (page: string) => {
        // Если не авторизован, но пытается перейти на защищенную страницу
        if (!isAuthenticated && AUTH_REQUIRED_PAGES.includes(page)) {
            navigate('/login');
            setCurrentPage('login');
        } else {
            setCurrentPage(page);
        }
    };

    const handleThemeToggle = () => {
        setIsDarkMode(!isDarkMode);
    };

    const handleProfileClick = () => {
        handlePageChange('account');
    };

    // Функция, которая рендерит нужный компонент страницы
    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'login':
                // После успешного входа используем navigate, чтобы обновить URL
                return <LoginPage onLoginSuccess={() => navigate('/')} />; 
            case 'home':
                return <HomePage />;
            case 'records':
                return <RecordsPage />;
            case 'referrals':
                return <ReferralsPage />;
            case 'account':
                return <AccountPage />;
            case 'settings':
                return (
                    <SettingsPage
                        isDarkMode={isDarkMode}
                        onThemeToggle={handleThemeToggle}
                        onNavigate={handlePageChange}
                    />
                );
            case 'support':
                return <SupportPage />;
            default:
                return isAuthenticated ? <HomePage /> : <LoginPage onLoginSuccess={() => navigate('/')} />;
        }
    };

    const isAuthPage = currentPage === 'login';

    // Показываем загрузку пока проверяется авторизация
    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground w-full max-w-[390px] mx-auto flex items-center justify-center">
                <p className="text-muted-foreground">Загружение...</p>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-background text-foreground w-full max-w-[390px] mx-auto relative"
            style={{ height: '850px' }}
        >
            {!isAuthPage && <TopNavigation onProfileClick={handleProfileClick} />}

            <main className={isAuthPage ? 'h-full' : 'h-[calc(850px-140px)] overflow-y-auto'}>
                {renderCurrentPage()}
            </main>

            {!isAuthPage && <BottomNavigation currentPage={currentPage} onPageChange={handlePageChange} />}

            <Toaster />
        </div>
    );
}

/**
 * Главный AppLayout компонент. 
 * Оборачивает AppContent в AuthProvider и AppInitializer.
 * Это тот компонент, который импортируется в main.jsx.
 */
export default function AppLayout() {
    return (
        <AuthProvider>
            <AppInitializer>
                <AppContent />
            </AppInitializer>
        </AuthProvider>
    );
}