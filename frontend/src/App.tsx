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
import PlinkoGame from './components/pages/games/Plinkogame';  // ✅ Исправлено
import { Toaster } from './components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { BonusModal } from './components/modals/Bonusmodal';
import { BonusFloatingButton } from './components/modals/Bonusfloatingbutton';
import { PaymentSuccessPage } from './components/pages/PaymentSuccessPage';
import { PaymentFailedPage } from './components/pages/PaymentFailedPage';
import { CryptoCloudCallback } from './components/pages/CryptoCloudCallback';

const AUTH_REQUIRED_PAGES = ['home', 'records', 'referrals', 'account', 'settings', 'support', 'crash', 'withdraw', 'minesweeper', 'plinko'];

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading, user } = useAuth();
    
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [hasBonusAvailable, setHasBonusAvailable] = useState(false);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const [floatingButtonIndex, setFloatingButtonIndex] = useState(0);

    const getCurrentPageFromURL = () => {
        const path = location.pathname.toLowerCase();
        if (path === '/' || path === '/home') return 'home';
        if (path === '/crash') return 'crash';
        if (path === '/minesweeper') return 'minesweeper';
        if (path === '/plinko') return 'plinko';
        if (path === '/withdraw') return 'withdraw';
        if (path === '/records') return 'records';
        if (path === '/referrals') return 'referrals';
        if (path === '/account') return 'account';
        if (path === '/settings') return 'settings';
        if (path === '/support') return 'support';
        if (path === '/login') return 'login';
        if (path === '/callback') return 'callback';
        if (path === '/successful-payment') return 'successful-payment';
        if (path === '/failed-payment') return 'failed-payment';
        return 'home';
    };

    const [currentPage, setCurrentPage] = useState(getCurrentPageFromURL());
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Проверяем доступность бонуса
    useEffect(() => {
        const checkBonusAvailability = async () => {
            if (!isAuthenticated || !user?.id) {
                setHasBonusAvailable(false);
                return;
            }

            try {
                const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                const token = localStorage.getItem('casino_jwt_token') || localStorage.getItem('authToken') || localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/v1/deposit/check-bonus`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    console.error('❌ Failed to check bonus availability');
                    setHasBonusAvailable(false);
                    return;
                }

                const data = await response.json();
                setHasBonusAvailable(data.canUseBonus === true);
            } catch (error) {
                console.error('❌ Error checking bonus:', error);
                setHasBonusAvailable(false);
            }
        };

        checkBonusAvailability();
        
        // Проверяем каждые 30 сек
        const interval = setInterval(checkBonusAvailability, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated, user?.id]);

    // Управляем плавающей кнопкой
    useEffect(() => {
        if (!hasBonusAvailable) {
            setShowFloatingButton(false);
            return;
        }

        // Показываем кнопку каждые 5 секунд (периодичность)
        const showInterval = setInterval(() => {
            setShowFloatingButton(true);
            setFloatingButtonIndex(prev => (prev + 1) % 4); // 4 позиции
        }, 5000);

        // Скрываем через 2.5 сек
        const hideTimeout = setTimeout(() => {
            setShowFloatingButton(false);
        }, 2500);

        return () => {
            clearInterval(showInterval);
            clearTimeout(hideTimeout);
        };
    }, [hasBonusAvailable]);

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

    const handleBonusLearnMore = () => {
        setShowBonusModal(false);
        handlePageChange('support');
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
            case 'plinko':
                return <PlinkoGame />;  // ✅ Используем правильный компонент
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
            case 'callback':
                return <CryptoCloudCallback />;
            case 'successful-payment':
                return <PaymentSuccessPage />;
            case 'failed-payment':
                return <PaymentFailedPage />;
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
    const isPlinkoPage = currentPage === 'plinko';
    const isWithdrawPage = currentPage === 'withdraw';
    const isCallbackPage = currentPage === 'callback' || currentPage === 'successful-payment' || currentPage === 'failed-payment';
    const isGamePage = isCrashPage || isMinesweeperPage || isPlinkoPage;
    const isFullscreenPage = isGamePage || isCallbackPage;

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
            {!isAuthPage && !isFullscreenPage && !isWithdrawPage && <TopNavigation onProfileClick={handleProfileClick} />}

            <main className={
                isFullscreenPage ? 'h-full overflow-hidden' :
                isWithdrawPage ? 'h-[calc(850px-70px)] overflow-y-auto' :
                isAuthPage ? 'h-full' : 
                'h-[calc(850px-140px)] overflow-y-auto'
            }>
                {renderCurrentPage()}
            </main>

            {!isAuthPage && !isFullscreenPage && !isWithdrawPage && <BottomNavigation currentPage={currentPage} onPageChange={handlePageChange} />}

            {/* Плавающая кнопка с подарком */}
            {showFloatingButton && hasBonusAvailable && (
                <BonusFloatingButton 
                    position={floatingButtonIndex}
                    onClick={() => {
                        setShowBonusModal(true);
                        setShowFloatingButton(false);
                    }}
                />
            )}

            {/* Модалка бонуса */}
            {showBonusModal && (
                <BonusModal
                    onClose={() => setShowBonusModal(false)}
                    onLearnMore={handleBonusLearnMore}
                />
            )}

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