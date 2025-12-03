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
  const [potentialWin, setPotentialWin] = useState<string>('0');
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [cellLoading, setCellLoading] = useState(false);
  const [openedCells, setOpenedCells] = useState<Map<string, boolean>>(new Map());

  const { execute: getDifficulties } = useFetch('MINESWEEPER_GET_minesweeper_difficulties', 'GET');
  const { execute: startGame } = useFetch('MINESWEEPER_POST_minesweeper_start', 'POST');
  const { execute: revealCell } = useFetch('MINESWEEPER_POST_minesweeper_reveal', 'POST');
  const { execute: cashOut } = useFetch('MINESWEEPER_POST_minesweeper_cashout', 'POST');
  const { execute: getBalance } = useFetch('WALLET_GET_wallet_balance', 'GET');

  // 🔹 ФУНКЦИЯ: расчёт максимального множителя
  const calculateMaxMultiplier = useCallback((minesCount: number): number => {
    const totalCells = 6 * 6; // 36 клеток
    return minesCount > 0 ? parseFloat((totalCells / minesCount).toFixed(2)) : 0;
  }, []);

  useEffect(() => {
    if (step === 'REVEAL_BOARD') {
      const timer = setTimeout(() => {
        setStep('RESULT');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const response = await getBalance();
        const data = response.data || response;
        if (Array.isArray(data)) {
          const usdt = data.find((b: any) => b.symbol === 'USDT' && b.type === 'MAIN');
          setBalance(usdt?.amount ?? 0);
        }
      } catch (err) {
        toast.error('Не удалось загрузить баланс');
      } finally {
        setBalanceLoading(false);
      }
    };
    loadBalance();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getDifficulties();
        const data = response.data || response;
        setDifficulties(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error('Не удалось загрузить сложности');
      }
    };
    load();
  }, []);

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

    if (amount > balance) {
      toast.error('Недостаточно средств');
      return;
    }

    setLoading(true);
    try {
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
      setPotentialWin(gameData.potentialWin?.toString() || '0');
      setStep('PLAYING');
      toast.success('Игра начата!');
    } catch (err: any) {
      console.error('Ошибка начала игры:', err);
      toast.error(err.message || 'Не удалось начать игру');
    } finally {
      setLoading(false);
    }
  }, [selectedDifficulty, betAmount, balance, startGame]);

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
      setPotentialWin(result.potentialWin?.toString() || '0');

      if (result.status === 'WON') {
        setGameStatus('WON');
        setWinAmount(result.winAmount);
        if (result.fullGrid) {
          setGrid(result.fullGrid);
        }
        setStep('REVEAL_BOARD');
        toast.success(`🎉 Вы открыли всё поле! Выигрыш: ${result.winAmount} USDT`);
      } else if (result.status === 'LOST') {
        setGameStatus('LOST');
        if (result.fullGrid) {
          setGrid(result.fullGrid);
        }
        setStep('REVEAL_BOARD');
        toast.error('💣 Вы попали в мину!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка открытия клетки');
    } finally {
      setCellLoading(false);
    }
  }, [gameId, gameStatus, cellLoading, revealCell]);

  const handleCashOut = useCallback(async () => {
    if (!gameId) return;
    try {
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
    } catch (err: any) {
      toast.error(err.message || 'Ошибка кэшаута');
    }
  }, [gameId, cashOut]);

  // 🔹 ОБНОВЛЕНО: вместо ✅ → 💰
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
        .balance-box {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
          border: 2px solid rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }
        .balance-box:hover {
          border-color: rgba(59, 130, 246, 0.6);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
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
          display: flex;
          justify-content: space-around;
          gap: 12px;
          margin-bottom: 16px;
          animation: slideInDown 0.6s ease-out 0.1s both;
        }
        .stat-box {
          flex: 1;
          text-align: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        /* 🔹 СТИЛЬ ДЛЯ ПОЛЯ СТАВКИ — ЗЕЛЁНАЯ РАМКА */
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
            <Card className="card-animated p-6 bg-gray-800/80 border-gray-700 backdrop-blur-sm">
              <h2 className="text-xl font-bold mb-4">Выберите уровень</h2>

              <div className="balance-box p-4 rounded-xl mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={18} className="text-yellow-400" />
                  <span className="text-sm text-gray-300">Ваш баланс</span>
                </div>
                {balanceLoading ? (
                  <div className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                    <Loader className="animate-spin" size={20} />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-yellow-400">{balance.toFixed(2)} USDT</p>
                )}
              </div>

              <div className="space-y-3 mb-6">
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
                      className={`difficulty-btn w-full p-4 rounded-xl border transition-all ${
                        selectedDifficulty?.id === diff.id
                          ? 'selected border-yellow-400 bg-yellow-500/15'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-left">
                          <p className="font-bold text-lg">{diff.name}</p>
                          <p className="text-sm text-gray-400">
                            💣 {diff.minesCount} мин • 🎯 6×6 поле
                          </p>
                          {/* 🔹 ОТОБРАЖЕНИЕ МАКС. МНОЖИТЕЛЯ */}
                          <p className="text-xs text-green-400 mt-1">
                            Макс. ×{calculateMaxMultiplier(diff.minesCount).toFixed(2)}
                          </p>
                        </div>
                        <Trophy
                          size={24}
                          className={selectedDifficulty?.id === diff.id ? 'text-yellow-400' : 'text-gray-500'}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2">Ставка (USDT)</label>
                {/* 🔹 ПРИМЕНЕНИЕ КЛАССА ДЛЯ ЗЕЛЁНОЙ РАМКИ */}
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2 inline" size={18} />
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
                  <p className="text-xs text-gray-400">Множитель</p>
                  <p className="text-2xl font-bold text-green-400">x{currentMultiplier.toFixed(2)}</p>
                </div>
                <div className="stat-box">
                  <p className="text-xs text-gray-400">Потенциальный</p>
                  <p className="text-2xl font-bold text-yellow-400">{potentialWin} USDT</p>
                </div>
                <Button
                  onClick={handleCashOut}
                  disabled={cellLoading}
                  className="stat-box bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg flex items-center justify-center gap-1 border-0"
                >
                  <Zap size={16} />
                  Забрать
                </Button>
              </div>

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
                  <p className="text-xs text-gray-400">Множитель</p>
                  <p className="text-2xl font-bold text-green-400">x{currentMultiplier.toFixed(2)}</p>
                </div>
                <div className="stat-box">
                  <p className="text-xs text-gray-400">Потенциальный</p>
                  <p className="text-2xl font-bold text-yellow-400">{potentialWin} USDT</p>
                </div>
                <div className="stat-box">
                  <p className="text-xs text-gray-400">Статус</p>
                  <p className={`text-2xl font-bold ${gameStatus === 'WON' || gameStatus === 'CASHED_OUT' ? 'text-green-400' : 'text-red-400'}`}>
                    {gameStatus === 'WON' ? '🎉' : gameStatus === 'CASHED_OUT' ? '💸' : '💣'}
                  </p>
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