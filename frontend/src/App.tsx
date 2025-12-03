import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppInitializer } from './components/AppInitializer';
import { useAuth } from './context/AuthContext';
import { TopNavigation } from './components/TopNavigation';
import { BottomNavigation } from './components/BottomNavigation';
import { useLocation } from 'react-router-dom';

// Импортируем все страницы
import { HomePage } from './components/pages/HomePage';
import { AccountPage } from './components/pages/AccountPage';
import { RecordsPage } from './components/pages/RecordsPage';
import { ReferralsPage } from './components/pages/ReferralsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { SupportPage } from './components/pages/SupportPage';
import { LoginPage } from './components/pages/LoginPage';
import { CrashGame } from './components/pages/CrashGame';
import { WithdrawPage } from './components/pages/WithdrawPage';
import { MinesweeperPage } from './components/pages/MinesweeperPage';
import { Toaster } from './components/ui/sonner';
import { useNavigate } from 'react-router-dom';

const AUTH_REQUIRED_PAGES = ['home', 'records', 'referrals', 'account', 'settings', 'support', 'crash', 'withdraw', 'minesweeper'];

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading } = useAuth();
    
    const getCurrentPageFromURL = () => {
        const path = location.pathname.toLowerCase();
        if (path === '/' || path === '/home') return 'home';
        if (path === '/crash') return 'crash';
        if (path === '/minesweeper') return 'minesweeper';
        if (path === '/withdraw') return 'withdraw';
        if (path === '/records') return 'records';
        if (path === '/referrals') return 'referrals';
        if (path === '/account') return 'account';
        if (path === '/settings') return 'settings';
        if (path === '/support') return 'support';
        if (path === '/login') return 'login';
        return 'home';
    };

    const [currentPage, setCurrentPage] = useState(getCurrentPageFromURL());
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        setCurrentPage(getCurrentPageFromURL());
    }, [location.pathname]);

    useEffect(() => {
        if (loading) {
            return;
        }

        if (!isAuthenticated && currentPage !== 'login') {
            console.log('❌ Не аутентифицирован, редирект на login');
            navigate('/login');
            setCurrentPage('login');
        }

        if (isAuthenticated && currentPage === 'login') {
            console.log('✅ Аутентифицирован, перенаправление на home');
            navigate('/');
            setCurrentPage('home');
        }
    }, [isAuthenticated, loading, currentPage, navigate]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const handlePageChange = (page: string) => {
        if (!isAuthenticated && AUTH_REQUIRED_PAGES.includes(page)) {
            navigate('/login');
            setCurrentPage('login');
        } else {
            navigate(`/${page === 'home' ? '' : page}`);
            setCurrentPage(page);
        }
    };

    const handleThemeToggle = () => {
        setIsDarkMode(!isDarkMode);
    };

    const handleProfileClick = () => {
        handlePageChange('account');
    };

    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'login':
                return <LoginPage onLoginSuccess={() => {
                    navigate('/');
                    setCurrentPage('home');
                }} />;
            case 'home':
                return <HomePage />;
            case 'crash':
                return <CrashGame />;
            case 'minesweeper':
                return <MinesweeperPage onBack={() => handlePageChange('home')} />;
            case 'withdraw':
                return <WithdrawPage />;
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
                return isAuthenticated ? <HomePage /> : <LoginPage onLoginSuccess={() => {
                    navigate('/');
                    setCurrentPage('home');
                }} />;
        }
    };

    const isAuthPage = currentPage === 'login';
    const isCrashPage = currentPage === 'crash';
    const isMinesweeperPage = currentPage === 'minesweeper';
    const isWithdrawPage = currentPage === 'withdraw';

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
            {!isAuthPage && !isCrashPage && !isMinesweeperPage && !isWithdrawPage && <TopNavigation onProfileClick={handleProfileClick} />}

            <main className={
                isCrashPage ? 'h-full overflow-hidden' :
                isMinesweeperPage ? 'h-full overflow-hidden' :
                isWithdrawPage ? 'h-[calc(850px-70px)] overflow-y-auto' :
                isAuthPage ? 'h-full' : 
                'h-[calc(850px-140px)] overflow-y-auto'
            }>
                {renderCurrentPage()}
            </main>

            {!isAuthPage && !isCrashPage && !isMinesweeperPage && !isWithdrawPage && <BottomNavigation currentPage={currentPage} onPageChange={handlePageChange} />}

            <Toaster />
        </div>
    );
}

export default function AppLayout() {
    return (
        <AuthProvider>
            <AppInitializer>
                <AppContent />
            </AppInitializer>
        </AuthProvider>
    );
}