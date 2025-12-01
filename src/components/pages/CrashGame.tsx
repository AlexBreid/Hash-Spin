import React, { useState, useEffect, useRef, useCallback } from 'react';
import { crashGameService, CrashGameState, LiveEvent } from '../../services/crashGameService';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../hooks/useBalance';
import { Zap, TrendingUp, Users, ArrowLeft, History, Timer, Flame, DollarSign, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// 💎 Премиум GlassCard компонент
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl hover:shadow-2xl transition-all duration-300 ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
    {children}
  </div>
);

const MAX_WAIT_TIME = 10;

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
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // ================================
  // 1️⃣ ПОДКЛЮЧЕНИЕ (ИСПРАВЛЕНО)
  // ================================
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    const connect = async () => {
      try {
        setIsLoading(true);
        await crashGameService.connect(user.id, user.firstName || `User${user.id}`, token);
        toast.success('🚀 Подключено к Crash серверу!');
      } catch (error) {
        console.error('Connection error:', error);
        toast.error('❌ Ошибка подключения к серверу');
      } finally {
        setIsLoading(false);
      }
    };

    connect();
    return () => crashGameService.disconnect();
  }, [user, token, navigate]);

  // ================================
  // 2️⃣ ЛОГИКА ИГРЫ
  // ================================
  useEffect(() => {
    const addLiveEvent = (type: LiveEvent['type'], message: string) => {
      const event: LiveEvent = {
        id: Math.random().toString(),
        type,
        message,
        timestamp: new Date(),
      };
      setLiveEvents((prev) => [event, ...prev.slice(0, 19)]);
      if (eventContainerRef.current) {
        setTimeout(() => eventContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      }
    };

    const handleGameStatus = (data: CrashGameState) => {
      setGameState(data);
      if (data.status === 'waiting') setCanCashout(false);
      setCanCashout(data.status === 'flying' && betPlaced);
    };

    const handleMultiplierUpdate = (data: { multiplier: number }) => {
      setGameState((prev) => ({ ...prev, multiplier: data.multiplier, status: 'flying' }));
      setCanCashout(betPlaced);
    };

    const handleGameCrashed = (data: any) => {
      setGameState((prev) => ({ ...prev, status: 'crashed', crashPoint: data.crashPoint }));
      setCanCashout(false);
      addLiveEvent('crash', `💥 КРАХ @ ${data.crashPoint}x`);
      if (betPlaced) {
        addLiveEvent('crash', `💔 Ставка потеряна: $${currentBet.toFixed(2)}`);
        setBetPlaced(false);
      }
    };

    const handlePlayerJoined = (data: { playersCount: number }) => setPlayersCount(data.playersCount);

    const handleBetPlaced = (data: any) => {
      setBetPlaced(true);
      setCurrentBet(data.bet);
      setCanCashout(false);
      addLiveEvent('bet', `🎲 Ставка: $${parseFloat(data.bet).toFixed(2)}`);
    };

    const handleCashoutSuccess = (data: { multiplier: number; winnings: number }) => {
      const winAmount = parseFloat(data.winnings.toString());
      const multiplier = parseFloat(data.multiplier.toString());
      const profit = winAmount - currentBet;

      setHistory((prev) => [
        {
          crash: gameState.crashPoint,
          multiplier,
          bet: currentBet,
          winnings: winAmount,
          result: 'won',
          timestamp: new Date(),
        },
        ...prev,
      ]);

      addLiveEvent('cashout', `🤑 ВЫИГРЫШ: +$${profit.toFixed(2)} (${multiplier}x)`);
      setBetPlaced(false);
      setCanCashout(false);
      fetchBalances();
      toast.success(`💰 +$${profit.toFixed(2)}`);
    };

    const handlePlayerCashedOut = (data: any) => {
      addLiveEvent('cashout', `👤 ${data.userName}: ${data.multiplier}x`);
    };

    const handleCountdownUpdate = (data: { seconds: number }) => {
      setGameState((prev) => ({ ...prev, countdown: data.seconds, status: 'waiting' }));
    };

    const handleError = (data: { message: string }) => {
      toast.error(data.message);
    };

    crashGameService.on('gameStatus', handleGameStatus);
    crashGameService.on('multiplierUpdate', handleMultiplierUpdate);
    crashGameService.on('gameCrashed', handleGameCrashed);
    crashGameService.on('playerJoined', handlePlayerJoined);
    crashGameService.on('betPlaced', handleBetPlaced);
    crashGameService.on('cashoutSuccess', handleCashoutSuccess);
    crashGameService.on('playerCashedOut', handlePlayerCashedOut);
    crashGameService.on('countdownUpdate', handleCountdownUpdate);
    crashGameService.on('error', handleError);

    return () => {
      crashGameService.off('gameStatus', handleGameStatus);
      crashGameService.off('multiplierUpdate', handleMultiplierUpdate);
      crashGameService.off('gameCrashed', handleGameCrashed);
      crashGameService.off('playerJoined', handlePlayerJoined);
      crashGameService.off('betPlaced', handleBetPlaced);
      crashGameService.off('cashoutSuccess', handleCashoutSuccess);
      crashGameService.off('playerCashedOut', handlePlayerCashedOut);
      crashGameService.off('countdownUpdate', handleCountdownUpdate);
      crashGameService.off('error', handleError);
    };
  }, [betPlaced, currentBet, gameState.crashPoint, fetchBalances]);

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

    const maxMult = gameState.crashPoint ? Math.max(12, gameState.crashPoint + 3) : 12;
    const currentMult = gameState.status === 'crashed' ? (gameState.crashPoint || 1) : gameState.multiplier;

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

  // ================================
  // 4️⃣ ОБРАБОТЧИКИ
  // ================================
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
      toast.error('❌ Ошибка при размещении ставки');
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
      toast.error('❌ Ошибка при кэшауте');
    } finally {
      setIsLoading(false);
    }
  };

  const mainBalance = parseFloat(balances.find((b) => b.type === 'MAIN')?.amount?.toString() || '0');
  const waitingProgress = Math.min(100, (gameState.countdown / MAX_WAIT_TIME) * 100);
  const potentialWinnings = gameState.multiplier * parseFloat(inputBet);

  // ================================
  // 5️⃣ РЕНДЕР
  // ================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1419] via-[#1a1f2e] to-[#0a0e17] text-white overflow-x-hidden">
      {/* Фоновые эффекты */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 lg:p-6">
        {/* HEADER */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-emerald-400/50 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300 hover:text-emerald-400 transition-colors" />
            </button>
            <div>
              <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 flex items-center gap-3 tracking-wider">
                <Flame className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                CRASH
              </h1>
              <p className="text-xs text-gray-400 font-mono">💰 Мультипликатор Удачи</p>
            </div>
          </div>

          <GlassCard className="px-6 py-3 flex items-center gap-4 !rounded-full">
            <div className="text-right">
              <p className="text-xs text-gray-400 font-mono">БАЛАНС</p>
              <p className="text-2xl font-black text-emerald-300">${mainBalance.toFixed(2)}</p>
            </div>
            <button
              onClick={() => fetchBalances()}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              title="Обновить"
            >
              <RefreshCw className="w-5 h-5 text-emerald-400" />
            </button>
          </GlassCard>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-160px)] min-h-[650px]">
          {/* ЛЕВАЯ ЧАСТЬ */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* CANVAS */}
            <div className="relative flex-1 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
              <canvas ref={canvasRef} width={800} height={500} className="w-full h-full" />

              {/* OVERLAY */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                {gameState.status === 'waiting' ? (
                  <div className="flex flex-col items-center gap-4">
                    <Timer className="w-16 h-16 text-yellow-400 animate-bounce" />
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-white mb-2">ОЖИДАНИЕ</h2>
                      <p className="text-sm text-gray-300">Размещайте ставки</p>
                    </div>
                    <div className="w-60 h-3 bg-black/50 rounded-full overflow-hidden border border-white/20">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-100"
                        style={{ width: `${waitingProgress}%` }}
                      />
                    </div>
                    <div className="text-6xl font-black text-yellow-300 font-mono">
                      {gameState.countdown.toFixed(0)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div
                      className={`text-[140px] font-black font-mono transition-all ${
                        gameState.status === 'crashed' ? 'text-red-500' : 'text-emerald-300'
                      }`}
                    >
                      {gameState.multiplier.toFixed(2)}x
                    </div>
                  </div>
                )}
              </div>

              {/* TOP INFO */}
              <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
                <GlassCard className="px-3 py-2 text-xs font-mono">
                  ID: <span className="text-white">#{gameState.gameId?.slice(0, 8) || '---'}</span>
                </GlassCard>
                <GlassCard className="px-3 py-2 flex items-center gap-2 text-xs">
                  <Users className="w-4 h-4" />
                  <span>{playersCount}</span>
                </GlassCard>
              </div>
            </div>

            {/* УПРАВЛЕНИЕ */}
            <GlassCard className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 block">
                    Ставка
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                    <input
                      type="number"
                      value={inputBet}
                      onChange={(e) => setInputBet(e.target.value)}
                      disabled={betPlaced || gameState.status !== 'waiting' || isLoading}
                      className="w-full bg-white/5 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-xl font-bold font-mono text-white focus:outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/50 transition-all disabled:opacity-50"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button
                        onClick={() => setInputBet((prev) => Math.max(1, parseFloat(prev) / 2).toFixed(2))}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-gray-300 transition-all"
                        disabled={betPlaced || gameState.status !== 'waiting'}
                      >
                        ÷2
                      </button>
                      <button
                        onClick={() => setInputBet((prev) => (parseFloat(prev) * 2).toFixed(2))}
                        className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-gray-300 transition-all"
                        disabled={betPlaced || gameState.status !== 'waiting'}
                      >
                        ×2
                      </button>
                    </div>
                  </div>
                </div>

                {canCashout ? (
                  <button
                    onClick={handleCashout}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider border border-emerald-300/50 disabled:opacity-50"
                  >
                    <Zap className="w-5 h-5" />
                    ЗАБРАТЬ ${potentialWinnings.toFixed(2)}
                  </button>
                ) : betPlaced ? (
                  <div className="w-full md:w-auto px-8 h-14 bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 font-bold rounded-xl flex items-center justify-center animate-pulse">
                    СТАВКА: ${currentBet.toFixed(2)}
                  </div>
                ) : (
                  <button
                    onClick={handlePlaceBet}
                    disabled={gameState.status !== 'waiting' || isLoading}
                    className={`w-full md:w-auto px-8 h-14 font-black rounded-xl transition-all transform active:scale-95 uppercase tracking-wider shadow-xl flex items-center justify-center border ${
                      gameState.status === 'waiting' && !isLoading
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:scale-105 border-indigo-400/50'
                        : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border-white/10'
                    }`}
                  >
                    {isLoading ? 'ЗАГРУЗКА...' : 'ПОСТАВИТЬ'}
                  </button>
                )}
              </div>
            </GlassCard>
          </div>

          {/* ПРАВАЯ ЧАСТЬ */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* LIVE FEED */}
            <GlassCard className="flex-1 flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-white/10 flex items-center gap-2 font-bold">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>LIVE FEED</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {liveEvents.map((ev) => (
                  <div key={ev.id} className="text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-gray-500 font-mono">{ev.timestamp.toLocaleTimeString()}</span>
                    <span className="block mt-1 text-gray-200">{ev.message}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* ИСТОРИЯ */}
            <GlassCard className="h-64 flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center gap-2 font-bold">
                <History className="w-5 h-5 text-indigo-400" />
                <span>ИСТОРИЯ</span>
              </div>
              <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-black/30 border border-white/10">
                    <div className="flex justify-between">
                      <span className="text-gray-400">${h.bet.toFixed(2)}</span>
                      <span className={h.result === 'won' ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                        {h.result === 'won' ? `+$${(h.winnings - h.bet).toFixed(2)}` : `-$${h.bet}`}
                      </span>
                    </div>
                    <span className="text-gray-500">{h.multiplier?.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 197, 94, 0.3); border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34, 197, 94, 0.5); }
        @keyframes gradient { 0% { background-position: 0%; } 100% { background-position: 100%; } }
        .animate-gradient { animation: gradient 3s ease infinite; }
      `}</style>
    </div>
  );
}