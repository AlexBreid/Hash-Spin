import React, { useState, useEffect, useRef, useCallback } from 'react';
import { crashGameService } from '../../services/crashGameService';
import type { CrashGameState } from '../../services/crashGameService';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../hooks/useBalance';
import { Zap, TrendingUp, Users, ArrowLeft, Timer, Flame, RefreshCw, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
    {children}
  </div>
);

const MAX_WAIT_TIME = 10;
const HISTORY_LOAD_TIMEOUT = 5000;
const STORAGE_KEY = 'crash_game_history';
const MAX_HISTORY_ITEMS = 50;

interface CrashHistory {
  id: string;
  gameId?: string;
  crashPoint: number;
  timestamp: number;
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
  
  const [crashHistory, setCrashHistory] = useState<CrashHistory[]>([]);
  const [activeCrash, setActiveCrash] = useState<CrashHistory | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const crashHistoryRef = useRef<HTMLDivElement>(null);

  // ✅ Восстановление состояния ставки из sessionStorage
  const sessionKeyBetId = `crash_pending_bet_${user?.id}`;
  const sessionKeyCurrentBet = `crash_current_bet_${user?.id}`;

  // CAMERA
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // ЛОКАЛЬНОЕ ХРАНИЛИЩЕ ИСТОРИИ
  const loadHistoryFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CrashHistory[];
        setCrashHistory(parsed.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS));
        setIsHistoryLoaded(true);
        console.log('✅ История загружена из localStorage:', parsed.length);
      } else {
        setIsHistoryLoaded(true);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки истории из localStorage:', error);
      setIsHistoryLoaded(true);
    }
  }, []);

  const saveHistoryToStorage = useCallback((history: CrashHistory[]) => {
    try {
      const toSave = history.slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      console.log('💾 История сохранена в localStorage:', toSave.length);
    } catch (error) {
      console.error('❌ Ошибка сохранения истории:', error);
    }
  }, []);

  // ✅ Восстановление состояния ставки
  useEffect(() => {
    const storedBetId = sessionStorage.getItem(sessionKeyBetId);
    const storedBet = sessionStorage.getItem(sessionKeyCurrentBet);

    if (storedBetId && storedBet) {
      console.log('✅ [RECOVERY] Восстанавливаю ставку из sessionStorage:', storedBetId);
      setBetPlaced(true);
      setCurrentBet(parseFloat(storedBet));
    }
  }, [sessionKeyBetId, sessionKeyCurrentBet]);

  // ИНИЦИАЛИЗАЦИЯ
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    // Загружаем историю из локального хранилища СРАЗУ
    loadHistoryFromStorage();

    const init = async () => {
      try {
        setIsLoading(true);
        console.log('🔌 Подключаюсь к серверу...');
        await crashGameService.connect(user.id, user.firstName || `User${user.id}`, token);
        console.log('✅ Подключен');
        toast.success('🚀 Подключено!');
        await fetchBalances();

        console.log('📥 Загружаю историю крашей с API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HISTORY_LOAD_TIMEOUT);

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
          const response = await fetch(`${API_URL}/api/v1/crash/last-crashes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
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

              // Мергируем API данные с локальным хранилищем
              const merged = [...formatted];
              crashHistory.forEach((local) => {
                if (!merged.some((api) => api.gameId === local.gameId)) {
                  merged.push(local);
                }
              });

              const sorted = merged
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, MAX_HISTORY_ITEMS);

              setCrashHistory(sorted);
              saveHistoryToStorage(sorted);
              console.log('✅ История обновлена с API:', sorted.length);
            }
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name !== 'AbortError') {
            console.warn('⚠️ Ошибка загрузки истории:', error);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        toast.error('❌ Ошибка подключения');
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      console.log('🧹 Отключаюсь');
      crashGameService.disconnect();
    };
  }, [user, token, navigate, fetchBalances, loadHistoryFromStorage, saveHistoryToStorage, crashHistory]);

  // ОБРАБОТЧИКИ СОБЫТИЯ ИГРЫ
  useEffect(() => {
    const handleGameStatus = (data: CrashGameState) => {
      setGameState(data);
      if (data.status === 'waiting') {
        setCanCashout(false);
        if (!betPlaced) {
          sessionStorage.removeItem(sessionKeyBetId);
          sessionStorage.removeItem(sessionKeyCurrentBet);
        }
      } else if (data.status === 'flying') {
        setCanCashout(betPlaced);
      }
    };

    const handleMultiplierUpdate = (data: { multiplier: number }) => {
      setGameState((prev) => ({ ...prev, multiplier: data.multiplier, status: 'flying' }));
      setCanCashout(betPlaced);
    };

    const handleGameCrashed = (data: any) => {
      setGameState((prev) => ({
        ...prev,
        status: 'crashed',
        crashPoint: data.crashPoint,
        gameId: data.gameId,
      }));
      setCanCashout(false);
      setBetPlaced(false);

      sessionStorage.removeItem(sessionKeyBetId);
      sessionStorage.removeItem(sessionKeyCurrentBet);

      const newCrash: CrashHistory = {
        id: data.gameId || `crash_${Date.now()}_${Math.random()}`,
        gameId: data.gameId,
        crashPoint: parseFloat(data.crashPoint.toString()),
        timestamp: Date.now(),
      };

      setActiveCrash(newCrash);

      // Добавляем в историю и сохраняем
      setCrashHistory((prev) => {
        const updated = [newCrash, ...prev].slice(0, MAX_HISTORY_ITEMS);
        saveHistoryToStorage(updated);
        return updated;
      });

      setTimeout(() => {
        setActiveCrash(null);
      }, 1500);
    };

    const handlePlayerJoined = (data: { playersCount: number }) => setPlayersCount(data.playersCount);
    
    const handleBetPlaced = (data: any) => {
      setBetPlaced(true);
      setCurrentBet(data.bet);
      setCanCashout(false);
      toast.success(`✅ Ставка: $${data.bet}`);
      
      console.log('💾 Сохраняю ставку в sessionStorage');
      sessionStorage.setItem(sessionKeyBetId, data.betId || 'unknown');
      sessionStorage.setItem(sessionKeyCurrentBet, data.bet.toString());
    };
    
    const handleCashoutSuccess = (data: { multiplier: number; winnings: number }) => {
      const profit = data.winnings - currentBet;
      setBetPlaced(false);
      setCanCashout(false);
      
      sessionStorage.removeItem(sessionKeyBetId);
      sessionStorage.removeItem(sessionKeyCurrentBet);
      
      setTimeout(() => fetchBalances(), 500);
      toast.success(`💰 +$${profit.toFixed(2)}`);
    };
    
    const handleCountdownUpdate = (data: { seconds: number }) => {
      setGameState((prev) => ({ ...prev, countdown: data.seconds, status: 'waiting' }));
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
  }, [betPlaced, currentBet, fetchBalances, sessionKeyBetId, sessionKeyCurrentBet, saveHistoryToStorage]);

  // РИСОВАНИЕ ГРАФИКА
  const currentCrashPoint = activeCrash?.crashPoint ?? gameState.crashPoint;
  const displayMultiplier = gameState.status === 'crashed' && currentCrashPoint 
    ? currentCrashPoint 
    : gameState.multiplier;

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 50;
    const graphWidth = w - padding * 2;
    const graphHeight = h - padding * 2;

    // Очистка
    ctx.clearRect(0, 0, w, h);

    // Фон
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#0f1419');
    bgGradient.addColorStop(1, '#0a0e17');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // Сетка и оси
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Горизонтальные линии сетки
    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }

    // Вертикальные линии сетки
    for (let i = 0; i <= 10; i++) {
      const x = padding + (graphWidth / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, h - padding);
      ctx.stroke();
    }

    // СОСТОЯНИЕ: ОЖИДАНИЕ
    if (gameState.status === 'waiting') {
      const radius = 40 + Math.sin(Date.now() / 300) * 8;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.fillText('Ожидание...', w / 2, h / 2 + 60);
      return;
    }

    // РАСЧЁТ ПРОПОРЦИЙ ГРАФИКА
    const maxMult = Math.max(5, Math.ceil(displayMultiplier * 1.3));
    
    // Функция преобразования множителя в координату Y
    const multToY = (mult: number): number => {
      const normalized = Math.min(mult, maxMult) / maxMult;
      return h - padding - normalized * graphHeight;
    };

    // Прогресс анимации кривой (0 to 1)
    const progress = Math.min(1, (displayMultiplier - 1) / (maxMult - 1));
    const curveProgress = Math.pow(progress, 0.6); // Сглаживаем кривую
    const headX = padding + curveProgress * graphWidth;
    const headY = multToY(displayMultiplier);

    // РИСУЕМ ЭКСПОНЕНЦИАЛЬНУЮ КРИВУЮ
    const points: { x: number; y: number; mult: number }[] = [];
    const steps = 200;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Экспоненциальная функция
      const mult = 1 + Math.pow(t, 1.5) * (maxMult - 1);
      
      if (mult > displayMultiplier) break;

      const x = padding + t * graphWidth;
      const y = multToY(mult);
      points.push({ x, y, mult });
    }

    // Заливка под кривой (градиент)
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

    // РИСУЕМ ЛИНИЮ КРИВОЙ
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

    // ГОЛОВА (активная точка)
    if (gameState.status === 'flying' && points.length > 0) {
      const pulse = 14 + Math.sin(Date.now() / 150) * 6;
      
      // Внешний пульс
      ctx.beginPath();
      ctx.arc(headX, headY, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Центр
      ctx.beginPath();
      ctx.arc(headX, headY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      // Блик
      ctx.beginPath();
      ctx.arc(headX - 3, headY - 3, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }

    // ОСИ И МЕТКИ
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

    // Метки по оси Y (множители)
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

    for (let i = 0; i <= 5; i++) {
      const mult = (maxMult / 5) * (5 - i);
      const y = padding + (graphHeight / 5) * i;
      ctx.fillText(`${mult.toFixed(1)}x`, padding - 15, y);
    }

    // ТЕКСТ "КРАХ"
    if (gameState.status === 'crashed') {
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillText(`КРАХ @ ${gameState.crashPoint?.toFixed(2)}x`, w / 2, h / 2);
      ctx.shadowBlur = 0;
    }

    animationFrameRef.current = requestAnimationFrame(drawChart);
  }, [gameState, displayMultiplier]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawChart);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [drawChart]);

  const handlePlaceBet = async () => {
    const amount = parseFloat(inputBet);
    if (!amount || amount <= 0) {
      toast.error('❌ Введите сумму ставки');
      return;
    }
    if (gameState.status !== 'waiting') {
      toast.error('❌ Раунд уже начался');
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
      await crashGameService.cashout();
    } catch (e) {
      console.error('Cashout error:', e);
      toast.error('❌ Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const mainBalance = parseFloat(balances.find((b) => b.type === 'MAIN')?.amount?.toString() || '0');
  const waitingProgress = Math.min(100, (gameState.countdown / MAX_WAIT_TIME) * 100);
  const potentialWinnings = gameState.multiplier * parseFloat(inputBet);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1a1f2e] to-[#0a0e17] text-white">
      {/* Фоновые эффекты */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full">
        {/* ХЕДЕР */}
        <header className="sticky top-0 z-20 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-4 lg:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="p-2 lg:p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
              >
                <ArrowLeft className="w-5 h-5 text-gray-300" />
              </motion.button>
              <div>
                <h1 className="text-2xl lg:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2">
                  <Flame className="w-6 lg:w-8 h-6 lg:h-8 text-orange-500 animate-bounce" />
                  CRASH
                </h1>
                <p className="text-xs text-emerald-400 font-mono mt-1">
                  {isHistoryLoaded ? '🟢 ГОТОВО' : '🟡 ЗАГРУЗКА...'}
                </p>
              </div>
            </div>

            <GlassCard className="px-4 lg:px-6 py-2 lg:py-3 flex items-center gap-2 lg:gap-3 !rounded-full">
              <div className="text-right">
                <p className="text-xs text-gray-400">БАЛАНС</p>
                <p className="text-lg lg:text-2xl font-black text-emerald-300">${mainBalance.toFixed(2)}</p>
              </div>
              <motion.button 
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                onClick={() => fetchBalances()} 
                className="p-2 hover:bg-white/20 rounded-lg"
              >
                <RefreshCw className="w-4 lg:w-5 h-4 lg:h-5 text-emerald-400" />
              </motion.button>
            </GlassCard>
          </div>
        </header>

        {/* ОСНОВНОЙ КОНТЕНТ */}
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* ЛЕВАЯ КОЛОНКА - ГРАФИК И СТАВКА */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-6">
              {/* ГРАФИКИ */}
              <GlassCard className="relative rounded-3xl overflow-hidden bg-black/40 w-full" style={{ aspectRatio: '16/9' }}>
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={600}
                  className="w-full h-full block"
                />
                
                {/* ОВЕРЛЕЙ С МУЛЬТИПЛИКАТОРОМ */}
                <AnimatePresence>
                  {gameState.status === 'waiting' ? (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                    >
                      <div className="flex flex-col items-center gap-3 lg:gap-4">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Timer className="w-16 lg:w-24 h-16 lg:h-24 text-yellow-400" />
                        </motion.div>
                        <h2 className="text-2xl lg:text-4xl font-black text-white">ОЖИДАНИЕ</h2>
                        <div className="w-56 lg:w-72 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20">
                          <motion.div
                            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                            initial={{ width: '0%' }}
                            animate={{ width: `${waitingProgress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <motion.div 
                          className="text-5xl lg:text-7xl font-black text-yellow-300 font-mono"
                          key={gameState.countdown}
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                        >
                          {gameState.countdown.toFixed(0)}s
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="playing"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                    >
                      <motion.div
                        className={`text-6xl lg:text-[140px] font-black font-mono leading-none drop-shadow-2xl ${
                          gameState.status === 'crashed' ? 'text-red-500' : 'text-emerald-300'
                        }`}
                        animate={gameState.status === 'crashed' ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {displayMultiplier.toFixed(2)}x
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ИНФО В УГЛАХ */}
                <div className="absolute top-3 lg:top-6 left-3 lg:left-6 right-3 lg:right-6 flex justify-between z-20 pointer-events-none gap-2">
                  <GlassCard className="px-3 lg:px-4 py-2 text-xs font-mono pointer-events-auto">
                    ID: #{gameState.gameId?.slice(0, 8) || '---'}
                  </GlassCard>
                  <GlassCard className="px-3 lg:px-4 py-2 flex items-center gap-2 text-xs pointer-events-auto">
                    <Users className="w-4 h-4" />
                    <span>{playersCount + 345}</span>
                  </GlassCard>
                </div>
              </GlassCard>

              {/* ПАНЕЛЬ СТАВОК */}
              <GlassCard className="p-4 lg:p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase mb-3 block">Размер ставки</label>
                  <div className="flex gap-2 flex-col lg:flex-row">
                    <input
                      type="number"
                      value={inputBet}
                      onChange={(e) => setInputBet(e.target.value)}
                      disabled={betPlaced || gameState.status !== 'waiting'}
                      placeholder="Введите размер"
                      className="flex-1 bg-white/5 border border-white/20 rounded-xl py-3 px-4 text-lg font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                    />
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setInputBet((p) => Math.max(0.01, parseFloat(p || '0') / 2).toFixed(2))}
                        className="px-4 py-3 bg-white/10 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-white/20 transition-colors"
                      >
                        ÷2
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setInputBet((p) => (parseFloat(p || '0') * 2).toFixed(2))}
                        className="px-4 py-3 bg-white/10 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-white/20 transition-colors"
                      >
                        ×2
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* КНОПКА СТАВКА / ЗАБРАТЬ / СТАВКА РАЗМЕЩЕНА */}
                <div>
                  <AnimatePresence mode="wait">
                    {canCashout ? (
                      <motion.button
                        key="cashout"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={handleCashout}
                        disabled={isLoading}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 transition-all text-base lg:text-lg"
                      >
                        <Zap className="w-5 h-5" />
                        ЗАБРАТЬ ${potentialWinnings.toFixed(2)}
                      </motion.button>
                    ) : betPlaced ? (
                      <motion.div
                        key="placed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-bold rounded-xl text-center animate-pulse text-base lg:text-lg"
                      >
                        🎲 СТАВКА: ${currentBet.toFixed(2)}
                      </motion.div>
                    ) : (
                      <motion.button
                        key="place"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onClick={handlePlaceBet}
                        disabled={gameState.status !== 'waiting' || !isHistoryLoaded || isLoading}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all text-base lg:text-lg flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
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
                </div>
              </GlassCard>
            </div>

            {/* ПРАВАЯ КОЛОНКА - ИСТОРИЯ КРАШЕЙ */}
            <div className="lg:col-span-1">
              <GlassCard className="flex flex-col h-auto lg:h-[600px] overflow-hidden">
                <div className="p-3 lg:p-4 border-b border-white/10 flex items-center gap-2 font-bold sticky top-0 bg-black/60 z-10 flex-shrink-0 rounded-t-2xl">
                  <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm lg:text-base">ИСТОРИЯ</span>
                  <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                    {crashHistory.length > 0 ? `${crashHistory.length}` : '—'}
                  </span>
                </div>

                <div ref={crashHistoryRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3 space-y-2">
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
                            transition={{ delay: idx * 0.05 }}
                            className={`p-3 lg:p-4 rounded-lg border ${bgColor} flex-shrink-0 hover:scale-105 transition-transform cursor-pointer`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xl lg:text-2xl flex-shrink-0">{emoji}</span>
                                <span className={`text-lg lg:text-2xl font-black font-mono ${textColor} truncate`}>
                                  {crash.crashPoint.toFixed(2)}x
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                {new Date(crash.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 text-gray-500 flex-1 flex flex-col items-center justify-center"
                      >
                        <div className="text-4xl mb-3">🎮</div>
                        <div className="text-sm">
                          {isHistoryLoaded ? 'Ждём первого краша...' : 'Загружаю данные...'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        <style>{`
          div::-webkit-scrollbar { width: 6px; }
          div::-webkit-scrollbar-track { background: transparent; }
          div::-webkit-scrollbar-thumb { background: rgba(34, 197, 94, 0.3); border-radius: 6px; }
          div::-webkit-scrollbar-thumb:hover { background: rgba(34, 197, 94, 0.5); }
        `}</style>
      </div>
    </div>
  );
}