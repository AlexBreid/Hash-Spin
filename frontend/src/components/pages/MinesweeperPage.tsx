import { useState, useEffect } from 'react';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ArrowLeft, Loader, Trophy, Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { GameHeader } from './games/GameHeader';
import './games/games.css';

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

export function MinesweeperPage({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const colors = getThemeColors();

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
  
  const [mainBalance, setMainBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  
  // 🆕 СОХРАНЯЕМ balanceType и userBonusId!
  const [balanceType, setBalanceType] = useState<string | null>(null);
  const [userBonusId, setUserBonusId] = useState<string | null>(null);
  
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

  useEffect(() => {
    console.log('📊 [MINESWEEPER] Инициализирую компонент...');
    
    const loadBalance = async () => {
      try {
        console.log('📊 [MINESWEEPER] Загружаю баланс...');
        const response = await getBalance();
        const data = response.data || response;

        if (Array.isArray(data)) {
          console.log(`📊 [MINESWEEPER] Получено ${data.length} балансов:`, data);

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
    };

    const loadDifficulties = async () => {
      try {
        console.log('📊 [MINESWEEPER] Загружаю сложности...');
        const response = await getDifficulties();
        const data = response.data || response;
        
        if (Array.isArray(data)) {
          console.log(`✅ [MINESWEEPER] Получено ${data.length} сложностей`);
          setDifficulties(data);
        }
      } catch (err) {
        console.error('❌ [MINESWEEPER] Ошибка загрузки сложностей:', err);
        toast.error('Не удалось загрузить сложности');
      }
    };

    loadBalance();
    loadDifficulties();

  }, []);

  const refreshBalance = async () => {
    try {
      const response = await getBalance();
      const data = response.data || response;

      if (Array.isArray(data)) {
        const main = data.find((b: BalanceItem) => b.type === 'MAIN')?.amount ?? 0;
        const bonus = data.find((b: BalanceItem) => b.type === 'BONUS')?.amount ?? 0;
        const total = main + bonus;

        setMainBalance(main);
        setBonusBalance(bonus);
        setTotalBalance(total);
      }
    } catch (err) {
      console.error('❌ [MINESWEEPER] Ошибка обновления баланса:', err);
    }
  };

  const handleStartGame = async () => {
    if (!selectedDifficulty) {
      toast.error('Выберите сложность');
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

      // 🆕 СОХРАНЯЕМ balanceType и userBonusId!
      console.log(`🆕 [START] Сохраняю balanceType=${gameData.balanceType}, userBonusId=${gameData.userBonusId}`);
      setBalanceType(gameData.balanceType);
      setUserBonusId(gameData.userBonusId);

      setGameId(gameData.gameId);
      setGrid(gameData.grid);
      setOpenedCells(new Map());
      setCurrentMultiplier(parseFloat(gameData.currentMultiplier) || 1.0);
      setNextMultiplier(parseFloat(gameData.nextMultiplier) || 1.0);
      setMaxMultiplier(parseFloat(gameData.maxMultiplier) || 0);
      setPotentialWin(gameData.potentialWin?.toString() || '0');
      setStep('PLAYING');
      toast.success('Игра начата!');

      setTimeout(() => {
        refreshBalance();
      }, 500);
    } catch (err: any) {
      console.error('❌ [MINESWEEPER] Ошибка начала игры:', err);
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
      console.log(`🎮 [REVEAL] Отправляю: gameId=${gameId}, x=${x}, y=${y}, balanceType=${balanceType}, userBonusId=${userBonusId}`);
      
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
        toast.success(`🎉 Вы открыли всё поле! Выигрыш: ${result.winAmount} USDT`);

        setTimeout(() => {
          refreshBalance();
        }, 1000);
      } else if (result.status === 'LOST') {
        setGameStatus('LOST');
        if (result.fullGrid) {
          setGrid(result.fullGrid);
        }
        setStep('REVEAL_BOARD');
        toast.error('💣 Вы попали в мину!');

        setTimeout(() => {
          refreshBalance();
        }, 1000);
      }
    } catch (err: any) {
      console.error('❌ [MINESWEEPER] Ошибка открытия клетки:', err);
      toast.error(err.message || 'Ошибка открытия клетки');
    } finally {
      setCellLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!gameId) return;
    try {
      // 🆕 ОТПРАВЛЯЕМ balanceType и userBonusId!
      console.log(`💸 [CASHOUT] Кэшаут игры ${gameId}, balanceType=${balanceType}, userBonusId=${userBonusId}`);
      
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
      toast.success(`💸 Вы забрали ${result.winAmount} USDT`);

      setTimeout(() => {
        refreshBalance();
      }, 500);
    } catch (err: any) {
      console.error('❌ [MINESWEEPER] Ошибка кэшаута:', err);
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
          grid-template-columns: repeat(6, 1fr);
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
        />

        <div className="minesweeper-content">
          {step === 'SELECT' && (
            <Card className="card-animated p-4 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: colors.foreground }}>🎮 Выберите уровень</h2>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-bold" style={{
                  backgroundColor: '#FBBF24',
                  border: '2px solid #F59E0B'
                }}>
                  <Coins size={18} style={{ color: '#000000' }} />
                  {balanceLoading ? (
                    <Loader className="animate-spin" size={16} style={{ color: '#000000' }} />
                  ) : (
                    <>
                      <span className="text-sm" style={{ color: '#000000' }}>💰 {totalBalance.toFixed(2)}</span>
                      {bonusBalance > 0 && (
                        <span className="text-xs" style={{ color: '#7c2d12' }}>💛+{bonusBalance.toFixed(2)}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {difficulties.length === 0 ? (
                  <div className="text-center py-8" style={{ color: colors.mutedForeground }}>
                    <Loader className="animate-spin inline mr-2" size={24} />
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  difficulties.map((diff) => (
                    <button
                      key={diff.id}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`difficulty-btn w-full p-4 rounded-2xl border-2 transition-all text-sm font-bold`}
                      style={{
                        borderColor: selectedDifficulty?.id === diff.id ? '#FBBF24' : colors.border,
                        backgroundColor: selectedDifficulty?.id === diff.id 
                          ? '#FBBF24'
                          : colors.card,
                        color: selectedDifficulty?.id === diff.id ? '#000000' : colors.foreground
                      }}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <div className="text-left min-w-0">
                          <p className="font-black text-base">{diff.name}</p>
                          <p className="text-xs mt-1" style={{ color: selectedDifficulty?.id === diff.id ? '#1f2937' : colors.mutedForeground }}>
                            💣 {diff.minesCount} мин • 6×6
                          </p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <Trophy
                            size={20}
                            className={selectedDifficulty?.id === diff.id ? 'text-black' : 'text-gray-500'}
                          />
                          <p className="text-xs font-bold mt-1" style={{ color: selectedDifficulty?.id === diff.id ? '#000000' : '#10b981' }}>
                            ×{((36 - diff.minesCount) / (6 - Math.sqrt(diff.minesCount))).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="mb-4">
                <label className="block text-xs mb-2 font-bold" style={{ color: colors.mutedForeground }}>Ставка (USDT)</label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="10"
                  className="bet-input w-full"
                  style={{ color: colors.foreground }}
                />
              </div>

              <Button
                onClick={handleStartGame}
                disabled={!selectedDifficulty || loading || balanceLoading || difficulties.length === 0}
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

          {step === 'PLAYING' && Array.isArray(grid) && grid.length === 6 && (
            <Card className="card-animated p-5 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <div className="stats-container">
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
                  <div className="stat-label" style={{ color: colors.mutedForeground }}>Потенциальный</div>
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

              <div className="minesweeper-grid" style={{
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
            </Card>
          )}

          {step === 'PLAYING' && (!Array.isArray(grid) || grid.length !== 6) && (
            <div className="flex justify-center items-center h-64">
              <Loader className="animate-spin text-blue-400" size={40} />
            </div>
          )}

          {(step === 'REVEAL_BOARD' || step === 'RESULT') && Array.isArray(grid) && grid.length === 6 && (
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
                <div className="mt-6 flex gap-3 animate-slideUp">
                  <Button
                    onClick={resetGame}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    Попробовать снова
                  </Button>
                  <Button
                    onClick={onBack}
                    className="flex-1 text-white transition-all transform hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${colors.primary} 50%, transparent)`,
                      borderColor: colors.primary
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
    </div>
  );
}