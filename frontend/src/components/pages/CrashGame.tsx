import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { crashGameService } from '../../services/crashGameService';
import type { CrashGameState } from '../../services/crashGameService';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../hooks/useBalance';
import { Zap, TrendingUp, Users, ArrowLeft, Timer, Flame, RefreshCw, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GameHeader } from './games/GameHeader';
import './games/games.css';

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
    {children}
  </div>
);

const MAX_WAIT_TIME = 10;
const STORAGE_KEY = 'crash_game_history';
const MAX_HISTORY_ITEMS = 10;
const MIN_BET = 0.1;

// 🔧 FIX #1: Буфер для сглаживания множителя (предотвращает резкие скачки)
const MULTIPLIER_LERP_SPEED = 0.3; // Скорость интерполяции (0.1 = медленно, 1.0 = мгновенно)

interface CrashHistory {
  id: string;
  gameId?: string;
  crashPoint: number;
  timestamp: number;
}

interface BalanceData {
  tokenId: number;
  amount: number;
  type: 'MAIN' | 'BONUS';
}

export function CrashGame() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { balances, fetchBalances } = useBalance();

  const [gameState, setGameState] = useState<CrashGameState>({
    gameId: '',
    status: 'waiting',
    multiplier: 1.0,
    crashPoint: null,
    countdown: 0,
  });

  const [inputBet, setInputBet] = useState('10');
  const [selectedTokenId, setSelectedTokenId] = useState(2);
  const [betPlaced, setBetPlaced] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [canCashout, setCanCashout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playersCount, setPlayersCount] = useState(0);
  const [cashoutStatus, setCashoutStatus] = useState<'pending' | 'won' | 'lost' | null>(null);
  
  const [mainBalance, setMainBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  
  const [balanceType, setBalanceType] = useState<string | null>(null);
  const [userBonusId, setUserBonusId] = useState<string | null>(null);
  
  const [crashHistory, setCrashHistory] = useState<CrashHistory[]>([]);
  const [activeCrash, setActiveCrash] = useState<CrashHistory | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const crashHistoryRef = useRef<HTMLDivElement>(null);

  // 🔧 FIX #2: Ref для серверного множителя (истинное значение с сервера)
  const serverMultiplierRef = useRef<number>(1.0);
  // Визуальный множитель для плавной анимации
  const visualMultiplierRef = useRef<number>(1.0);
  // Флаг что игра крашнулась (для мгновенной остановки анимации)
  const isCrashedRef = useRef<boolean>(false);
  // Точка краша с сервера
  const crashPointRef = useRef<number | null>(null);

  const sessionKeys = useMemo(() => ({
    betId: `crash_pending_bet_${user?.id}`,
    currentBet: `crash_current_bet_${user?.id}`,
    balanceType: `crash_balance_type_${user?.id}`,
    userBonusId: `crash_user_bonus_id_${user?.id}`,
  }), [user?.id]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const drawChartRef = useRef<() => void>(() => {});

  const saveHistoryToStorage = useCallback((history: CrashHistory[]) => {
    try {
      const toSave = history.slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      console.log('💾 История сохранена в localStorage:', toSave.length);
    } catch (error) {
      console.error('❌ Ошибка сохранения истории:', error);
    }
  }, []);

  useEffect(() => {
    const storedBetId = sessionStorage.getItem(sessionKeys.betId);
    const storedBet = sessionStorage.getItem(sessionKeys.currentBet);
    const storedBalanceType = sessionStorage.getItem(sessionKeys.balanceType);
    const storedUserBonusId = sessionStorage.getItem(sessionKeys.userBonusId);

    if (storedBetId && storedBet) {
      console.log('✅ [RECOVERY] Восстанавливаю ставку из sessionStorage:', storedBetId);
      setBetPlaced(true);
      setCurrentBet(parseFloat(storedBet));
      
      if (storedBalanceType) setBalanceType(storedBalanceType);
      if (storedUserBonusId) setUserBonusId(storedUserBonusId);
    }
  }, [sessionKeys.betId, sessionKeys.currentBet, sessionKeys.balanceType, sessionKeys.userBonusId]);

  useEffect(() => {
    if (balances && Array.isArray(balances)) {
      const main = parseFloat((balances.find((b: any) => b.type === 'MAIN')?.amount ?? 0).toString());
      const bonus = parseFloat((balances.find((b: any) => b.type === 'BONUS')?.amount ?? 0).toString());
      const total = main + bonus;

      console.log(`💰 [CRASH] Балансы обновлены: Main=${main}, Bonus=${bonus}, Total=${total}`);

      setMainBalance(main);
      setBonusBalance(bonus);
      setTotalBalance(total);
    }
  }, [balances]);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    const init = async () => {
      try {
        console.log('🔄 [INIT] Сбрасываю состояние игры...');
        setGameState({
          gameId: '',
          status: 'waiting',
          multiplier: 1.0,
          crashPoint: null,
          countdown: 0,
        });
        setBetPlaced(false);
        setCanCashout(false);
        setCurrentBet(0);
        setBalanceType(null);
        setUserBonusId(null);
        
        // 🔧 FIX: Сброс ref-ов
        serverMultiplierRef.current = 1.0;
        visualMultiplierRef.current = 1.0;
        isCrashedRef.current = false;
        crashPointRef.current = null;
        
        sessionStorage.removeItem(sessionKeys.betId);
        sessionStorage.removeItem(sessionKeys.currentBet);
        sessionStorage.removeItem(sessionKeys.balanceType);
        sessionStorage.removeItem(sessionKeys.userBonusId);
        
        console.log('🔌 Подключаюсь к серверу...');
        await crashGameService.connect(user.id, user.firstName || `User${user.id}`, token);
        console.log('✅ Подключен');
        toast.success('🚀 Подключено!');
        
        await fetchBalances();

        console.log('📥 ЗАГРУЖАЮ ИСТОРИЮ СО СЕРВЕРА (skip:2 - БЕЗОПАСНО)...');
        
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
          console.log(`📡 Запрашиваю: ${API_URL}/api/v1/crash/last-crashes`);
          
          const response = await fetch(`${API_URL}/api/v1/crash/last-crashes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          console.log(`📊 Ответ сервера: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('📦 Данные с сервера:', data);
            
            if (data.success && Array.isArray(data.data)) {
              const formatted = data.data
                .filter((crash: any) => crash.crashPoint != null)
                .map((crash: any) => ({
                  id: crash.id || crash.gameId || `crash_${Date.now()}_${Math.random()}`,
                  gameId: crash.gameId,
                  crashPoint: parseFloat(crash.crashPoint.toString()),
                  timestamp: new Date(crash.timestamp).getTime(),
                }))
                .slice(0, MAX_HISTORY_ITEMS);

              console.log(`✅ Загружено ${formatted.length} БЕЗОПАСНЫХ крашей со сервера`);
              console.log('🛡️  Безопасность: Последние 2 краша пропущены (skip:2 на бэке)');
              console.log('🎯 Краши:', formatted);

              setCrashHistory(formatted);
              saveHistoryToStorage(formatted);
            } else {
              console.warn('⚠️ Неправильный формат данных:', data);
            }
          } else {
            console.error(`❌ Ошибка сервера: ${response.status} ${response.statusText}`);
          }
        } catch (error: any) {
          console.error('❌ Ошибка загрузки истории:', error.message);
        } finally {
          setIsHistoryLoaded(true);
          console.log('✅ ИСТОРИЯ ЗАГРУЖЕНА И ГОТОВА К ИСПОЛЬЗОВАНИЮ!');
        }
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        toast.error('❌ Ошибка подключения');
        setIsHistoryLoaded(true);
      }
    };

    init();

    return () => {
      console.log('🧹 Отключаюсь');
      crashGameService.disconnect();
    };
  }, [user, token, navigate, fetchBalances, saveHistoryToStorage, sessionKeys]);

  useEffect(() => {
    if (crashHistory.length > 0) {
      saveHistoryToStorage(crashHistory);
    }
  }, [crashHistory, saveHistoryToStorage]);

  // 🔧 FIX #3: Используем визуальный множитель для отображения
  // При краше - показываем точку краша, иначе - плавно интерполированное значение
  const currentCrashPoint = activeCrash?.crashPoint ?? gameState.crashPoint;
  const displayMultiplier = gameState.status === 'crashed' && currentCrashPoint 
    ? currentCrashPoint 
    : visualMultiplierRef.current;

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 🔧 FIX #4: Интерполяция множителя для плавной анимации
    // Если игра крашнулась - мгновенно показываем точку краша
    if (isCrashedRef.current && crashPointRef.current !== null) {
      visualMultiplierRef.current = crashPointRef.current;
    } else if (gameState.status === 'flying') {
      // Плавная интерполяция к серверному значению
      const diff = serverMultiplierRef.current - visualMultiplierRef.current;
      visualMultiplierRef.current += diff * MULTIPLIER_LERP_SPEED;
      
      // Если разница минимальна - синхронизируем полностью
      if (Math.abs(diff) < 0.001) {
        visualMultiplierRef.current = serverMultiplierRef.current;
      }
    } else if (gameState.status === 'waiting') {
      visualMultiplierRef.current = 1.0;
      serverMultiplierRef.current = 1.0;
    }

    const currentVisualMultiplier = visualMultiplierRef.current;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    const graphWidth = w - padding * 2;
    const graphHeight = h - padding * 2;

    ctx.clearRect(0, 0, w, h);

    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#0f1419');
    bgGradient.addColorStop(1, '#0a0e17');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }

    for (let i = 0; i <= 10; i++) {
      const x = padding + (graphWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, h - padding);
      ctx.stroke();
    }

    if (gameState.status === 'waiting') {
      const radius = 40 + Math.sin(Date.now() / 300) * 8;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.fillText('Ожидание...', w / 2, h / 2 + 50);
      return;
    }

    const maxMult = Math.max(5, Math.ceil(currentVisualMultiplier * 1.3));
    
    const multToY = (mult: number): number => {
      const normalized = Math.min(mult, maxMult) / maxMult;
      return h - padding - normalized * graphHeight;
    };

    const progress = Math.min(1, (currentVisualMultiplier - 1) / (maxMult - 1));
    const curveProgress = Math.pow(progress, 0.6);
    const headX = padding + curveProgress * graphWidth;
    const headY = multToY(currentVisualMultiplier);

    const points: { x: number; y: number; mult: number }[] = [];
    const steps = 150;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mult = 1 + Math.pow(t, 1.5) * (maxMult - 1);
      
      if (mult > currentVisualMultiplier) break;

      const x = padding + t * graphWidth;
      const y = multToY(mult);
      points.push({ x, y, mult });
    }

    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(padding, h - padding);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, h - padding);
      ctx.closePath();

      const fillGradient = ctx.createLinearGradient(0, padding, 0, h - padding);
      if (gameState.status === 'crashed') {
        fillGradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        fillGradient.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
      } else {
        fillGradient.addColorStop(0, 'rgba(34, 197, 94, 0.35)');
        fillGradient.addColorStop(1, 'rgba(34, 197, 94, 0.05)');
      }
      ctx.fillStyle = fillGradient;
      ctx.fill();
    }

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = gameState.status === 'crashed' ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    if (gameState.status === 'flying' && points.length > 0) {
      const pulse = 14 + Math.sin(Date.now() / 150) * 6;
      
      ctx.beginPath();
      ctx.arc(headX, headY, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(headX, headY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(headX - 3, headY - 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.stroke();

    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

    for (let i = 0; i <= 5; i++) {
      const mult = (maxMult / 5) * (5 - i);
      const y = padding + (graphHeight / 5) * i;
      ctx.fillText(`${mult.toFixed(1)}x`, padding - 12, y);
    }

    if (gameState.status === 'crashed') {
      ctx.font = 'bold 40px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      // 🔧 FIX: Показываем точную точку краша с сервера
      const crashDisplay = crashPointRef.current ?? gameState.crashPoint ?? currentVisualMultiplier;
      ctx.fillText(`КРАХ @ ${crashDisplay.toFixed(2)}x`, w / 2, h / 2);
      ctx.shadowBlur = 0;
    }
  }, [gameState.status, gameState.crashPoint]);

  useEffect(() => {
    drawChartRef.current = drawChart;
  }, [drawChart]);

  useEffect(() => {
    const animate = () => {
      drawChartRef.current();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handlePlaceBet = async () => {
    const amount = parseFloat(inputBet);
    
    if (!amount || amount <= 0) {
      toast.error('❌ Введите сумму ставки');
      return;
    }
    if (amount < MIN_BET) {
      toast.error(`❌ Минимальная ставка: $${MIN_BET.toFixed(2)}`);
      return;
    }
    if (amount > totalBalance) {
      toast.error(`❌ Недостаточно средств (доступно: ${totalBalance.toFixed(2)} $)`);
      return;
    }
    
    try {
      setIsLoading(true);
      await crashGameService.placeBet(amount, selectedTokenId);
    } catch (e) {
      console.error('Bet error:', e);
      toast.error('❌ Ошибка ставки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashout = async () => {
    try {
      setIsLoading(true);
      console.log(`💸 [CASHOUT] balanceType=${balanceType}, userBonusId=${userBonusId}`);
      await crashGameService.cashout(balanceType || 'MAIN', userBonusId);
    } catch (e) {
      console.error('Cashout error:', e);
      toast.error('❌ Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBetChange = useCallback((multiplier: number) => {
    setInputBet((prev) => {
      const newVal = parseFloat(prev || '0') * multiplier;
      return newVal > 0 ? newVal.toFixed(2) : prev;
    });
  }, []);

  const waitingProgress = Math.min(100, (gameState.countdown / MAX_WAIT_TIME) * 100);
  // 🔧 FIX: Используем серверный множитель для расчёта выигрыша (не визуальный!)
  const potentialWinnings = serverMultiplierRef.current * parseFloat(inputBet);

  useEffect(() => {
    const handleGameCrashed = (data: any) => {
      // 🔧 FIX #5: КРИТИЧНО - сначала устанавливаем флаг краша и точку краша
      // ДО обновления state, чтобы анимация сразу остановилась на правильном значении
      isCrashedRef.current = true;
      crashPointRef.current = parseFloat(data.crashPoint.toString());
      visualMultiplierRef.current = crashPointRef.current;
      serverMultiplierRef.current = crashPointRef.current;
      
      console.log(`💥 [CRASH] Сервер сообщил о краше: ${crashPointRef.current}x`);
      
      setGameState((prev) => ({
        ...prev,
        status: 'crashed',
        crashPoint: crashPointRef.current,
        gameId: data.gameId,
      }));
      setCanCashout(false);
      setBetPlaced(false);
      setCashoutStatus('lost');

      sessionStorage.removeItem(sessionKeys.betId);
      sessionStorage.removeItem(sessionKeys.currentBet);
      sessionStorage.removeItem(sessionKeys.balanceType);
      sessionStorage.removeItem(sessionKeys.userBonusId);
      
      setBalanceType(null);
      setUserBonusId(null);

      const newCrash: CrashHistory = {
        id: data.gameId || `crash_${Date.now()}_${Math.random()}`,
        gameId: data.gameId,
        crashPoint: crashPointRef.current!,
        timestamp: Date.now(),
      };

      setActiveCrash(newCrash);

      setCrashHistory((prev) => {
        const updated = [newCrash, ...prev].slice(0, MAX_HISTORY_ITEMS);
        console.log(`✅ История обновлена: ${updated.length} крашей`);
        return updated;
      });

      setTimeout(() => {
        setActiveCrash(null);
        setCashoutStatus(null);
      }, 1500);
    };

    const handlePlayerJoined = (data: { playersCount: number }) => setPlayersCount(data.playersCount);
    
    const handleBetPlaced = (data: any) => {
      setBetPlaced(true);
      const betAmount = data.bet ?? 0;
      setCurrentBet(betAmount);
      setCanCashout(false);
      setCashoutStatus(null);
      toast.success(`✅ Ставка: $${betAmount.toFixed(2)}`);
      
      setBalanceType(data.balanceType || 'MAIN');
      setUserBonusId(data.userBonusId || null);
      
      sessionStorage.setItem(sessionKeys.betId, data.betId || 'unknown');
      sessionStorage.setItem(sessionKeys.currentBet, betAmount.toString());
      sessionStorage.setItem(sessionKeys.balanceType, data.balanceType || 'MAIN');
      sessionStorage.setItem(sessionKeys.userBonusId, data.userBonusId || '');
    };
    
    const handleCashoutSuccess = (data: { multiplier: number; winnings: number }) => {
      const profit = data.winnings - currentBet;
      setBetPlaced(false);
      setCanCashout(false);
      setCashoutStatus('won');
      
      sessionStorage.removeItem(sessionKeys.betId);
      sessionStorage.removeItem(sessionKeys.currentBet);
      sessionStorage.removeItem(sessionKeys.balanceType);
      sessionStorage.removeItem(sessionKeys.userBonusId);
      
      setBalanceType(null);
      setUserBonusId(null);
      
      setTimeout(() => {
        fetchBalances();
        setCashoutStatus(null);
      }, 500);
      toast.success(`💰 +$${profit.toFixed(2)}`);
    };
    
    const handleCountdownUpdate = (data: { seconds: number }) => {
      setGameState((prev) => ({ ...prev, countdown: data.seconds, status: 'waiting' }));
    };

    const handleGameStatus = (data: CrashGameState) => {
      // 🔧 FIX: Сброс флагов при новой игре
      if (data.status === 'waiting') {
        isCrashedRef.current = false;
        crashPointRef.current = null;
        serverMultiplierRef.current = 1.0;
        visualMultiplierRef.current = 1.0;
      }
      
      setGameState(data);
      if (data.status === 'waiting') {
        setCanCashout(false);
        if (!betPlaced) {
          sessionStorage.removeItem(sessionKeys.betId);
          sessionStorage.removeItem(sessionKeys.currentBet);
          sessionStorage.removeItem(sessionKeys.balanceType);
          sessionStorage.removeItem(sessionKeys.userBonusId);
        }
      } else if (data.status === 'flying') {
        setCanCashout(betPlaced);
      }
    };

    const handleMultiplierUpdate = (data: { multiplier: number }) => {
      // 🔧 FIX #6: Обновляем серверный множитель (визуальный интерполируется в drawChart)
      // Игнорируем обновления если уже крашнулись
      if (!isCrashedRef.current) {
        serverMultiplierRef.current = data.multiplier;
        setGameState((prev) => ({ ...prev, multiplier: data.multiplier, status: 'flying' }));
        setCanCashout(betPlaced);
      }
    };
    
    const handleError = (data: { message: string }) => toast.error(`❌ ${data.message}`);

    crashGameService.on('gameStatus', handleGameStatus);
    crashGameService.on('multiplierUpdate', handleMultiplierUpdate);
    crashGameService.on('gameCrashed', handleGameCrashed);
    crashGameService.on('playerJoined', handlePlayerJoined);
    crashGameService.on('betPlaced', handleBetPlaced);
    crashGameService.on('cashoutSuccess', handleCashoutSuccess);
    crashGameService.on('countdownUpdate', handleCountdownUpdate);
    crashGameService.on('error', handleError);

    return () => {
      crashGameService.off('gameStatus', handleGameStatus);
      crashGameService.off('multiplierUpdate', handleMultiplierUpdate);
      crashGameService.off('gameCrashed', handleGameCrashed);
      crashGameService.off('playerJoined', handlePlayerJoined);
      crashGameService.off('betPlaced', handleBetPlaced);
      crashGameService.off('cashoutSuccess', handleCashoutSuccess);
      crashGameService.off('countdownUpdate', handleCountdownUpdate);
      crashGameService.off('error', handleError);
    };
  }, [betPlaced, currentBet, fetchBalances, sessionKeys]);

  // 🔧 FIX #7: State для отслеживания визуального множителя в UI
  const [uiMultiplier, setUiMultiplier] = useState(1.0);
  
  // Обновляем UI множитель из ref каждые 50ms
  useEffect(() => {
    const interval = setInterval(() => {
      setUiMultiplier(visualMultiplierRef.current);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Финальный множитель для отображения в UI
  const finalDisplayMultiplier = gameState.status === 'crashed' && crashPointRef.current 
    ? crashPointRef.current 
    : uiMultiplier;

  return (
    <div className="game-page" style={{ paddingBottom: '96px' }}>
      <GameHeader 
        title="CRASH" 
        icon={<Flame className="w-6 h-6" style={{ color: '#f59e0b' }} />}
        balance={totalBalance}
        onRefreshBalance={fetchBalances}
        status={isHistoryLoaded ? '🟢 OK' : '🟡 LOAD...'}
      />

        <div className="game-content w-full">
          <GlassCard className="relative rounded-2xl overflow-hidden bg-black/40 w-full" style={{ aspectRatio: '16/9' }}>
            <canvas
              ref={canvasRef}
              width={540}
              height={305}
              className="w-full h-full block"
            />
            
            {/* 🔧 FIX #8: Убрали mode="wait" - это причина мерцания */}
            <AnimatePresence>
              {gameState.status === 'waiting' ? (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }} // Быстрее переход
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                >
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Timer className="w-12 h-12 text-yellow-400" />
                    </motion.div>
                    <h2 className="text-lg font-black text-white">ОЖИДАНИЕ</h2>
                    <div className="w-40 h-2 bg-black/50 rounded-full overflow-hidden border border-white/20">
                      <motion.div
                        style={{ 
                          height: '100%',
                          background: 'linear-gradient(to right, #facc15, #f97316)'
                        }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${waitingProgress}%` }}
                        transition={{ duration: 0.3 }} // Плавнее
                      />
                    </div>
                    <motion.div 
                      key={gameState.countdown}
                      initial={{ scale: 1.2, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="text-3xl font-black text-yellow-300 font-mono"
                    >
                      {gameState.countdown.toFixed(0)}s
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                  <motion.div
                    key="flying"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  >
                    <div
                      className={`text-5xl font-black font-mono leading-none drop-shadow-2xl ${
                        gameState.status === 'crashed' ? 'text-red-500' : 'text-emerald-300'
                      }`}
                    >
                      <motion.div
                        animate={gameState.status === 'crashed' ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        {finalDisplayMultiplier.toFixed(2)}x
                      </motion.div>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-2 left-2 right-2 flex justify-between z-20 pointer-events-none gap-1">
              <GlassCard className="px-2 py-1 text-xs font-mono pointer-events-auto">
                #{gameState.gameId?.slice(0, 6) || '---'}
              </GlassCard>
              <GlassCard className="px-2 py-1 flex items-center gap-1 text-xs pointer-events-auto">
                <Users className="w-3 h-3" />
                <span className="text-xs">{playersCount + 345}</span>
              </GlassCard>
            </div>
          </GlassCard>

          <GlassCard className="p-3 space-y-2">
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">
                Ставка (мин. ${MIN_BET.toFixed(2)})
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={inputBet}
                  onChange={(e) => setInputBet(e.target.value)}
                  placeholder="Сумма"
                  className="flex-1 bg-white/5 border border-white/20 rounded-xl py-2.5 px-3 text-base font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleBetChange(0.5)}
                  className="px-3 py-2.5 bg-white/10 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors"
                >
                  ÷2
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleBetChange(2)}
                  className="px-3 py-2.5 bg-white/10 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors"
                >
                  ×2
                </motion.button>
              </div>
            </div>

            {/* 🔧 FIX #9: Убрали mode="wait" здесь тоже */}
            <AnimatePresence>
              {canCashout ? (
                <motion.button
                  key="cashout"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.1 }}
                  onClick={handleCashout}
                  disabled={isLoading}
                  className={`w-full px-4 py-3 font-black rounded-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 transition-all text-sm border-2 ${
                    cashoutStatus === 'won'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 hover:border-emerald-300'
                      : 'border-emerald-500 bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  {/* 🔧 FIX: Показываем серверный множитель для точного расчёта выигрыша */}
                  {cashoutStatus === 'won' ? '✅ УСПЕШНО' : 'ЗАБРАТЬ'} ${(serverMultiplierRef.current * parseFloat(inputBet)).toFixed(2)}
                </motion.button>
              ) : betPlaced ? (
                <motion.div
                  key="placed"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.1 }}
                  className={`w-full px-4 py-3 font-bold rounded-xl text-center animate-pulse border-2 ${
                    cashoutStatus === 'lost'
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {cashoutStatus === 'lost' ? '❌ ПОТЕРЯ' : '🎲'} СТАВКА: ${currentBet.toFixed(2)}
                </motion.div>
              ) : (
                <motion.button
                  key="place"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.1 }}
                  onClick={handlePlaceBet}
                  disabled={!isHistoryLoaded || isLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all text-sm flex items-center justify-center gap-2 border-2 border-indigo-400"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      ОБРАБОТКА...
                    </>
                  ) : (
                    <>
                      🎯 ПОСТАВИТЬ
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </GlassCard>

          <GlassCard className="flex flex-col h-64 overflow-hidden">
            <div className="p-2.5 border-b border-white/10 flex items-center gap-2 font-bold sticky top-0 bg-black/60 z-10 flex-shrink-0 rounded-t-2xl">
              <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm">ПОСЛЕДНИЕ 10 КРАШЕЙ</span>
              <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                {crashHistory.length > 0 ? `${crashHistory.length}` : '—'}
              </span>
            </div>

            <div ref={crashHistoryRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <AnimatePresence>
                {crashHistory.length > 0 ? (
                  crashHistory.map((crash, idx) => {
                    let bgColor = 'bg-black/40 border-white/10';
                    let textColor = 'text-gray-300';
                    let emoji = '📊';

                    if (crash.crashPoint < 1.5) {
                      bgColor = 'bg-red-950/40 border-red-500/40';
                      textColor = 'text-red-400';
                      emoji = '🔴';
                    } else if (crash.crashPoint < 3) {
                      bgColor = 'bg-orange-950/40 border-orange-500/40';
                      textColor = 'text-orange-400';
                      emoji = '🟠';
                    } else if (crash.crashPoint < 5) {
                      bgColor = 'bg-yellow-950/40 border-yellow-500/40';
                      textColor = 'text-yellow-400';
                      emoji = '🟡';
                    } else if (crash.crashPoint < 10) {
                      bgColor = 'bg-emerald-950/40 border-emerald-500/40';
                      textColor = 'text-emerald-400';
                      emoji = '🟢';
                    } else {
                      bgColor = 'bg-purple-950/40 border-purple-500/40';
                      textColor = 'text-purple-400';
                      emoji = '🟣';
                    }

                    return (
                      <motion.div
                        key={crash.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: idx * 0.02 }}
                      >
                        <div className={`p-2 rounded-lg border ${bgColor} flex-shrink-0`}>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-base flex-shrink-0">{emoji}</span>
                              <span className={`text-base font-black font-mono ${textColor} truncate`}>
                                {crash.crashPoint.toFixed(2)}x
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                              {new Date(crash.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center">
                      <div className="text-2xl mb-2">🎮</div>
                      <div className="text-xs">
                        {isHistoryLoaded ? 'Загружаю историю с сервера...' : 'Подключение...'}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>
        </div>

        <style>{`
          div::-webkit-scrollbar { width: 4px; }
          div::-webkit-scrollbar-track { background: transparent; }
          div::-webkit-scrollbar-thumb { background: rgba(34, 197, 94, 0.3); border-radius: 4px; }
          div::-webkit-scrollbar-thumb:hover { background: rgba(34, 197, 94, 0.5); }
        `}</style>
    </div>
  );
}