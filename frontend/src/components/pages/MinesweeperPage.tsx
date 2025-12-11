import { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Loader, Trophy, Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Difficulty {
  id: number;
  name: string;
  minesCount: number;
  multiplier: number;
  gridSize: number;
}

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

export function MinesweeperPage({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();

  const [step, setStep] = useState<'SELECT' | 'PLAYING' | 'REVEAL_BOARD' | 'RESULT'>('SELECT');
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
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
  
  // ✅ ИСПРАВЛЕНО: Хранить оба баланса
  const [mainBalance, setMainBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [cellLoading, setCellLoading] = useState(false);
  const [openedCells, setOpenedCells] = useState<Map<string, boolean>>(new Map());

  const { execute: getDifficulties } = useFetch('MINESWEEPER_GET_minesweeper_difficulties', 'GET');
  const { execute: startGame } = useFetch('MINESWEEPER_POST_minesweeper_start', 'POST');
  const { execute: revealCell } = useFetch('MINESWEEPER_POST_minesweeper_reveal', 'POST');
  const { execute: cashOut } = useFetch('MINESWEEPER_POST_minesweeper_cashout', 'POST');
  const { execute: getBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  useEffect(() => {
    if (step === 'REVEAL_BOARD') {
      const timer = setTimeout(() => {
        setStep('RESULT');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // ✅ ИСПРАВЛЕНО: Загружать оба баланса БЕЗ ЦИКЛА
  // Функция для загрузки баланса
  const loadBalance = useCallback(async () => {
    try {
      console.log('📊 [MINESWEEPER] Загружаю баланс...');
      const response = await getBalance();
      const data = response.data || response;

      if (Array.isArray(data)) {
        console.log(`📊 [MINESWEEPER] Получено ${data.length} балансов:`, data);

        // Находим MAIN и BONUS
        const main = data.find((b: BalanceItem) => b.type === 'MAIN')?.amount ?? 0;
        const bonus = data.find((b: BalanceItem) => b.type === 'BONUS')?.amount ?? 0;
        const total = main + bonus;

        console.log(`💰 [MINESWEEPER] Main: ${main}, Bonus: ${bonus}, Total: ${total}`);

        setMainBalance(main);
        setBonusBalance(bonus);
        setTotalBalance(total);
      }
    } catch (err) {
      console.error('❌ [MINESWEEPER] Ошибка загрузки баланса:', err);
      toast.error('Не удалось загрузить баланс');
      setMainBalance(0);
      setBonusBalance(0);
      setTotalBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  }, [getBalance]);

  // Загружаем баланс ТОЛЬКО ОДИН РАЗ при монтировании
  useEffect(() => {
    loadBalance();
  }, []); // ✅ ПУСТО - загружается один раз!

  // Загрузить сложности
  useEffect(() => {
    const load = async () => {
      try {
        const response = await getDifficulties();
        const data = response.data || response;
        setDifficulties(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('❌ [MINESWEEPER] Ошибка загрузки сложностей:', err);
        toast.error('Не удалось загрузить сложности');
      }
    };
    load();
  }, [getDifficulties]);

  const handleStartGame = useCallback(async () => {
    if (!selectedDifficulty) {
      toast.error('Выберите сложность');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную ставку');
      return;
    }

    // ✅ ИСПРАВЛЕНО: Проверяем объединённый баланс
    if (amount > totalBalance) {
      toast.error(`Недостаточно средств (доступно: ${totalBalance.toFixed(2)} USDT)`);
      return;
    }

    setLoading(true);
    try {
      console.log(`🎮 [MINESWEEPER] Начинаю игру с ставкой ${amount}`);
      const response = await startGame({
        difficultyId: selectedDifficulty.id,
        betAmount: amount,
        tokenId: 2,
      });

      const gameData = response;

      if (!gameData || typeof gameData.gameId !== 'number' || !Array.isArray(gameData.grid) || gameData.grid.length === 0) {
        throw new Error('Сервер вернул повреждённые данные');
      }

      setGameId(gameData.gameId);
      setGrid(gameData.grid);
      setOpenedCells(new Map());
      setCurrentMultiplier(parseFloat(gameData.currentMultiplier) || 1.0);
      setNextMultiplier(parseFloat(gameData.nextMultiplier) || 1.0);
      setMaxMultiplier(parseFloat(gameData.maxMultiplier) || 0);
      setPotentialWin(gameData.potentialWin?.toString() || '0');
      setStep('PLAYING');
      toast.success('Игра начата!');

      // ✅ Обновляем баланс после ставки
      setTimeout(() => {
        loadBalance();
      }, 500);
    } catch (err: any) {
      console.error('❌ [MINESWEEPER] Ошибка начала игры:', err);
      toast.error(err.message || 'Не удалось начать игру');
    } finally {
      setLoading(false);
    }
  }, [selectedDifficulty, betAmount, totalBalance, startGame, loadBalance]);

  const handleRevealCell = useCallback(async (x: number, y: number) => {
    if (gameStatus !== 'PLAYING' || !gameId || cellLoading) return;

    setCellLoading(true);
    const cellKey = `${x}-${y}`;
    
    try {
      const response = await revealCell({ gameId, x, y });
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
        toast.success(`🎉 Вы открыли всё поле! Выигрыш: ${result.winAmount} USDT`);

        // ✅ Обновляем баланс после победы
        setTimeout(() => {
          loadBalance();
        }, 1000);
      } else if (result.status === 'LOST') {
        setGameStatus('LOST');
        if (result.fullGrid) {
          setGrid(result.fullGrid);
        }
        setStep('REVEAL_BOARD');
        toast.error('💣 Вы попали в мину!');

        // ✅ Обновляем баланс после проигрыша
        setTimeout(() => {
          loadBalance();
        }, 1000);
      }
    } catch (err: any) {
      console.error('❌ [MINESWEEPER] Ошибка открытия клетки:', err);
      toast.error(err.message || 'Ошибка открытия клетки');
    } finally {
      setCellLoading(false);
    }
  }, [gameId, gameStatus, cellLoading, revealCell, loadBalance]);

  const handleCashOut = useCallback(async () => {
    if (!gameId) return;
    try {
      console.log(`💸 [MINESWEEPER] Кэшаут игры ${gameId}`);
      const response = await cashOut({ gameId });
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
      toast.success(`💸 Вы забрали ${result.winAmount} USDT`);

      // ✅ Обновляем баланс после кэшаута
      setTimeout(() => {
        loadBalance();
      }, 500);
    } catch (err: any) {
      console.error('❌ [MINESWEEPER] Ошибка кэшаута:', err);
      toast.error(err.message || 'Ошибка кэшаута');
    }
  }, [gameId, cashOut, loadBalance]);

  const getCellContent = (cell?: GridCell) => {
    if (!cell || !cell.revealed) return '';
    if (cell.isMine) return '💣';
    return '💰';
  };

  const resetGame = useCallback(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
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
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .back-button:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(-2px);
        }
        .minesweeper-content {
          animation: fadeIn 0.5s ease-out;
        }
        .minesweeper-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 2px solid rgba(59, 130, 246, 0.3);
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
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          text-align: center;
        }
        .stat-label {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
        }

        .bet-input {
          border: 2px solid #10b981 !important;
          background: rgba(16, 185, 129, 0.1) !important;
          color: white !important;
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

      <div className="minesweeper-page max-w-md mx-auto">
        <div className="minesweeper-header">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold">🎮 Сапёр</h1>
          <div style={{ width: 40 }} />
        </div>

        <div className="minesweeper-content">
          {step === 'SELECT' && (
            <Card className="card-animated p-4 bg-gray-800/80 border-gray-700 backdrop-blur-sm">
              {/* ✅ ИСПРАВЛЕНО: Компактный хедер с балансом */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">🎮 Выберите уровень</h2>
                <div className="flex items-center gap-2 bg-gray-700/50 px-3 py-1 rounded-lg">
                  <Coins size={16} className="text-yellow-400" />
                  {balanceLoading ? (
                    <Loader className="animate-spin" size={16} />
                  ) : (
                    <>
                      <span className="text-sm font-bold text-yellow-400">{totalBalance.toFixed(2)}</span>
                      {bonusBalance > 0 && (
                        <span className="text-xs text-amber-300">💛+{bonusBalance.toFixed(2)}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {difficulties.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader className="animate-spin inline mr-2" size={24} />
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  difficulties.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`difficulty-btn w-full p-3 rounded-lg border transition-all text-sm ${
                        selectedDifficulty?.id === diff.id
                          ? 'selected border-yellow-400 bg-yellow-500/15'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="text-left min-w-0">
                          <p className="font-bold">{diff.name}</p>
                          <p className="text-xs text-gray-400">
                            💣 {diff.minesCount} мин • 6×6
                          </p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <Trophy
                            size={18}
                            className={selectedDifficulty?.id === diff.id ? 'text-yellow-400' : 'text-gray-500'}
                          />
                          <p className="text-xs text-green-400 mt-1">
                            ×{((36 - diff.minesCount) / (6 - Math.sqrt(diff.minesCount))).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-300 mb-2 font-bold">Ставка (USDT)</label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="10"
                  className="bet-input w-full"
                />
              </div>

              <Button
                onClick={handleStartGame}
                disabled={!selectedDifficulty || loading || balanceLoading || difficulties.length === 0}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
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

          {step === 'PLAYING' && Array.isArray(grid) && grid.length === 6 && (
            <Card className="card-animated p-5 bg-gray-800/80 border-gray-700 backdrop-blur-sm">
              <div className="stats-container">
                <div className="stat-box">
                  <div className="stat-label">Текущий</div>
                  <div className="stat-value text-green-400">×{currentMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Следующий</div>
                  <div className="stat-value text-blue-400">×{nextMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Максимум</div>
                  <div className="stat-value text-purple-400">×{maxMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Потенциальный</div>
                  <div className="stat-value text-yellow-400">{potentialWin} USDT</div>
                </div>
              </div>

              <Button
                onClick={handleCashOut}
                disabled={cellLoading}
                className="w-full mb-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 border-0 font-bold py-2"
              >
                <Zap size={18} />
                Забрать выигрыш
              </Button>

              <div className="minesweeper-grid">
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
            </Card>
          )}

          {step === 'PLAYING' && (!Array.isArray(grid) || grid.length !== 6) && (
            <div className="flex justify-center items-center h-64">
              <Loader className="animate-spin text-blue-400" size={40} />
            </div>
          )}

          {(step === 'REVEAL_BOARD' || step === 'RESULT') && Array.isArray(grid) && grid.length === 6 && (
            <Card className="card-animated p-5 bg-gray-800/80 border-gray-700 backdrop-blur-sm">
              <div className="stats-container">
                <div className="stat-box">
                  <div className="stat-label">Итоговый</div>
                  <div className="stat-value text-green-400">×{currentMultiplier.toFixed(2)}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Выигрыш</div>
                  <div className={`stat-value ${gameStatus === 'WON' || gameStatus === 'CASHED_OUT' ? 'text-green-400' : 'text-red-400'}`}>
                    {winAmount ? winAmount + ' USDT' : '0'}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Статус</div>
                  <div className={`stat-value ${gameStatus === 'WON' || gameStatus === 'CASHED_OUT' ? 'text-green-400' : 'text-red-400'}`}>
                    {gameStatus === 'WON' ? '🎉' : gameStatus === 'CASHED_OUT' ? '💸' : '💣'}
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Максимум</div>
                  <div className="stat-value text-purple-400">×{maxMultiplier.toFixed(2)}</div>
                </div>
              </div>

              <div className="minesweeper-grid">
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
                <div className="mt-6 flex gap-3 animate-slideUp">
                  <Button
                    onClick={resetGame}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    Попробовать снова
                  </Button>
                  <Button
                    onClick={onBack}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    Выйти
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}