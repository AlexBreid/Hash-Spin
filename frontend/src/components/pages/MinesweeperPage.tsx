import { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { GameHeader } from './games/GameHeader';
import { BigWinModal } from '../modals/BigWinModal';
import { CurrencyInfo, getGlobalCurrency } from '../CurrencySelector';
import './games/games.css';

interface GridCell {
  revealed: boolean;
  isMine?: boolean;
}

interface BalanceItem {
  tokenId: number;
  symbol: string;
  amount: number;
  type: 'MAIN' | 'BONUS';
}

// 🎨 CSS переменные для темы
const getThemeColors = () => ({
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  border: 'var(--border)',
});

// Функция для расчета максимального множителя
// ВСЕГДА 24.8x независимо от количества мин
function calculateMaxMultiplier(minesCount: number): number {
  return 24.8;
}

// Функция для расчета базового множителя (первая клетка)
function calculateBaseMultiplier(minesCount: number): number {
  const gridSize = 5;
  const totalSafeCells = (gridSize * gridSize) - minesCount;
  const maxMultiplier = calculateMaxMultiplier(minesCount);
  
  // Если всего 1 безопасная клетка (24 мины), базовый = максимальный
  if (totalSafeCells === 1) {
    return maxMultiplier;
  }
  
  if (minesCount === 1) {
    return 1.03; // При 1 мине первая клетка = 1.03x
  } else if (minesCount === 15) {
    return 2.48; // При 15 минах первая клетка = 2.48x
  } else if (minesCount >= 24) {
    // При 24+ минах базовый множитель близок к максимальному
    return maxMultiplier * 0.95;
  } else {
    // Линейная интерполяция между 1.03 (1 мина) и 2.48 (15 мин)
    // Для значений больше 15 используем экспоненциальный рост
    if (minesCount < 15) {
      const slope = (2.48 - 1.03) / (15 - 1);
      return 1.03 + (minesCount - 1) * slope;
    } else {
      // Экспоненциальный рост от 2.48 (15 мин) до maxMultiplier * 0.95 (24 мин)
      const progress = (minesCount - 15) / (24 - 15);
      const targetBase = maxMultiplier * 0.95;
      return 2.48 + (targetBase - 2.48) * Math.pow(progress, 1.5);
    }
  }
}

export function MinesweeperPage({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const colors = getThemeColors();

  const [step, setStep] = useState<'SELECT' | 'PLAYING' | 'REVEAL_BOARD' | 'RESULT'>('SELECT');
  const [minesCount, setMinesCount] = useState<number | ''>(1);
  const [betAmount, setBetAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [gameStatus, setGameStatus] = useState<'PLAYING' | 'WON' | 'LOST' | 'CASHED_OUT'>('PLAYING');
  const [winAmount, setWinAmount] = useState<string | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [nextMultiplier, setNextMultiplier] = useState<number>(1.0);
  const [maxMultiplier, setMaxMultiplier] = useState<number>(0);
  const [potentialWin, setPotentialWin] = useState<string>('0');
  
  const [mainBalance, setMainBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  
  // 🆕 Выбранная валюта
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyInfo | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  
  // 🆕 СОХРАНЯЕМ balanceType и userBonusId!
  const [balanceType, setBalanceType] = useState<string | null>(null);
  const [userBonusId, setUserBonusId] = useState<string | null>(null);
  
  // Big Win Modal
  const [isBigWinModalOpen, setIsBigWinModalOpen] = useState(false);
  const [bigWinData, setBigWinData] = useState<{ winAmount: number; multiplier: number } | null>(null);
  
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [cellLoading, setCellLoading] = useState(false);
  const [openedCells, setOpenedCells] = useState<Map<string, boolean>>(new Map());

  const { execute: startGame } = useFetch('MINESWEEPER_POST_minesweeper_start', 'POST');
  const { execute: revealCell } = useFetch('MINESWEEPER_POST_minesweeper_reveal', 'POST');
  const { execute: cashOut } = useFetch('MINESWEEPER_POST_minesweeper_cashout', 'POST');
  const { execute: getBalance } = useFetch('BALANCE_GET_wallet_balance', 'GET');
  const { execute: getActiveGame } = useFetch('MINESWEEPER_GET_minesweeper_active', 'GET');

  useEffect(() => {
    if (step === 'REVEAL_BOARD') {
      const timer = setTimeout(() => {
        setStep('RESULT');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // 🔍 Проверка активной игры при загрузке
  useEffect(() => {
    let isMounted = true;
    
    const checkActiveGame = async () => {
      try {
        
        const response = await getActiveGame() as any;
        const data = response?.data || response;

        if (!isMounted) return;

        if (data && data.gameId) {
          
          toast.info('Восстанавливаю активную игру...');
          
          // Восстанавливаем состояние игры
          setGameId(data.gameId);
          setGrid(data.grid || []);
          setCurrentMultiplier(parseFloat(data.currentMultiplier?.toString() || '1.0'));
          setNextMultiplier(parseFloat(data.nextMultiplier?.toString() || '1.0'));
          setMaxMultiplier(parseFloat(data.maxMultiplier?.toString() || '0'));
          setPotentialWin(data.potentialWin?.toString() || '0');
          setMinesCount(data.minesCount || 1);
          setGameStatus('PLAYING');
          
          // Восстанавливаем balanceType и userBonusId из sessionStorage
          const savedBalanceType = sessionStorage.getItem(`minesweeper_balanceType_${data.gameId}`);
          const savedUserBonusId = sessionStorage.getItem(`minesweeper_userBonusId_${data.gameId}`);
          if (savedBalanceType) {
            setBalanceType(savedBalanceType);
          }
          if (savedUserBonusId) {
            setUserBonusId(savedUserBonusId);
          }
          
          // Восстанавливаем открытые клетки
          const opened = new Map<string, boolean>();
          if (data.grid && Array.isArray(data.grid)) {
            for (let y = 0; y < data.grid.length; y++) {
              for (let x = 0; x < data.grid[y]?.length || 0; x++) {
                if (data.grid[y][x]?.revealed) {
                  opened.set(`${x}-${y}`, !data.grid[y][x].isMine);
                }
              }
            }
          }
          setOpenedCells(opened);
          
          setStep('PLAYING');
          
          toast.success('Игра восстановлена!');
        } else {
          
        }
      } catch (err: any) {
        // Не показываем ошибку пользователю, это нормально если игры нет
      }
    };

    if (token) {
      checkActiveGame();
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadBalance = async () => {
      try {
        // Таймаут на случай, если запрос зависнет
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), 5000);
        });

        const response = await Promise.race([
          getBalance(),
          timeoutPromise
        ]) as any;
        
        clearTimeout(timeoutId);
        
        const data = response?.data || response;

        if (!isMounted) return;

        if (Array.isArray(data)) {
          const main = data.find((b: BalanceItem) => b.type === 'MAIN')?.amount ?? 0;
          const bonus = data.find((b: BalanceItem) => b.type === 'BONUS')?.amount ?? 0;
          const total = main + bonus;

          setMainBalance(main);
          setBonusBalance(bonus);
          setTotalBalance(total);
        }
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!isMounted) return;
        // Не показываем ошибку, просто устанавливаем 0
        setMainBalance(0);
        setBonusBalance(0);
        setTotalBalance(0);
      } finally {
        if (isMounted) {
          setBalanceLoading(false);
        }
      }
    };

    loadBalance();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBalance = async () => {
    try {
      const response = await getBalance();
      const data = response.data || response;

      if (Array.isArray(data)) {
        // Фильтруем по выбранному tokenId
        const filteredData = tokenId 
          ? data.filter((b: BalanceItem) => b.tokenId === tokenId)
          : data;
        
        const main = filteredData.find((b: BalanceItem) => b.type === 'MAIN')?.amount ?? 0;
        const bonus = filteredData.find((b: BalanceItem) => b.type === 'BONUS')?.amount ?? 0;
        const total = main + bonus;

        setMainBalance(main);
        setBonusBalance(bonus);
        setTotalBalance(total);
      }
    } catch (err) {
      }
  };
  
  // 🆕 Обработчик смены валюты
  const handleCurrencyChange = useCallback((currency: CurrencyInfo) => {
    setSelectedCurrency(currency);
    setTokenId(currency.tokenId);
    setTotalBalance(currency.balance);
    setMainBalance(currency.balance - currency.bonus);
    setBonusBalance(currency.bonus);
  }, []);
  
  // 🆕 Инициализация из глобальной валюты
  useEffect(() => {
    const globalCurrency = getGlobalCurrency();
    if (globalCurrency) {
      setSelectedCurrency(globalCurrency);
      setTokenId(globalCurrency.tokenId);
    }
  }, []);

  const handleStartGame = async () => {
    if (minesCount === '' || minesCount < 1 || minesCount > 24) {
      toast.error('Количество мин должно быть от 1 до 24');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную ставку');
      return;
    }

    if (amount > totalBalance) {
      toast.error(`Недостаточно средств (доступно: ${totalBalance.toFixed(2)} USDT)`);
      return;
    }

    setLoading(true);
    try {
      
      const response = await startGame({
        minesCount: minesCount,
        betAmount: amount,
        tokenId: tokenId || undefined,
      });

      

      // Проверяем структуру ответа (может быть response.data или response)
      const gameData = response?.data || response;

      

      if (!gameData) {
        throw new Error('Сервер не вернул данные');
      }

      if (typeof gameData.gameId !== 'number') {
        throw new Error('Сервер вернул некорректный ID игры');
      }

      if (!Array.isArray(gameData.grid)) {
        throw new Error('Сервер вернул некорректное поле');
      }

      // Временно создаем правильное поле 5x5 если сервер вернул 6x6 (для совместимости)
      let finalGrid = gameData.grid;
      if (gameData.grid.length === 6) {
        finalGrid = Array(5).fill(null).map(() =>
          Array(5).fill(null).map(() => ({
            revealed: false,
          }))
        );
      } else if (gameData.grid.length !== 5) {
        throw new Error(`Ожидалось поле 5x5, получено ${gameData.grid.length}x${gameData.grid[0]?.length || '?'}`);
      }

      // 🆕 СОХРАНЯЕМ balanceType и userBonusId!
      
      setBalanceType(gameData.balanceType);
      setUserBonusId(gameData.userBonusId);
      
      // Сохраняем в sessionStorage для восстановления
      if (gameData.balanceType) {
        sessionStorage.setItem(`minesweeper_balanceType_${gameData.gameId}`, gameData.balanceType);
      }
      if (gameData.userBonusId) {
        sessionStorage.setItem(`minesweeper_userBonusId_${gameData.gameId}`, gameData.userBonusId);
      }

      setGameId(gameData.gameId);
      setGrid(finalGrid);
      setOpenedCells(new Map());
      setCurrentMultiplier(parseFloat(gameData.currentMultiplier) || 1.0);
      setNextMultiplier(parseFloat(gameData.nextMultiplier) || 1.0);
      setMaxMultiplier(parseFloat(gameData.maxMultiplier) || 0);
      setPotentialWin(gameData.potentialWin?.toString() || '0');
      setGameStatus('PLAYING');
      
      
      
      
      
      
      
      // Устанавливаем step в последнюю очередь
      setStep('PLAYING');
      

      setTimeout(() => {
        refreshBalance();
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Не удалось начать игру');
    } finally {
      setLoading(false);
    }
  };

  const handleRevealCell = async (x: number, y: number) => {
    if (gameStatus !== 'PLAYING' || !gameId || cellLoading) return;

    setCellLoading(true);
    const cellKey = `${x}-${y}`;
    
    try {
      // 🆕 ОТПРАВЛЯЕМ balanceType и userBonusId!
      
      
      const response = await revealCell({ 
        gameId, 
        x, 
        y,
        balanceType,    // 🆕
        userBonusId     // 🆕
      });
      
      const result = response.data || response;

      if (!result) {
        throw new Error('Некорректный ответ при открытии клетки');
      }

      setGrid(prev => {
        const newGrid = prev.map(row => [...row]);
        newGrid[y][x] = {
          revealed: true,
          isMine: result.isMine,
        };
        return newGrid;
      });

      setOpenedCells(prev => new Map(prev).set(cellKey, !result.isMine));

      setCurrentMultiplier(parseFloat(result.currentMultiplier) || 1.0);
      setNextMultiplier(parseFloat(result.nextMultiplier) || 1.0);
      setMaxMultiplier(parseFloat(result.maxMultiplier) || 0);
      setPotentialWin(result.potentialWin?.toString() || '0');

      if (result.status === 'WON') {
        setGameStatus('WON');
        setWinAmount(result.winAmount);
        if (result.fullGrid) {
          setGrid(result.fullGrid);
        }
        setStep('REVEAL_BOARD');
        
        // Очищаем sessionStorage
        if (gameId) {
          sessionStorage.removeItem(`minesweeper_balanceType_${gameId}`);
          sessionStorage.removeItem(`minesweeper_userBonusId_${gameId}`);
        }
        
        const winAmountNum = parseFloat(result.winAmount || '0');
        const multiplierNum = parseFloat(result.currentMultiplier || '1');
        
        // Проверяем условия для Big Win Modal: множитель >= 5x ИЛИ выигрыш >= $1000
        if (multiplierNum >= 5 || winAmountNum >= 1000) {
          setBigWinData({ winAmount: winAmountNum, multiplier: multiplierNum });
          setIsBigWinModalOpen(true);
        }

        setTimeout(() => {
          refreshBalance();
        }, 1000);
      } else if (result.status === 'LOST') {
        setGameStatus('LOST');
        if (result.fullGrid) {
          setGrid(result.fullGrid);
        }
        setStep('REVEAL_BOARD');
        
        // Очищаем sessionStorage
        if (gameId) {
          sessionStorage.removeItem(`minesweeper_balanceType_${gameId}`);
          sessionStorage.removeItem(`minesweeper_userBonusId_${gameId}`);
        }

        setTimeout(() => {
          refreshBalance();
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка открытия клетки');
    } finally {
      setCellLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!gameId) return;
    try {
      // 🆕 ОТПРАВЛЯЕМ balanceType и userBonusId!
      
      
      const response = await cashOut({ 
        gameId,
        balanceType,    // 🆕
        userBonusId     // 🆕
      });
      
      const result = response.data || response;

      if (!result || typeof result.winAmount !== 'string') {
        throw new Error('Некорректный ответ при кэшауте');
      }

      setGameStatus('CASHED_OUT');
      setWinAmount(result.winAmount);
      if (result.fullGrid) {
        setGrid(result.fullGrid);
      }
      setStep('REVEAL_BOARD');
      
      // Очищаем sessionStorage
      if (gameId) {
        sessionStorage.removeItem(`minesweeper_balanceType_${gameId}`);
        sessionStorage.removeItem(`minesweeper_userBonusId_${gameId}`);
      }
      
      const winAmountNum = parseFloat(result.winAmount || '0');
      const multiplierNum = currentMultiplier; // Используем текущий множитель
      
        // Проверяем условия для Big Win Modal: множитель >= 5x ИЛИ выигрыш >= $1000
      if (multiplierNum >= 5 || winAmountNum >= 1000) {
        setBigWinData({ winAmount: winAmountNum, multiplier: multiplierNum });
        setIsBigWinModalOpen(true);
      }

      setTimeout(() => {
        refreshBalance();
      }, 500);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка кэшаута');
    }
  };

  const getCellContent = (cell?: GridCell) => {
    if (!cell || !cell.revealed) return '';
    if (cell.isMine) return '💣';
    return '💰';
  };

  const resetGame = () => {
    setStep('SELECT');
    setGameId(null);
    setGrid([]);
    setGameStatus('PLAYING');
    setWinAmount(null);
    setCurrentMultiplier(1.0);
    setNextMultiplier(1.0);
    setMaxMultiplier(0);
    setPotentialWin('0');
    setOpenedCells(new Map());
    
    // 🆕 Очищаем balanceType и userBonusId
    setBalanceType(null);
    setUserBonusId(null);
  };

  return (
    <div className="min-h-screen p-4 transition-colors duration-300" style={{ backgroundColor: colors.background, color: colors.foreground }}>
      <style>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        @keyframes bounce-in {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .minesweeper-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .minesweeper-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          animation: slideInDown 0.6s ease-out;
        }
        .back-button {
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .back-button:hover {
          transform: translateX(-2px);
        }
        .minesweeper-content {
          animation: fadeIn 0.5s ease-out;
        }
        .minesweeper-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          padding: 16px;
          border-radius: 12px;
          border: 2px solid;
        }
        .minesweeper-cell {
          aspect-ratio: 1;
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          padding: 0;
          user-select: none;
          position: relative;
          overflow: hidden;
        }
        .minesweeper-cell:disabled {
          cursor: not-allowed;
        }
        .minesweeper-cell.hidden {
          background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), inset 0 1px 3px rgba(255, 255, 255, 0.1);
          border: 2px solid #2563eb;
          animation: glow 2s ease-in-out infinite;
        }
        .minesweeper-cell.hidden:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 16px rgba(59, 130, 246, 0.6), inset 0 1px 3px rgba(255, 255, 255, 0.2);
        }
        .minesweeper-cell.hidden:active:not(:disabled) {
          transform: translateY(-1px) scale(0.98);
        }
        .minesweeper-cell.revealed-safe {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          cursor: default;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
          border: 2px solid #047857;
          animation: bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .minesweeper-cell.revealed-mine {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.7);
          animation: shake 0.5s ease-in-out, bounce-in 0.4s ease-out;
          border: 2px solid #7f1d1d;
        }
        .cell-content {
          display: inline-block;
          animation: fadeIn 0.3s ease-out;
        }

        .card-animated {
          animation: slideInDown 0.6s ease-out;
        }

        .difficulty-btn {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .difficulty-btn:hover {
          transform: translateY(-2px);
        }
        .difficulty-btn.selected {
          animation: pulse-scale 0.6s ease-out;
        }
        .stats-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
          animation: slideInDown 0.6s ease-out 0.1s both;
        }
        .stat-box {
          padding: 12px;
          border-radius: 8px;
          border: 1px solid;
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
        }

        .bet-input {
          border: 2px solid #10b981 !important;
          background: rgba(16, 185, 129, 0.1) !important;
          color: inherit !important;
          border-radius: 10px !important;
          padding: 8px 12px !important;
          font-size: 1rem !important;
        }
        .bet-input:focus {
          border-color: #34d399 !important;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3) !important;
          outline: none !important;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .animate-slideUp {
          animation: slideInUp 0.6s ease-out;
        }
      `}</style>

      <div className="minesweeper-page game-page max-w-md mx-auto">
        <GameHeader 
          title="САПЁР" 
          icon="🎮"
          balance={totalBalance}
          currency={selectedCurrency?.symbol || 'USDT'}
          onCurrencyChange={handleCurrencyChange}
          onRefreshBalance={refreshBalance}
        />

        <div className="minesweeper-content">
          {(!step || step === 'SELECT') && (
            <Card className="card-animated p-4 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              {/* Компактные настройки сверху */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs mb-1.5 font-semibold" style={{ color: colors.mutedForeground }}>
                    💣 Мины (1-24)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    value={minesCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Разрешаем пустое значение для редактирования
                      if (val === '') {
                        setMinesCount('');
                        return;
                      }
                      const numVal = parseInt(val);
                      if (!isNaN(numVal)) {
                        // Ограничиваем 1-24
                        setMinesCount(Math.min(24, Math.max(1, numVal)));
                      }
                    }}
                    onBlur={() => {
                      // При потере фокуса - если пусто, ставим 1
                      if (minesCount === '' || minesCount < 1) {
                        setMinesCount(1);
                      }
                    }}
                    className="bet-input w-full text-center font-bold"
                    style={{ color: colors.foreground }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-semibold" style={{ color: colors.mutedForeground }}>
                    💰 Ставка (USDT)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="10"
                    className="bet-input w-full text-center font-bold"
                    style={{ color: colors.foreground }}
                  />
                </div>
              </div>

              {/* Информация о множителях */}
              <div className="mb-4 p-3 rounded-xl" style={{
                backgroundColor: `color-mix(in srgb, ${colors.primary} 8%, transparent)`,
                border: `1px solid ${colors.border}`
              }}>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span style={{ color: colors.mutedForeground }}>Первая клетка:</span>
                    <span className="font-bold ml-1" style={{ color: colors.primary }}>×{calculateBaseMultiplier(minesCount || 1).toFixed(2)}</span>
                  </div>
                  <div>
                    <span style={{ color: colors.mutedForeground }}>Максимум:</span>
                    <span className="font-bold ml-1" style={{ color: '#F59E0B' }}>×{calculateMaxMultiplier(minesCount || 1).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Декоративное пустое поле 5x5 */}
              <div className="minesweeper-grid mb-4" style={{
                backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                borderColor: colors.border,
                opacity: 0.5
              }}>
                {Array.from({ length: 5 }).map((_, y) =>
                  Array.from({ length: 5 }).map((_, x) => (
                    <div
                      key={`${x}-${y}`}
                      className="minesweeper-cell hidden"
                      style={{ cursor: 'default' }}
                    >
                      <span className="cell-content">?</span>
                    </div>
                  ))
                )}
              </div>

              <Button
                onClick={handleStartGame}
                disabled={minesCount === '' || minesCount < 1 || minesCount > 24 || loading || balanceLoading}
                className="w-full font-black py-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 text-lg"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                  border: 'none'
                }}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2 inline" size={16} />
                    Создание игры...
                  </>
                ) : (
                  '▶️ Начать игру'
                )}
              </Button>
            </Card>
          )}

          {step === 'PLAYING' && Array.isArray(grid) && grid.length === 5 && (
            <Card className="card-animated p-4 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              {/* Компактная статистика сверху */}
              <div className="stats-container mb-4">
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Текущий</div>
                  <div className="stat-value text-green-400">×{currentMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Следующий</div>
                  <div className="stat-value text-blue-400">×{nextMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Максимум</div>
                  <div className="stat-value text-purple-400">×{maxMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Выигрыш</div>
                  <div className="stat-value text-yellow-400">{potentialWin} USDT</div>
                </div>
              </div>

              {/* Игровое поле */}
              <div className="minesweeper-grid mb-4" style={{
                backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                borderColor: colors.primary
              }}>
                {grid.map((row, y) =>
                  Array.isArray(row) ? (
                    row.map((cell, x) => (
                      <button
                        key={`${x}-${y}`}
                        onClick={() => handleRevealCell(x, y)}
                        disabled={cell?.revealed || gameStatus !== 'PLAYING' || cellLoading}
                        className={`minesweeper-cell ${
                          cell?.revealed
                            ? cell.isMine
                              ? 'revealed-mine'
                              : 'revealed-safe'
                            : 'hidden'
                        }`}
                      >
                        <span className="cell-content">{getCellContent(cell)}</span>
                      </button>
                    ))
                  ) : null
                )}
              </div>

              {/* Кнопка забрать выигрыш */}
              <Button
                onClick={handleCashOut}
                disabled={cellLoading || currentMultiplier <= 1}
                className="w-full rounded-xl flex items-center justify-center gap-2 border-0 font-black py-4 text-lg transition-all transform hover:scale-105 active:scale-95"
                style={{
                  background: currentMultiplier > 1 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
                    : 'rgba(100, 116, 139, 0.3)',
                  color: currentMultiplier > 1 ? '#ffffff' : 'rgba(255,255,255,0.5)',
                  boxShadow: currentMultiplier > 1 
                    ? '0 0 20px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(16, 185, 129, 0.4)' 
                    : 'none',
                  border: currentMultiplier > 1 ? '2px solid #34d399' : '1px solid rgba(100, 116, 139, 0.3)',
                  animation: currentMultiplier > 1.5 ? 'pulse-scale 1.5s ease-in-out infinite' : 'none'
                }}
              >
                <Zap size={20} />
                {currentMultiplier > 1 
                  ? `💰 ЗАБРАТЬ ${potentialWin} USDT` 
                  : 'Откройте клетку'}
              </Button>
            </Card>
          )}

          {step === 'PLAYING' && (!Array.isArray(grid) || grid.length !== 5) && (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
              <Loader className="animate-spin text-blue-400" size={40} />
              <p className="text-sm text-gray-400">
                Загрузка поля... {grid.length > 0 ? `Размер: ${grid.length}x${grid[0]?.length || '?'}` : 'Пусто'}
              </p>
            </div>
          )}

          {(step === 'REVEAL_BOARD' || step === 'RESULT') && Array.isArray(grid) && grid.length === 5 && (
            <Card className="card-animated p-5 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <div className="stats-container">
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Итоговый</div>
                  <div className="stat-value text-green-400">×{currentMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Выигрыш</div>
                  <div className={`stat-value ${gameStatus === 'WON' || gameStatus === 'CASHED_OUT' ? 'text-green-400' : 'text-red-400'}`}>
                    {winAmount ? winAmount + ' USDT' : '0'}
                  </div>
                </div>
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Статус</div>
                  <div className={`stat-value ${gameStatus === 'WON' || gameStatus === 'CASHED_OUT' ? 'text-green-400' : 'text-red-400'}`}>
                    {gameStatus === 'WON' ? '🎉' : gameStatus === 'CASHED_OUT' ? '💸' : '💣'}
                  </div>
                </div>
                <div className="stat-box" style={{
                  backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                  borderColor: colors.border
                }}>
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Максимум</div>
                  <div className="stat-value text-purple-400">×{maxMultiplier.toFixed(2)}</div>
                </div>
              </div>

              <div className="minesweeper-grid" style={{
                backgroundColor: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
                borderColor: colors.primary
              }}>
                {grid.map((row, y) =>
                  Array.isArray(row) ? (
                    row.map((cell, x) => (
                      <button
                        key={`${x}-${y}`}
                        disabled={true}
                        className={`minesweeper-cell ${
                          cell?.revealed
                            ? cell.isMine
                              ? 'revealed-mine'
                              : 'revealed-safe'
                            : 'hidden'
                        }`}
                      >
                        <span className="cell-content">{getCellContent(cell)}</span>
                      </button>
                    ))
                  ) : null
                )}
              </div>

              {step === 'RESULT' && (
                <div className="mt-6 flex flex-col gap-3 animate-slideUp">
                  {/* Кнопка забрать выигрыш - только если выиграли */}
                  {(gameStatus === 'WON' || gameStatus === 'CASHED_OUT') && winAmount && (
                    <Button
                      onClick={resetGame}
                      className="w-full py-4 text-lg font-black rounded-xl transition-all transform hover:scale-105 active:scale-95 animate-pulse"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                        color: '#ffffff',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.5), 0 4px 15px rgba(16, 185, 129, 0.4)',
                        border: '2px solid #34d399'
                      }}
                    >
                      💰 ЗАБРАТЬ {winAmount} USDT
                    </Button>
                  )}
                  
                  {/* Кнопка попробовать снова */}
                  <Button
                    onClick={resetGame}
                    className="w-full py-3 font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                      color: '#ffffff',
                      boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                      border: '2px solid #60a5fa'
                    }}
                  >
                    🔄 Попробовать снова
                  </Button>
                  
                  <Button
                    onClick={onBack}
                    className="w-full py-2 text-sm transition-all transform hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: 'rgba(100, 116, 139, 0.3)',
                      color: colors.mutedForeground,
                      border: '1px solid rgba(100, 116, 139, 0.5)'
                    }}
                  >
                    Выйти
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

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
          gameType="minesweeper"
        />
      )}
    </div>
  );
}

