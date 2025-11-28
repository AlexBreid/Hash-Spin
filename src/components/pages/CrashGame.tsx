import React, { useState, useEffect, useRef, useCallback } from 'react';
import { crashGameService, CrashGameState, LiveEvent } from '../../services/crashGameService';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../hooks/useBalance';
import { Zap, TrendingUp, Users, ArrowLeft, History, Wallet, Timer, Flame, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// 💎 Премиум Вспомогательный компонент для стеклянных карточек
const GlassCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  // Измененные стили для премиум-эффекта: градиент фона и блик
  <div className={`relative overflow-hidden bg-gradient-to-br from-[#1a1a2e]/80 to-[#16213e]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
    {children}
  </div>
);

// Константа для визуализации максимума времени ожидания (например, 10 сек)
const MAX_WAIT_TIME = 10;

export function CrashGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { balances, fetchBalances } = useBalance();

  // 🎮 Состояние игры
  const [gameState, setGameState] = useState<CrashGameState>({
    gameId: '',
    status: 'waiting',
    multiplier: 1.0,
    crashPoint: null,
    countdown: 0,
  });

  // 💰 Ставки и баланс
  const [inputBet, setInputBet] = useState('10');
  const [selectedTokenId, setSelectedTokenId] = useState(1); // Обычно 1 = USD/Main
  const [betPlaced, setBetPlaced] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [canCashout, setCanCashout] = useState(false);

  // 👥 События и история
  const [playersCount, setPlayersCount] = useState(0);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // ================================
  // 1️⃣ ПОДКЛЮЧЕНИЕ (Оставлено без изменений)
  // ================================
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const connect = async () => {
      try {
        await crashGameService.connect(user.id, user.firstName || `User${user.id}`);
        toast.success('🚀 Связь с космодромом установлена');
      } catch (error) {
        toast.error('Ошибка подключения к серверу');
      }
    };
    connect();
    return () => crashGameService.disconnect();
  }, [user, navigate]);

  // ================================
  // 2️⃣ ЛОГИКА (Оставлено без изменений)
  // ================================
  useEffect(() => {
    // Вспомогательная функция для добавления Live Event
    const addLiveEvent = (type: LiveEvent['type'], message: string) => {
      const event: LiveEvent = { id: Math.random().toString(), type, message, timestamp: new Date() };
      setLiveEvents(prev => [event, ...prev.slice(0, 19)]);
      if (eventContainerRef.current) setTimeout(() => eventContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };

    const handleGameStatus = (data: CrashGameState) => {
      setGameState(data);
      if (data.status === 'waiting') {
        setCanCashout(false);
        if (!betPlaced) {
          // Logic reset if needed
        }
      }
      setCanCashout(data.status === 'flying' && betPlaced);
    };

    const handleMultiplierUpdate = (data: { multiplier: number }) => {
      setGameState(prev => ({ ...prev, multiplier: data.multiplier, status: 'flying' }));
      setCanCashout(betPlaced);
    };

    const handleGameCrashed = (data: any) => {
      setGameState(prev => ({ ...prev, status: 'crashed', crashPoint: data.crashPoint }));
      setCanCashout(false);
      addLiveEvent('crash', `💥 CRASH @ ${data.crashPoint}x`);
      if (betPlaced) {
        addLiveEvent('crash', `💔 Потеря: $${currentBet.toFixed(2)}`);
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

      const newHistory = {
        crash: gameState.crashPoint,
        multiplier: multiplier,
        bet: currentBet,
        winnings: winAmount,
        result: 'won',
        timestamp: new Date(),
      };
      setHistory(prev => [newHistory, ...prev]);

      const profit = winAmount - currentBet;
      addLiveEvent('cashout', `🤑 Выигрыш: +$${profit.toFixed(2)} (${multiplier}x)`);
      setBetPlaced(false);
      setCanCashout(false);
      fetchBalances();
      toast.success(`+$${profit.toFixed(2)}`, { icon: '💰' });
    };

    const handlePlayerCashedOut = (data: any) => {
      addLiveEvent('cashout', `👤 ${data.userName}: выход на ${data.multiplier}x`);
    };

    const handleCountdownUpdate = (data: { seconds: number }) => {
      setGameState(prev => ({ ...prev, countdown: data.seconds, status: 'waiting' }));
    };

    const handleError = (data: { message: string }) => toast.error(data.message);

    // Подписки
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
  // 3️⃣ ОТРИСОВКА ГРАФИКА (Стилизована под "премиум" образец)
  // ================================
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padding = 60; // Увеличен паддинг для осей/сетки
    const graphWidth = w - padding * 1.5;
    const graphHeight = h - padding * 1.5;

    // --- 🎨 Очистка и Фон (из Premium образца) ---
    const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, 'rgba(26, 26, 46, 0.8)');
    bgGradient.addColorStop(1, 'rgba(22, 33, 62, 0.9)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, w, h);

    // --- 📏 Сетка (из Premium образца) ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridLines = 8;

    for (let i = 0; i <= gridLines; i++) {
      // Горизонтальные линии
      const y = padding + (graphHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding / 2, y);
      ctx.stroke();

      // Вертикальные линии
      const x = padding + (graphWidth / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding / 2); // Смещение вверх
      ctx.lineTo(x, h - padding);
      ctx.stroke();
    }

    const maxMult = gameState.crashPoint ? Math.max(12, gameState.crashPoint + 3) : 12;
    const currentMult = gameState.status === 'crashed' ? (gameState.crashPoint || 1) : gameState.multiplier;

    // Функция для преобразования координат (Упрощенная, как в оригинале, но с учетом padding)
    // В оригинальном коде логика была более простой, используем ее:
    const multiplierToY = (mult) => h - ((mult / maxMult) * h);
    const progressToX = (progress) => w * progress;

    if (gameState.status !== 'waiting') {
      // Имитация прогресса на основе корня для изогнутого графика (как в оригинале)
      const progressRatio = Math.sqrt(Math.min(1, (currentMult - 1) / (maxMult - 1)));
      const headX = progressToX(progressRatio);
      const headY = multiplierToY(currentMult);

      // --- 🎨 Заливка (Адаптация градиента из Premium образца) ---
      const fillGradient = ctx.createLinearGradient(0, 0, 0, h);
      const fillColor = gameState.status === 'crashed'
        ? ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0)'] // Красный
        : ['rgba(34, 197, 94, 0.25)', 'rgba(34, 197, 94, 0)']; // Зеленый (как в Premium)

      fillGradient.addColorStop(0, fillColor[0]);
      fillGradient.addColorStop(1, fillColor[1]);
      ctx.fillStyle = fillGradient;

      ctx.beginPath();
      ctx.moveTo(0, h); // Начинаем с левого нижнего угла
      
      // Рисуем кривую (логика из оригинального кода, но с другими цветами)
      for (let x = 0; x <= headX; x += 5) {
        const progress = x / w;
        const multAtX = 1 + (maxMult - 1) * Math.pow(progress, 2);
        const y = multiplierToY(multAtX);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(headX, headY);
      ctx.lineTo(headX, h);
      ctx.fill();

      // --- 📈 Линия графика (из Premium образца) ---
      ctx.shadowColor = gameState.status === 'crashed' ? '#ef4444' : '#22c55e'; // Зеленый для полета
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.strokeStyle = gameState.status === 'crashed' ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(0, h);
      
      for (let x = 0; x <= headX; x += 5) {
        const progress = x / w;
        const multAtX = 1 + (maxMult - 1) * Math.pow(progress, 2);
        const y = multiplierToY(multAtX);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(headX, headY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // --- Точка (из Premium образца) ---
      if (gameState.status === 'flying') {
        const pulseSize = 8 + Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(headX, headY, pulseSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(headX, headY, 12 + Math.sin(Date.now() / 150) * 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Дополнительная индикация Crash
      if (gameState.status === 'crashed') {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 32px "Inter", sans-serif';
        ctx.fillText(`CRASHED @ ${gameState.crashPoint?.toFixed(2)}x`, w / 2 - 120, h / 2 - 50);
      }
      
    } else {
      // --- Режим ожидания (из Premium образца) ---
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 70 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 70 + Math.sin(Date.now() / 200) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    animationFrameRef.current = requestAnimationFrame(drawChart);
  }, [gameState]);

  // Запуск анимации
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(drawChart);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [drawChart]);

  // ================================
  // 4️⃣ HELPERS (Оставлено без изменений)
  // ================================
  const addLiveEvent = (type: LiveEvent['type'], message: string) => {
    const event: LiveEvent = { id: Math.random().toString(), type, message, timestamp: new Date() };
    setLiveEvents(prev => [event, ...prev.slice(0, 19)]);
    if (eventContainerRef.current) setTimeout(() => eventContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handlePlaceBet = async () => {
    const amount = parseFloat(inputBet);
    if (!amount || amount <= 0) return toast.error('Введите сумму ставки');
    if (gameState.status !== 'waiting') return toast.error('Подождите следующий раунд');
    try {
      await crashGameService.placeBet(amount, selectedTokenId);
    } catch (e) { toast.error('Ошибка ставки'); }
  };

  const handleCashout = async () => {
    try { await crashGameService.cashout(); } catch (e) { toast.error('Ошибка кэшаута'); }
  };

  const mainBalance = parseFloat(balances.find(b => b.type === 'MAIN')?.amount?.toString() || '0');

  // Расчет процента для прогресс-бара ожидания
  const waitingProgress = Math.min(100, (gameState.countdown / MAX_WAIT_TIME) * 100);

  // ================================
  // 5️⃣ РЕНДЕР (Обновлен дизайн)
  // ================================
  return (
    // Обновлен фоновый градиент для Premium-эффекта
    <div className="min-h-screen bg-[#0B0E14] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#13151c] via-[#0B0E14] to-[#0B0E14] text-white font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Стиль кнопки Back изменен */}
            <button onClick={() => navigate('/')} className="p-3 rounded-full bg-[#1A1D26]/70 hover:bg-[#1A1D26] transition-colors backdrop-blur-md border border-white/10 group shadow-lg">
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2 tracking-wider">
                <Flame className="w-7 h-7 text-yellow-500 fill-yellow-500" /> CRASH GAME
              </h1>
              <span className="text-xs text-gray-500 font-mono tracking-widest ml-1">🚀 БУДУЩЕЕ АЗАРТА</span>
            </div>
          </div>

          {/* GlassCard для баланса */}
          <GlassCard className="px-5 py-2 flex items-center gap-3 !rounded-full shadow-inner shadow-white/5">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="font-black text-xl text-emerald-300 drop-shadow-md">{mainBalance.toFixed(2)}</span>
            <button onClick={() => fetchBalances()} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-emerald-300"/>
            </button>
          </GlassCard>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">

          {/* LEFT: GAME AREA (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* CANVAS CONTAINER (Стилизован) */}
            <div className="relative flex-1 bg-[#13151C] rounded-3xl border border-white/10 shadow-3xl overflow-hidden group">
              {/* Усиление эффекта фона */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

              <canvas ref={canvasRef} width={800} height={500} className="w-full h-full object-cover" />

              {/* OVERLAY STATS (CENTER) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-10">
                {gameState.status === 'waiting' ? (
                  <div className="flex flex-col items-center justify-center w-full max-w-sm">
                    <Timer className="w-16 h-16 text-yellow-400 mb-4 animate-pulse drop-shadow-lg" />
                    <h2 className="text-3xl font-extrabold text-white mb-4 uppercase tracking-widest">Ожидание старта</h2>

                    {/* 🔥 ЛОГИКА ОЖИДАНИЯ: ПРОГРЕСС БАР 🔥 */}
                    <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-white/20 mt-2 relative shadow-inner shadow-black/50">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(234,179,8,0.7)]"
                        style={{ width: `${waitingProgress}%` }}
                      />
                    </div>
                    {/* Текст над прогресс-баром */}
                    <div className="text-6xl font-black text-yellow-300 font-mono mt-4 drop-shadow-xl">
                      {gameState.countdown.toFixed(1)}с
                    </div>
                    <div className="text-gray-400 text-base mt-2 font-mono tracking-wider">ПРИЕМ СТАВОК ОТКРЫТ</div>
                  </div>
                ) : (
                  <div className="text-center">
                    {/* Увеличение размера и яркости мультипликатора */}
                    <div className={`text-9xl lg:text-[140px] font-black font-mono tracking-tighter transition-all duration-100
                      ${gameState.status === 'crashed' ? 'text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.8)]' : 'text-emerald-300 drop-shadow-[0_0_50px_rgba(34,197,94,0.8)]'}`}>
                      {gameState.multiplier.toFixed(2)}x
                    </div>
                    {gameState.status === 'crashed' && (
                      <div className="text-red-400 font-extrabold tracking-widest mt-4 uppercase text-2xl">Взрыв!</div>
                    )}
                    {gameState.status === 'flying' && (
                      <div className="text-emerald-400 font-extrabold tracking-widest mt-4 uppercase text-2xl animate-pulse">РАЗГОН...</div>
                    )}
                  </div>
                )}
              </div>

              {/* TOP INFO BAR (Стилизован) */}
              <div className="absolute top-6 left-6 right-6 flex justify-between z-20">
                <GlassCard className="flex items-center gap-2 px-4 py-2 !rounded-full text-xs font-mono text-gray-300 border border-white/10 shadow-md">
                  <span className={`w-3 h-3 rounded-full ${gameState.status === 'waiting' ? 'bg-yellow-500 animate-pulse' : gameState.status === 'flying' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                  ID: <span className="text-white font-bold tracking-wider">#{gameState.gameId || '----'}</span>
                </GlassCard>
                <GlassCard className="flex items-center gap-2 px-4 py-2 !rounded-full text-xs text-gray-300 border border-white/10 shadow-md">
                  <Users className="w-4 h-4 text-cyan-400" /> <span className="text-white font-bold">{playersCount}</span> Игроков
                </GlassCard>
              </div>
            </div>

            {/* CONTROLS AREA (Стилизован) */}
            <GlassCard className="p-8">
              <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full">
                  <label className="text-sm font-extrabold text-gray-300 uppercase tracking-wider mb-2 block ml-1">Сумма ставки</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={inputBet}
                      onChange={(e) => setInputBet(e.target.value)}
                      disabled={betPlaced || gameState.status !== 'waiting'}
                      className="w-full bg-[#0B0E14]/80 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-2xl font-bold font-mono text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner shadow-black/50"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                      <button onClick={() => setInputBet((prev) => (parseFloat(prev)/2).toFixed(2))} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-gray-300 font-mono transition-colors shadow-md">1/2</button>
                      <button onClick={() => setInputBet((prev) => (parseFloat(prev)*2).toFixed(2))} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-gray-300 font-mono transition-colors shadow-md">x2</button>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto min-w-[250px]">
                  {canCashout ? (
                    // Премиум кнопка Кэшаут
                    <button
                      onClick={handleCashout}
                      className="w-full h-[70px] bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-2xl rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-wider border-2 border-emerald-300/50"
                    >
                      <span>ЗАБРАТЬ</span>
                      <span className="bg-black/30 px-3 py-1 rounded-lg text-xl font-mono border border-white/20">{(gameState.multiplier * parseFloat(inputBet)).toFixed(2)}$</span>
                    </button>
                  ) : betPlaced ? (
                    // Стильный индикатор ставки в игре
                    <div className="w-full h-[70px] bg-indigo-900/20 border-2 border-indigo-500/50 text-indigo-300 font-extrabold rounded-xl flex flex-col items-center justify-center animate-pulse shadow-inner shadow-indigo-500/10">
                      <span className="text-sm uppercase tracking-widest opacity-80">Ваша ставка в игре</span>
                      <span className="text-2xl font-mono">${currentBet.toFixed(2)}</span>
                      {gameState.status === 'waiting' && <span className="text-xs text-yellow-400 mt-1 font-normal">Ожидание старта...</span>}
                    </div>
                  ) : (
                    // Премиум кнопка Сделать ставку
                    <button
                      onClick={handlePlaceBet}
                      disabled={gameState.status !== 'waiting'}
                      className={`w-full h-[70px] font-black text-2xl rounded-xl transition-all transform active:scale-[0.98] uppercase tracking-wider shadow-xl flex flex-col items-center justify-center border-2 border-transparent
                            ${gameState.status === 'waiting'
                                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient text-white hover:shadow-indigo-500/50'
                                : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border-white/5 shadow-inner shadow-black/50'
                              }`}
                    >
                      {gameState.status === 'waiting' ? (
                        <>
                          <span>ПОСТАВИТЬ</span>
                          <span className="text-xs font-normal opacity-80 mt-1">{gameState.countdown.toFixed(1)}с до старта</span>
                        </>
                      ) : 'ИДЕТ РАУНД'}
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* RIGHT: SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <GlassCard className="flex-1 flex flex-col min-h-[400px]">
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-lg tracking-wider text-white">LIVE FEED</span>
                <span className="ml-auto w-3 h-3 rounded-full bg-green-500 animate-pulse border border-white/5"></span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" ref={eventContainerRef}>
                {liveEvents.map((ev) => (
                  <div key={ev.id} className="text-sm px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-start justify-between border border-white/5 shadow-md">
                    <span className="text-gray-500 font-mono text-xs">{ev.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className={`flex-1 ml-3 ${ev.type === 'crash' ? 'text-red-400 font-bold' : ev.type === 'cashout' ? 'text-emerald-400 font-bold' : ev.type === 'bet' ? 'text-indigo-300' : 'text-gray-300'}`}>{ev.message}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="h-[250px] flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <span className="font-extrabold text-lg tracking-wider text-white">МОЯ ИСТОРИЯ</span>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/10 text-sm shadow-md">
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-bold">Ставка: ${h.bet.toFixed(2)}</span>
                      <span className={`text-lg font-black ${h.result === 'won' ? 'text-emerald-400' : 'text-red-400'}`}>{h.result === 'won' ? `+$${(h.winnings - h.bet).toFixed(2)}` : `-$${h.bet.toFixed(2)}`}</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-lg font-bold px-3 py-1 rounded-lg ${h.result === 'won' ? 'bg-emerald-800/30 text-emerald-300' : 'bg-red-800/30 text-red-300'}`}>{h.multiplier?.toFixed(2)}x</div>
                    </div>
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
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animate-gradient { animation: gradient 3s ease infinite; }
        .shadow-3xl { box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 100px rgba(79, 70, 229, 0.2); }
      `}</style>
    </div>
  );
}