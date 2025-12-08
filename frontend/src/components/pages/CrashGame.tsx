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
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const crashHistoryRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // ================================
  // 1️⃣ ПОДКЛЮЧЕНИЕ И ЗАГРУЗКА ИСТОРИИ ЧЕРЕЗ API
  // ================================
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

        // ✅ ЗАГРУЖАЕМ ИСТОРИЮ ЧЕРЕЗ API ENDPOINT
        console.log('📥 Загружаю историю крашей с API...');
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
          const response = await fetch(`${API_URL}/api/v1/crash/last-crashes`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.data && Array.isArray(data.data)) {
              const formatted = data.data.map((crash: any) => ({
                id: crash.id || crash.gameId || `crash_${Date.now()}`,
                gameId: crash.gameId,
                crashPoint: parseFloat((crash.crashPoint || 0).toString()),
                timestamp: new Date(crash.timestamp),
              }));

              console.log(`✅ История загружена: ${formatted.length} крашей`);
              formatted.forEach((c, i) => {
                console.log(`  ${i + 1}. ${c.crashPoint}x @ ${c.timestamp.toLocaleTimeString()}`);
              });

              setCrashHistory(formatted);
            }
          } else {
            console.warn(`⚠️ API вернул ${response.status}`);
          }
        } catch (error) {
          console.warn('⚠️ Ошибка загрузки истории:', error);
        } finally {
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

  // ================================
  // 2️⃣ СОБЫТИЯ ИГРЫ
  // ================================
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
        gameId: data.gameId 
      }));
      setCanCashout(false);
      setBetPlaced(false);

      // ✅ ДОБАВЛЯЕМ НОВЫЙ КРАШ В ИСТОРИЮ
      const newCrash: CrashHistory = {
        id: data.gameId || `crash_${Date.now()}`,
        gameId: data.gameId,
        crashPoint: parseFloat(data.crashPoint.toString()),
        timestamp: new Date(),
      };
      
      console.log(`📝 Добавляю краш в историю: ${newCrash.crashPoint}x`);
      setCrashHistory((prev) => [newCrash, ...prev].slice(0, 10));
    };

    const handlePlayerJoined = (data: { playersCount: number }) => {
      setPlayersCount(data.playersCount);
    };

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
    };

    const handleError = (data: { message: string }) => {
      toast.error(`❌ ${data.message}`);
    };
    
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

  // ================================
  // 3️⃣ CANVAS ОТРИСОВКА
  // ================================
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 60;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(15, 20, 25, 0.95)');
    bgGradient.addColorStop(1, 'rgba(8, 12, 18, 0.98)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 8; i++) {
      const y = padding + (h / 8) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding / 2, y);
      ctx.stroke();

      const x = padding + (w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding / 2);
      ctx.lineTo(x, h - padding);
      ctx.stroke();
    }

    const currentMult = gameState.status === 'crashed' ? (gameState.crashPoint || 1) : gameState.multiplier;
    
    let maxMult = 12;
    if (currentMult > 12) {
      maxMult = Math.max(12, currentMult + 3);
    }

    const multiplierToY = (mult: number) => h - (mult / maxMult) * h;
    const progressToX = (progress: number) => w * progress;

    if (gameState.status !== 'waiting') {
      const progressRatio = Math.sqrt(Math.min(1, (currentMult - 1) / (maxMult - 1)));
      const headX = progressToX(progressRatio);
      const headY = multiplierToY(currentMult);

      const fillGradient = ctx.createLinearGradient(0, 0, 0, h);
      const fillColor =
        gameState.status === 'crashed'
          ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0)']
          : ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0)'];

      fillGradient.addColorStop(0, fillColor[0]);
      fillGradient.addColorStop(1, fillColor[1]);
      ctx.fillStyle = fillGradient;

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= headX; x += 5) {
        const progress = x / w;
        const multAtX = 1 + (maxMult - 1) * Math.pow(progress, 2);
        ctx.lineTo(x, multiplierToY(multAtX));
      }

      ctx.lineTo(headX, headY);
      ctx.lineTo(headX, h);
      ctx.fill();

      ctx.shadowColor = gameState.status === 'crashed' ? '#ef4444' : '#22c55e';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = gameState.status === 'crashed' ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= headX; x += 5) {
        const progress = x / w;
        const multAtX = 1 + (maxMult - 1) * Math.pow(progress, 2);
        ctx.lineTo(x, multiplierToY(multAtX));
      }
      ctx.lineTo(headX, headY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (gameState.status === 'flying') {
        const pulseSize = 10 + Math.sin(Date.now() / 200) * 4;
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(headX, headY, 16 + Math.sin(Date.now() / 150) * 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(headX, headY, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }

      if (gameState.status === 'crashed') {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 40px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`КРАХ @ ${gameState.crashPoint?.toFixed(2)}x`, w / 2, h / 2 - 30);
      }
    } else {
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 80 + Math.sin(Date.now() / 200) * 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 80 + Math.sin(Date.now() / 200) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    animationFrameRef.current = requestAnimationFrame(drawChart);
  }, [gameState]);

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
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full">
        {/* HEADER */}
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
                  {isHistoryLoaded ? '🟢 ЖИВАЯ ИГРА' : '🟡 ЗАГРУЗКА...'}
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

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto p-4 lg:p-6">
          <div className="flex flex-col gap-4 lg:gap-6">
            {/* ИГРА И КОНТРОЛЫ */}
            <div className="flex flex-col gap-4 lg:gap-6">
              {/* CANVAS БЛОК ИГРЫ */}
              <GlassCard className="relative rounded-3xl overflow-hidden bg-black/40 w-full" style={{aspectRatio: '16/10'}}>
                <canvas 
                  ref={canvasRef} 
                  width={800} 
                  height={500} 
                  className="w-full h-full"
                />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  {gameState.status === 'waiting' ? (
                    <div className="flex flex-col items-center gap-3 lg:gap-4">
                      <Timer className="w-12 lg:w-16 h-12 lg:h-16 text-yellow-400 animate-bounce" />
                      <h2 className="text-2xl lg:text-3xl font-black text-white">ОЖИДАНИЕ</h2>
                      <div className="w-48 lg:w-60 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${waitingProgress}%` }}
                        />
                      </div>
                      <div className="text-5xl lg:text-6xl font-black text-yellow-300 font-mono">
                        {gameState.countdown.toFixed(0)}s
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className={`text-6xl lg:text-[140px] font-black font-mono leading-none ${
                        gameState.status === 'crashed' ? 'text-red-500' : 'text-emerald-300'
                      }`}>
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

              {/* КОНТРОЛЫ */}
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
                        className="flex-1 bg-white/5 border border-white/20 rounded-xl py-3 px-4 text-lg font-bold text-white focus:outline-none focus:border-emerald-400/50"
                      />
                      <button
                        onClick={() => setInputBet((p) => (parseFloat(p || '0') / 2).toFixed(2))}
                        className="px-3 lg:px-4 py-3 bg-white/10 rounded-xl text-sm font-bold whitespace-nowrap"
                      >
                        ÷2
                      </button>
                      <button
                        onClick={() => setInputBet((p) => (parseFloat(p || '0') * 2).toFixed(2))}
                        className="px-3 lg:px-4 py-3 bg-white/10 rounded-xl text-sm font-bold whitespace-nowrap"
                      >
                        ×2
                      </button>
                    </div>
                  </div>

                  <div>
                    {canCashout ? (
                      <button
                        onClick={handleCashout}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black rounded-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 lg:w-5 h-4 lg:h-5" />
                        <span className="text-sm lg:text-base">ЗАБРАТЬ ${potentialWinnings.toFixed(2)}</span>
                      </button>
                    ) : betPlaced ? (
                      <div className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-bold rounded-xl text-center">
                        🎲 СТАВКА: ${currentBet.toFixed(2)}
                      </div>
                    ) : (
                      <button
                        onClick={handlePlaceBet}
                        disabled={gameState.status !== 'waiting'}
                        className="w-full px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        🎯 ПОСТАВИТЬ
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* ИСТОРИЯ КРАШЕЙ */}
            <GlassCard className="flex flex-col h-auto lg:h-[600px] max-h-[400px] lg:max-h-none">
              <div className="p-3 lg:p-4 border-b border-white/10 flex items-center gap-2 font-bold sticky top-0 bg-black/60 z-10 flex-shrink-0">
                <TrendingUp className="w-4 lg:w-5 h-4 lg:h-5 text-emerald-400 flex-shrink-0" />
                <span className="text-sm lg:text-base">ПОСЛЕДНИЕ КРАШИ</span>
                <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                  {isHistoryLoaded ? `${crashHistory.length}/10` : '⏳'}
                </span>
              </div>
              
              <div ref={crashHistoryRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3 space-y-2">
                {isHistoryLoaded ? (
                  crashHistory.length > 0 ? (
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
                        <div key={crash.id} className={`p-3 lg:p-4 rounded-lg border ${bgColor} flex-shrink-0`}>
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
                      <div className="text-sm">Ждём первого краша...</div>
                    </div>
                  )
                ) : (
                  <div className="text-center py-10 lg:py-20 text-gray-500 flex-1 flex flex-col items-center justify-center">
                    <div className="animate-spin text-xl lg:text-2xl mb-2">⏳</div>
                    <div className="text-sm">Загрузка...</div>
                  </div>
                )}
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
  );
}