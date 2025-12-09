import React, { useState, useEffect, useRef, useCallback } from 'react';
import { crashGameService } from '../../services/crashGameService';
import type { CrashGameState } from '../../services/crashGameService';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../hooks/useBalance';
import { Zap, TrendingUp, Users, ArrowLeft, Timer, Flame, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
    {children}
  </div>
);

const MAX_WAIT_TIME = 10;
const HISTORY_LOAD_TIMEOUT = 5000;

interface CrashHistory {
  id: string;
  gameId?: string;
  crashPoint: number;
  timestamp: Date;
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

  // CAMERA FOLLOW
  const [cameraY, setCameraY] = useState(0);
  const [targetCameraY, setTargetCameraY] = useState(0);
  const cameraLerpSpeed = 0.12;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

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
                  timestamp: new Date(crash.timestamp),
                }))
                .slice(0, 10);

              setCrashHistory(formatted);
              setIsHistoryLoaded(true);
            } else {
              setIsHistoryLoaded(true);
            }
          } else {
            setIsHistoryLoaded(true);
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name !== 'AbortError') {
            console.warn('⚠️ Ошибка загрузки истории:', error);
          }
          setIsHistoryLoaded(true);
        }
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        toast.error('❌ Ошибка подключения');
        setIsHistoryLoaded(true);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      console.log('🧹 Отключаюсь');
      crashGameService.disconnect();
    };
  }, [user, token, navigate, fetchBalances]);

  useEffect(() => {
    const handleGameStatus = (data: CrashGameState) => {
      setGameState(data);
      if (data.status === 'waiting') setCanCashout(false);
      else if (data.status === 'flying') setCanCashout(betPlaced);
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

      const newCrash: CrashHistory = {
        id: data.gameId || `crash_${Date.now()}_${Math.random()}`,
        gameId: data.gameId,
        crashPoint: parseFloat(data.crashPoint.toString()),
        timestamp: new Date(),
      };

      setActiveCrash(newCrash);
      setTimeout(() => {
        setCrashHistory((prev) => [newCrash, ...prev].slice(0, 10));
        setActiveCrash(null);
      }, 1500);
    };

    const handlePlayerJoined = (data: { playersCount: number }) => setPlayersCount(data.playersCount);
    const handleBetPlaced = (data: any) => {
      setBetPlaced(true);
      setCurrentBet(data.bet);
      setCanCashout(false);
      toast.success(`✅ Ставка: $${data.bet}`);
    };
    const handleCashoutSuccess = (data: { multiplier: number; winnings: number }) => {
      const profit = data.winnings - currentBet;
      setBetPlaced(false);
      setCanCashout(false);
      setTimeout(() => fetchBalances(), 500);
      toast.success(`💰 +$${profit.toFixed(2)}`);
    };
    const handleCountdownUpdate = (data: { seconds: number }) => {
      setGameState((prev) => ({ ...prev, countdown: data.seconds, status: 'waiting' }));
      setCameraY(0);
      setTargetCameraY(0);
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
  }, [betPlaced, currentBet, fetchBalances]);

  // CAMERA FOLLOW
  useEffect(() => {
    setCameraY((prev) => prev + (targetCameraY - prev) * cameraLerpSpeed);
  }, [targetCameraY]);

  // GRAPH DRAWING
  const currentCrashPoint = activeCrash?.crashPoint ?? gameState.crashPoint;
  const currentMult = gameState.status === 'crashed' && currentCrashPoint ? currentCrashPoint : gameState.multiplier;

const drawChart = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const padding = 40;

  // Очистка
  ctx.clearRect(0, 0, w, h);

  // Фон
  const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
  bgGradient.addColorStop(0, '#0f1419');
  bgGradient.addColorStop(1, '#0a0e17');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Ничего не рисуем, если игра в ожидании и нет активного значения
  if (gameState.status === 'waiting') {
    // Кружок "ожидание"
    const radius = 40 + Math.sin(Date.now() / 300) * 5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  // Текущее значение
  const currentMult = gameState.status === 'crashed'
    ? (gameState.crashPoint || 1)
    : gameState.multiplier;

  // Автоматический максимум: не менее 2x, не более 20x, но всегда немного выше текущего
  const maxMult = Math.max(2, Math.min(20, currentMult + (currentMult > 10 ? 5 : 2)));

  // Преобразование мультипликатора → Y (сверху вниз!)
  const multToY = (mult: number) => {
    return padding + ((maxMult - mult) / maxMult) * (h - padding * 2);
  };

  // Прогресс кривой: 0 → 1
  const progress = Math.min(1, (currentMult - 1) / (maxMult - 1));
  // Нелинейное ускорение: квадратный корень для плавного старта
  const curveProgress = Math.sqrt(progress);
  const headX = padding + curveProgress * (w - padding * 2);
  const headY = multToY(currentMult);

  // === РИСУЕМ КРИВУЮ ===

  // Точки для кривой (по формуле: mult = 1 + (maxMult - 1) * (x / w)^2)
  const points: { x: number; y: number }[] = [];
  const steps = 150;
  for (let i = 0; i <= steps; i++) {
    const xNorm = i / steps;
    const x = padding + xNorm * (w - padding * 2);
    const mult = 1 + (maxMult - 1) * xNorm * xNorm;
    const y = multToY(mult);
    points.push({ x, y });
    if (x >= headX) break;
  }

  // Заливка под кривой
  if (points.length > 0) {
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, h - padding);
    ctx.closePath();

    const fillGradient = ctx.createLinearGradient(0, 0, 0, h);
    fillGradient.addColorStop(0, gameState.status === 'crashed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.25)');
    fillGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }

  // Линия кривой
  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = gameState.status === 'crashed' ? '#ef4444' : '#22c55e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  // === ГОЛОВА (активная точка) ===
  if (gameState.status === 'flying') {
    // Пульсирующий круг вокруг
    const pulseRadius = 14 + Math.sin(Date.now() / 150) * 6;
    ctx.beginPath();
    ctx.arc(headX, headY, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Основная точка
    ctx.beginPath();
    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
  }

  // === ТЕКСТ "КРАХ" ===
  if (gameState.status === 'crashed') {
    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.95)';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 25;
    ctx.fillText(`КРАХ @ ${gameState.crashPoint?.toFixed(2)}x`, w / 2, h / 2);
    ctx.shadowBlur = 0;
  }

  // Запрос следующего кадра
  animationFrameRef.current = requestAnimationFrame(drawChart);
}, [gameState]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawChart);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [drawChart]);

  // CAMERA TARGET UPDATE
  useEffect(() => {
    const w = canvasRef.current?.width || 800;
    const h = canvasRef.current?.height || 500;
    let maxMult = 12;
    if (currentMult > 12) maxMult = Math.max(12, currentMult + 3);

    if (gameState.status === 'flying') {
      const rawY = h - (currentMult / maxMult) * h;
      const targetY = rawY - h * 0.4;
      setTargetCameraY(targetY);
    } else if (gameState.status === 'crashed' && currentCrashPoint) {
      const crashY = h - (currentCrashPoint / maxMult) * h;
      const targetY = crashY - h * 0.4;
      setTargetCameraY(targetY);
    } else {
      setTargetCameraY(0);
    }
  }, [gameState.status, currentMult, currentCrashPoint]);

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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full">
        <header className="sticky top-0 z-20 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-4 lg:px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 lg:p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10"
              >
                <ArrowLeft className="w-5 h-5 text-gray-300" />
              </button>
              <div>
                <h1 className="text-2xl lg:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2">
                  <Flame className="w-6 lg:w-8 h-6 lg:h-8 text-yellow-500" />
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
              <button onClick={() => fetchBalances()} className="p-2 hover:bg-white/20 rounded-lg">
                <RefreshCw className="w-4 lg:w-5 h-4 lg:h-5 text-emerald-400" />
              </button>
            </GlassCard>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="flex flex-col gap-4 lg:gap-6">
            <div className="flex flex-col gap-4 lg:gap-6">
              <GlassCard className="relative rounded-3xl overflow-hidden bg-black/40 w-full" style={{ aspectRatio: '16/10' }}>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  className="w-full h-full block"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  {gameState.status === 'waiting' ? (
                    <div className="flex flex-col items-center gap-3 lg:gap-4">
                      <Timer className="w-12 lg:w-16 h-12 lg:h-16 text-yellow-400 animate-bounce" />
                      <h2 className="text-2xl lg:text-3xl font-black text-white">ОЖИДАНИЕ</h2>
                      <div className="w-48 lg:w-60 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                          style={{ width: `${waitingProgress}%` }}
                        />
                      </div>
                      <div className="text-5xl lg:text-6xl font-black text-yellow-300 font-mono">
                        {gameState.countdown.toFixed(0)}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-center drop-shadow-2xl">
                      <div
                        className={`text-6xl lg:text-[140px] font-black font-mono leading-none transition-all ${
                          gameState.status === 'crashed' ? 'text-red-500 animate-pulse' : 'text-emerald-300'
                        }`}
                      >
                        {gameState.multiplier.toFixed(2)}x
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute top-3 lg:top-4 left-3 lg:left-4 right-3 lg:right-4 flex justify-between z-20 pointer-events-none gap-2">
                  <GlassCard className="px-2 lg:px-3 py-2 text-xs font-mono pointer-events-auto">
                    ID: #{gameState.gameId?.slice(0, 8) || '---'}
                  </GlassCard>
                  <GlassCard className="px-2 lg:px-3 py-2 flex items-center gap-2 text-xs pointer-events-auto">
                    <Users className="w-3 lg:w-4 h-3 lg:h-4" />
                    <span className="hidden sm:inline">{playersCount + 345}</span>
                  </GlassCard>
                </div>
              </GlassCard>

              <GlassCard className="p-4 lg:p-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">Размер ставки</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={inputBet}
                        onChange={(e) => setInputBet(e.target.value)}
                        disabled={betPlaced || gameState.status !== 'waiting'}
                        placeholder="Введите размер"
                        className="flex-1 bg-white/5 border border-white/20 rounded-xl py-3 px-4 text-lg font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400/50 focus:bg-white/10 transition-all"
                      />
                      <button
                        onClick={() => setInputBet((p) => Math.max(0.01, parseFloat(p || '0') / 2).toFixed(2))}
                        className="px-3 lg:px-4 py-3 bg-white/10 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-white/20 transition-colors"
                      >
                        ÷2
                      </button>
                      <button
                        onClick={() => setInputBet((p) => (parseFloat(p || '0') * 2).toFixed(2))}
                        className="px-3 lg:px-4 py-3 bg-white/10 rounded-xl text-sm font-bold whitespace-nowrap hover:bg-white/20 transition-colors"
                      >
                        ×2
                      </button>
                    </div>
                  </div>

                  <div>
                    {canCashout ? (
                      <button
                        onClick={handleCashout}
                        disabled={isLoading}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-xl transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 transition-all"
                      >
                        <Zap className="w-4 lg:w-5 h-4 lg:h-5" />
                        <span className="text-sm lg:text-base">ЗАБРАТЬ ${potentialWinnings.toFixed(2)}</span>
                      </button>
                    ) : betPlaced ? (
                      <div className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-bold rounded-xl text-center animate-pulse">
                        🎲 СТАВКА: ${currentBet.toFixed(2)}
                      </div>
                    ) : (
                      <button
                        onClick={handlePlaceBet}
                        disabled={gameState.status !== 'waiting' || !isHistoryLoaded || isLoading}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                      >
                        {isLoading ? '⏳ Обработка...' : '🎯 ПОСТАВИТЬ'}
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>

            <GlassCard className="flex flex-col h-auto lg:h-[600px] max-h-[400px] lg:max-h-none">
              <div className="p-3 lg:p-4 border-b border-white/10 flex items-center gap-2 font-bold sticky top-0 bg-black/60 z-10 flex-shrink-0 rounded-t-2xl">
                <TrendingUp className="w-4 lg:w-5 h-4 lg:h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm lg:text-base">ИСТОРИЯ КРАШЕЙ</span>
                <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                  {crashHistory.length > 0 ? `${crashHistory.length}` : '—'}
                </span>
              </div>

              <div ref={crashHistoryRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3 space-y-2">
                {crashHistory.length > 0 ? (
                  crashHistory.map((crash) => {
                    let bgColor = 'bg-black/40 border-white/10';
                    let textColor = 'text-gray-300';
                    let emoji = '📊';

                    if (crash.crashPoint < 1.5) {
                      bgColor = 'bg-red-950/30 border-red-500/30';
                      textColor = 'text-red-400';
                      emoji = '🔴';
                    } else if (crash.crashPoint < 3) {
                      bgColor = 'bg-orange-950/30 border-orange-500/30';
                      textColor = 'text-orange-400';
                      emoji = '🟠';
                    } else if (crash.crashPoint < 5) {
                      bgColor = 'bg-yellow-950/30 border-yellow-500/30';
                      textColor = 'text-yellow-400';
                      emoji = '🟡';
                    } else if (crash.crashPoint < 10) {
                      bgColor = 'bg-emerald-950/30 border-emerald-500/30';
                      textColor = 'text-emerald-400';
                      emoji = '🟢';
                    } else {
                      bgColor = 'bg-purple-950/30 border-purple-500/30';
                      textColor = 'text-purple-400';
                      emoji = '🟣';
                    }

                    return (
                      <div
                        key={crash.id}
                        className={`p-3 lg:p-4 rounded-lg border ${bgColor} flex-shrink-0 animate-in fade-in slide-in-from-top duration-300`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg flex-shrink-0">{emoji}</span>
                            <span className={`text-xl lg:text-2xl font-black font-mono ${textColor} truncate`}>
                              {crash.crashPoint.toFixed(2)}x
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                            {crash.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 lg:py-20 text-gray-500 flex-1 flex flex-col items-center justify-center">
                    <div className="text-3xl lg:text-4xl mb-2">🎮</div>
                    <div className="text-sm">
                      {isHistoryLoaded ? 'Ждём первого краша...' : 'Загружаю данные...'}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
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