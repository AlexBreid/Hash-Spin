import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { crashGameService } from '../../services/crashGameService';
import type { CrashGameState } from '../../services/crashGameService';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../hooks/useBalance';
import { Zap, TrendingUp, Users, Timer, Flame, Loader, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GameHeader } from './games/GameHeader';
import { BigWinModal } from '../modals/BigWinModal';
import { CurrencyInfo, getGlobalCurrency } from '../CurrencySelector';
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
const FAKE_PLAYERS_OFFSET = 345;

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
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [canCashout, setCanCashout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playersCount, setPlayersCount] = useState(0);
  const [cashoutStatus, setCashoutStatus] = useState<'pending' | 'won' | 'lost' | null>(null);
  
  const [mainBalance, setMainBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  
  // 🆕 Выбранная валюта
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyInfo | null>(null);
  
  const [balanceType, setBalanceType] = useState<string | null>(null);
  const [userBonusId, setUserBonusId] = useState<string | null>(null);
  
  // Big Win Modal
  const [isBigWinModalOpen, setIsBigWinModalOpen] = useState(false);
  const [bigWinData, setBigWinData] = useState<{ winAmount: number; multiplier: number } | null>(null);
  
  const [crashHistory, setCrashHistory] = useState<CrashHistory[]>([]);
  const [activeCrash, setActiveCrash] = useState<CrashHistory | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const crashHistoryRef = useRef<HTMLDivElement>(null);

  // 🔧 УПРОЩЕНО: Только один ref для множителя
  const currentMultiplierRef = useRef<number>(1.0);
  const targetMultiplierRef = useRef<number>(1.0);
  const smoothMultiplierRef = useRef<number>(1.0);
  const isCrashedRef = useRef<boolean>(false);
  const crashPointRef = useRef<number | null>(null);
  const lastMultiplierRef = useRef<number>(1.0);
  const lastMultiplierTimeRef = useRef<number>(Date.now());

  // Для отображения в UI
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [roundNumber, setRoundNumber] = useState<number>(0);

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
      setBetPlaced(true);
      setCurrentBet(parseFloat(storedBet));
      if (storedBalanceType) setBalanceType(storedBalanceType);
      if (storedUserBonusId) setUserBonusId(storedUserBonusId);
    }
  }, [sessionKeys]);

  useEffect(() => {
    if (balances && Array.isArray(balances)) {
      // Фильтруем по выбранному tokenId
      const filteredBalances = selectedTokenId 
        ? balances.filter((b: any) => b.tokenId === selectedTokenId)
        : balances;
      
      const main = parseFloat((filteredBalances.find((b: any) => b.type === 'MAIN')?.amount ?? 0).toString());
      const bonus = parseFloat((filteredBalances.find((b: any) => b.type === 'BONUS')?.amount ?? 0).toString());
      setMainBalance(main);
      setBonusBalance(bonus);
      setTotalBalance(main + bonus);
    }
  }, [balances, selectedTokenId]);
  
  // 🆕 Обработчик смены валюты
  const handleCurrencyChange = useCallback((currency: CurrencyInfo) => {
    setSelectedCurrency(currency);
    setSelectedTokenId(currency.tokenId);
    setTotalBalance(currency.balance);
    setMainBalance(currency.balance - currency.bonus);
    setBonusBalance(currency.bonus);
  }, []);
  
  // 🆕 Инициализация из глобальной валюты
  useEffect(() => {
    const globalCurrency = getGlobalCurrency();
    if (globalCurrency) {
      setSelectedCurrency(globalCurrency);
      setSelectedTokenId(globalCurrency.tokenId);
    }
  }, []);

  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }

    const init = async () => {
      try {
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
        
        const resetValue = 1.0;
        currentMultiplierRef.current = resetValue;
        targetMultiplierRef.current = resetValue;
        smoothMultiplierRef.current = resetValue;
        lastMultiplierRef.current = resetValue;
        lastMultiplierTimeRef.current = Date.now();
        isCrashedRef.current = false;
        crashPointRef.current = null;
        setDisplayMultiplier(resetValue);
        
        sessionStorage.removeItem(sessionKeys.betId);
        sessionStorage.removeItem(sessionKeys.currentBet);
        sessionStorage.removeItem(sessionKeys.balanceType);
        sessionStorage.removeItem(sessionKeys.userBonusId);
        
        await crashGameService.connect(user.id, user.firstName || `User${user.id}`, token);
        toast.success('🚀 Подключено!');
        
        await fetchBalances();

        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
          const response = await fetch(`${API_URL}/api/v1/crash/last-crashes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

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

              setCrashHistory(formatted);
              saveHistoryToStorage(formatted);
            }
          }
        } catch (error: any) {
          console.error('❌ Ошибка загрузки истории:', error.message);
        } finally {
          setIsHistoryLoaded(true);
        }
      } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        toast.error('❌ Ошибка подключения');
        setIsHistoryLoaded(true);
      }
    };

    init();

    return () => {
      crashGameService.disconnect();
    };
  }, [user, token, navigate, fetchBalances, saveHistoryToStorage, sessionKeys]);

  useEffect(() => {
    if (crashHistory.length > 0) {
      saveHistoryToStorage(crashHistory);
    }
  }, [crashHistory, saveHistoryToStorage]);

  // 🔧 УПРОЩЁННАЯ отрисовка - напрямую с сервера, без state updates
    const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Используем сглаженное значение для плавной анимации
    const currentMult = smoothMultiplierRef.current;

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

    const maxMult = Math.max(5, Math.ceil(currentMult * 1.3));
    
    const multToY = (mult: number): number => {
      const normalized = Math.min(mult, maxMult) / maxMult;
      return h - padding - normalized * graphHeight;
    };

    const points: { x: number; y: number }[] = [];
    const steps = 300; // Увеличено для более плавной кривой

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mult = 1 + Math.pow(t, 1.5) * (maxMult - 1);
      
      if (mult > currentMult) break;

      const x = padding + t * graphWidth;
      const y = multToY(mult);
      points.push({ x, y });
    }
    
    // Добавляем последнюю точку точно на текущем множителе для плавности
    if (points.length > 0 && currentMult > 1) {
      const lastT = Math.pow((currentMult - 1) / (maxMult - 1), 1 / 1.5);
      const lastX = padding + lastT * graphWidth;
      const lastY = multToY(currentMult);
      if (lastX > points[points.length - 1].x) {
        points.push({ x: lastX, y: lastY });
      }
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
      
      // Используем квадратичные кривые Безье для более плавной линии
      for (let i = 1; i < points.length; i++) {
        if (i === 1) {
          ctx.lineTo(points[i].x, points[i].y);
        } else {
          const prev = points[i - 1];
          const curr = points[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
      }
      
      // Завершаем линию до последней точки
      if (points.length > 2) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
      }
      
      ctx.strokeStyle = gameState.status === 'crashed' ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    if (gameState.status === 'flying' && points.length > 0) {
      const lastPoint = points[points.length - 1];
      const pulse = 14 + Math.sin(Date.now() / 150) * 6;
      
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastPoint.x - 3, lastPoint.y - 3, 3, 0, Math.PI * 2);
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
      const crashDisplay = crashPointRef.current ?? currentMult;
      ctx.fillText(`КРАХ @ ${crashDisplay.toFixed(2)}x`, w / 2, h / 2);
      ctx.shadowBlur = 0;
    }
  }, [gameState.status]);

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
      await crashGameService.cashout();
    } catch (e) {
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

  useEffect(() => {
    const handleGameCrashed = (data: any) => {
      isCrashedRef.current = true;
      crashPointRef.current = parseFloat(data.crashPoint.toString());
      const crashValue = crashPointRef.current;
      currentMultiplierRef.current = crashValue;
      targetMultiplierRef.current = crashValue;
      smoothMultiplierRef.current = crashValue;
      lastMultiplierRef.current = crashValue;
      lastMultiplierTimeRef.current = Date.now();
      setDisplayMultiplier(crashValue); // Мгновенно обновляем UI
      
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
      
      // Проверяем условия для Big Win Modal: множитель >= 5x ИЛИ выигрыш >= $1000
      if (data.multiplier >= 5 || data.winnings >= 1000) {
        setBigWinData({ winAmount: data.winnings, multiplier: data.multiplier });
        setIsBigWinModalOpen(true);
      }
      
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
      const normalizedStatus = (data.status === 'in_progress' || (data.status as any) === 'in_progress') ? 'flying' : data.status;
      const normalizedData = { ...data, status: normalizedStatus as 'waiting' | 'flying' | 'crashed' };
      
      if (normalizedStatus === 'waiting') {
        isCrashedRef.current = false;
        crashPointRef.current = null;
        const resetValue = 1.0;
        currentMultiplierRef.current = resetValue;
        targetMultiplierRef.current = resetValue;
        smoothMultiplierRef.current = resetValue;
        lastMultiplierRef.current = resetValue;
        lastMultiplierTimeRef.current = Date.now();
        setDisplayMultiplier(resetValue);
      }
      
      if (normalizedStatus === 'flying') {
        isCrashedRef.current = false;
        crashPointRef.current = null;
        const mult = data.multiplier || 1.0;
        currentMultiplierRef.current = mult;
        targetMultiplierRef.current = mult;
        smoothMultiplierRef.current = mult;
        lastMultiplierRef.current = mult;
        lastMultiplierTimeRef.current = Date.now();
        setDisplayMultiplier(mult);
      }
      
      setGameState(normalizedData);
      
      if (normalizedStatus === 'waiting') {
        setCanCashout(false);
        if (!betPlaced) {
          sessionStorage.removeItem(sessionKeys.betId);
          sessionStorage.removeItem(sessionKeys.currentBet);
          sessionStorage.removeItem(sessionKeys.balanceType);
          sessionStorage.removeItem(sessionKeys.userBonusId);
        }
      } else if (normalizedStatus === 'flying') {
        setCanCashout(betPlaced);
      }
    };

    const handleMultiplierUpdate = (data: { multiplier: number }) => {
      if (!isCrashedRef.current) {
        const newMultiplier = data.multiplier;
        
        // Обновляем целевое значение
        targetMultiplierRef.current = newMultiplier;
        currentMultiplierRef.current = newMultiplier;
        
        // Если множитель увеличился, обновляем время последнего обновления
        if (newMultiplier > lastMultiplierRef.current) {
          lastMultiplierTimeRef.current = Date.now();
        }
        
        // gameState.status обновляем только если был waiting
        setGameState((prev) => {
          if (prev.status === 'waiting') {
            return { ...prev, status: 'flying' };
          }
          return prev; // Не создаём новый объект если статус уже flying
        });
        setCanCashout(betPlaced);
      }
    };

    const handleRoundStarted = (data: { gameId: string }) => {
      isCrashedRef.current = false;
      crashPointRef.current = null;
      const resetValue = 1.0;
      currentMultiplierRef.current = resetValue;
      targetMultiplierRef.current = resetValue;
      smoothMultiplierRef.current = resetValue;
      lastMultiplierRef.current = resetValue;
      lastMultiplierTimeRef.current = Date.now();
      setDisplayMultiplier(resetValue); // Мгновенный сброс UI
      
      // Извлекаем номер раунда из gameId (если есть) или увеличиваем счетчик
      if (data.gameId) {
        // Пытаемся извлечь номер из gameId (например, "crash_12345" -> 12345)
        const match = data.gameId.match(/\d+/);
        if (match) {
          setRoundNumber(parseInt(match[0], 10));
        } else {
          setRoundNumber(prev => prev + 1);
        }
      } else {
        setRoundNumber(prev => prev + 1);
      }
      
      setGameState(prev => ({
        ...prev,
        gameId: data.gameId,
        status: 'flying',
        multiplier: 1.0,
        crashPoint: null,
      }));
    };
    
    const handleError = (data: { message: string }) => toast.error(`❌ ${data.message}`);

    crashGameService.on('gameStatus', handleGameStatus);
    crashGameService.on('multiplierUpdate', handleMultiplierUpdate);
    crashGameService.on('roundStarted', handleRoundStarted);
    crashGameService.on('gameCrashed', handleGameCrashed);
    crashGameService.on('playerJoined', handlePlayerJoined);
    crashGameService.on('betPlaced', handleBetPlaced);
    crashGameService.on('cashoutSuccess', handleCashoutSuccess);
    crashGameService.on('countdownUpdate', handleCountdownUpdate);
    crashGameService.on('error', handleError);

    return () => {
      crashGameService.off('gameStatus', handleGameStatus);
      crashGameService.off('multiplierUpdate', handleMultiplierUpdate);
      crashGameService.off('roundStarted', handleRoundStarted);
      crashGameService.off('gameCrashed', handleGameCrashed);
      crashGameService.off('playerJoined', handlePlayerJoined);
      crashGameService.off('betPlaced', handleBetPlaced);
      crashGameService.off('cashoutSuccess', handleCashoutSuccess);
      crashGameService.off('countdownUpdate', handleCountdownUpdate);
      crashGameService.off('error', handleError);
    };
  }, [betPlaced, currentBet, fetchBalances, sessionKeys]);

  const finalDisplayMultiplier = gameState.status === 'crashed' && crashPointRef.current 
    ? crashPointRef.current 
    : displayMultiplier;

  // 🔧 ПЛАВНАЯ АНИМАЦИЯ: Линейная интерполяция с фиксированной скоростью
  useEffect(() => {
    let animationFrameId: number;
    
    const smoothUpdate = () => {
      if (!isCrashedRef.current) {
        const target = targetMultiplierRef.current;
        const current = smoothMultiplierRef.current;
        const diff = target - current;
        
        // Если разница очень мала, устанавливаем точное значение
        if (Math.abs(diff) < 0.001) {
          if (current !== target) {
            smoothMultiplierRef.current = target;
            setDisplayMultiplier(target);
          }
        } else {
          // Фиксированная скорость изменения для плавности
          // Используем небольшую скорость для плавного движения
          const speed = 0.08; // Скорость приближения к целевому значению (0.05-0.15 оптимально)
          const step = diff * speed;
          
          // Ограничиваем максимальное изменение за кадр для предотвращения скачков
          const maxStep = 0.02;
          const clampedStep = Math.sign(step) * Math.min(Math.abs(step), maxStep);
          
          smoothMultiplierRef.current = Math.max(1.0, current + clampedStep);
          setDisplayMultiplier(smoothMultiplierRef.current);
        }
      }
      
      animationFrameId = requestAnimationFrame(smoothUpdate);
    };
    
    animationFrameId = requestAnimationFrame(smoothUpdate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  const totalPlayersDisplay = playersCount + FAKE_PLAYERS_OFFSET;

  return (
    <div className="game-page" style={{ paddingBottom: '96px' }}>
      <GameHeader 
        title="CRASH" 
        icon={<Flame className="w-6 h-6" style={{ color: '#f59e0b' }} />}
        balance={totalBalance}
        currency={selectedCurrency?.symbol || 'USDT'}
        onCurrencyChange={handleCurrencyChange}
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
          
          {/* 🆕 КОМПАКТНЫЕ БЛОКИ ПО УГЛАМ */}
          {/* Round Number - левый верхний угол */}
          <div className="absolute top-2 left-2 z-20">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
              <Hash className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-bold text-white/80 font-mono">
                #{roundNumber || gameState.gameId?.slice(-6) || '------'}
              </span>
            </div>
          </div>

          {/* Players - правый верхний угол */}
          <div className="absolute top-2 right-2 z-20">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
              <Users className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-white/80 font-mono">+{totalPlayersDisplay}</span>
              <span className="text-[9px] text-white/60">игрока</span>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* Статус игры */}
          <AnimatePresence>
            {gameState.status === 'waiting' ? (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
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
                      transition={{ duration: 0.3 }}
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
                {cashoutStatus === 'won' ? '✅ УСПЕШНО' : 'ЗАБРАТЬ'} ${(currentMultiplierRef.current * parseFloat(inputBet || '0')).toFixed(2)}
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

      {/* Big Win Modal */}
      {bigWinData && (
        <BigWinModal
          isOpen={isBigWinModalOpen}
          onClose={() => {
            setIsBigWinModalOpen(false);
            setBigWinData(null);
          }}
          winAmount={bigWinData.winAmount}
          multiplier={bigWinData.multiplier}
          gameType="crash"
        />
      )}
    </div>
  );
}