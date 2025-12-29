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
import PlinkoGame from './components/pages/games/Plinkogame';
import { Toaster } from './components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { BonusModal } from './components/modals/Bonusmodal';
import { BonusFloatingButton } from './components/modals/Bonusfloatingbutton';
import { PaymentSuccessPage } from './components/pages/PaymentSuccessPage';
import { PaymentFailedPage } from './components/pages/PaymentFailedPage';
import { CryptoCloudCallback } from './components/pages/CryptoCloudCallback';

// Новые компоненты
import { WelcomePage } from './components/pages/WelcomePage';
import { AuthModal } from './components/modals/AuthModal';
import { NotAuthenticated } from './components/pages/NotAuthenticated';

// Страницы, требующие авторизации (home и support доступны всем)
const AUTH_REQUIRED_PAGES = ['records', 'referrals', 'account', 'settings', 'crash', 'withdraw', 'minesweeper', 'plinko'];

// Ключ для localStorage - показывалась ли welcome страница
const WELCOME_SHOWN_KEY = 'safarix_welcome_shown';

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading, user, login } = useAuth();
    
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [hasBonusAvailable, setHasBonusAvailable] = useState(false);
    const [showFloatingButton, setShowFloatingButton] = useState(false);
    const [floatingButtonIndex, setFloatingButtonIndex] = useState(0);
    
    // Новые состояния для welcome и auth
    const [showWelcome, setShowWelcome] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Проверяем, показывать ли welcome страницу при первом входе
    useEffect(() => {
        const welcomeShown = localStorage.getItem(WELCOME_SHOWN_KEY);
        if (!welcomeShown && !isAuthenticated) {
            setShowWelcome(true);
        }
    }, []);

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

                if (response.status === 401) {
                    // Сессия истекла, logout уже выполнен в useDynamicApi
                    console.log('🔴 Сессия истекла при проверке бонуса');
                    setHasBonusAvailable(false);
                    return;
                }

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

    // Автоматический редирект на логин при выходе из системы
    useEffect(() => {
        if (!loading && !isAuthenticated && AUTH_REQUIRED_PAGES.includes(currentPage)) {
            console.log('🔴 Пользователь не авторизован, редирект на логин');
            navigate('/login');
            setCurrentPage('login');
        }
    }, [isAuthenticated, loading, currentPage, navigate]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Обработчик завершения Welcome страницы
    const handleWelcomeEnter = () => {
        localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
        setShowWelcome(false);
    };

    // Обработчик успешного входа из модалки
    const handleAuthModalSuccess = () => {
        setShowAuthModal(false);
        // Перезагружаем страницу чтобы обновить состояние
        window.location.reload();
    };

    // Обработчик открытия модалки авторизации
    const handleOpenAuthModal = () => {
        setShowAuthModal(true);
    };

    const handlePageChange = (page: string) => {
        // Переходим на страницу независимо от авторизации
        // Заглушка NotAuthenticated покажется при рендере если нужно
        navigate(`/${page === 'home' ? '' : page}`);
        setCurrentPage(page);
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
        // Проверяем нужна ли авторизация для этой страницы
        const needsAuth = AUTH_REQUIRED_PAGES.includes(currentPage);
        
        // Если нужна авторизация, но пользователь не авторизован - показываем NotAuthenticated
        if (needsAuth && !isAuthenticated) {
            return (
                <NotAuthenticated 
                    title="Вы не авторизованы"
                    description="Войдите или зарегистрируйтесь, чтобы получить доступ к этому разделу"
                    onLogin={handleOpenAuthModal}
                    onRegister={() => window.open('https://t.me/SafariXCasinoBot', '_blank')}
                />
            );
        }

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
                return <PlinkoGame />;
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
                return <HomePage />;
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

    // Показываем Welcome страницу для новых пользователей
    if (showWelcome) {
        return (
            <div className="min-h-screen w-full max-w-[390px] mx-auto" style={{ height: '850px' }}>
                <WelcomePage onEnter={handleWelcomeEnter} />
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

            {/* Модалка авторизации */}
            <AuthModal 
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onLoginSuccess={handleAuthModalSuccess}
            />

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