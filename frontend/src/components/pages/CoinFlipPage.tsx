import { useState, useEffect, useCallback } from 'react';
import { useFetch } from '../../hooks/useDynamicApi';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader } from 'lucide-react';
import { toast } from 'sonner';
import { GameHeader } from './games/GameHeader';
import { BigWinModal } from '../modals/BigWinModal';
import { CurrencyInfo, getGlobalCurrency } from '../CurrencySelector';
import './games/games.css';

interface BalanceItem {
  tokenId: number;
  symbol: string;
  amount: number;
  type: 'MAIN' | 'BONUS';
}

interface GameResult {
  gameId: number;
  choice: number;   // 1 = орёл, 2 = решка
  result: number;    // 1 = орёл, 2 = решка
  isWin: boolean;
  multiplier: number;
  betAmount: number;
  winAmount: number;
  newBalance: number;
}

interface HistoryItem {
  id: number;
  choice: number;
  result: number;
  isWin: boolean;
  betAmount: number;
  winAmount: number;
  multiplier: number;
  token: string;
  createdAt: string;
}

const getThemeColors = () => ({
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  border: 'var(--border)',
});

const MULTIPLIER = 1.8;

export function CoinFlipPage({ onBack }: { onBack: () => void }) {
  const { token } = useAuth();
  const colors = getThemeColors();

  const [betAmount, setBetAmount] = useState('10');
  const [choice, setChoice] = useState<1 | 2 | null>(null); // 1=орёл, 2=решка
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [mainBalance, setMainBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyInfo | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);

  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<number | null>(null); // 1 or 2
  const [showResult, setShowResult] = useState(false);
  const [lastGame, setLastGame] = useState<GameResult | null>(null);
  const [flipKey, setFlipKey] = useState(0);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [isBigWinModalOpen, setIsBigWinModalOpen] = useState(false);
  const [bigWinData, setBigWinData] = useState<{ winAmount: number; multiplier: number } | null>(null);

  const { execute: playGame } = useFetch('COINFLIP_POST_coinflip_play', 'POST');
  const { execute: getBalance } = useFetch('BALANCE_GET_wallet_balance', 'GET');
  const { execute: getHistory } = useFetch('COINFLIP_GET_coinflip_history', 'GET');

  useEffect(() => {
    let isMounted = true;
    const loadBalance = async () => {
      try {
        const response = await getBalance() as any;
        const data = response?.data || response;
        if (!isMounted) return;
        if (Array.isArray(data)) {
          const main = data.find((b: BalanceItem) => b.type === 'MAIN')?.amount ?? 0;
          const bonus = data.find((b: BalanceItem) => b.type === 'BONUS')?.amount ?? 0;
          setMainBalance(main);
          setBonusBalance(bonus);
          setTotalBalance(main + bonus);
        }
      } catch {
        if (!isMounted) return;
        setMainBalance(0); setBonusBalance(0); setTotalBalance(0);
      } finally {
        if (isMounted) setBalanceLoading(false);
      }
    };
    loadBalance();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await getHistory() as any;
        const data = response?.data || response;
        if (Array.isArray(data)) setHistory(data);
      } catch {}
    };
    if (token) loadHistory();
  }, [token]);

  const refreshBalance = async () => {
    try {
      const response = await getBalance();
      const data = (response as any)?.data || response;
      if (Array.isArray(data)) {
        const filteredData = tokenId ? data.filter((b: BalanceItem) => b.tokenId === tokenId) : data;
        const main = filteredData.find((b: BalanceItem) => b.type === 'MAIN')?.amount ?? 0;
        const bonus = filteredData.find((b: BalanceItem) => b.type === 'BONUS')?.amount ?? 0;
        setMainBalance(main); setBonusBalance(bonus); setTotalBalance(main + bonus);
      }
    } catch {}
  };

  const handleCurrencyChange = useCallback((currency: CurrencyInfo) => {
    setSelectedCurrency(currency);
    setTokenId(currency.tokenId);
    setTotalBalance(currency.balance);
    setMainBalance(currency.balance - currency.bonus);
    setBonusBalance(currency.bonus);
  }, []);

  useEffect(() => {
    const globalCurrency = getGlobalCurrency();
    if (globalCurrency) {
      setSelectedCurrency(globalCurrency);
      setTokenId(globalCurrency.tokenId);
    }
  }, []);

  const handlePlay = async () => {
    if (!choice) {
      toast.error('Выберите орёл или решку');
      return;
    }
    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную ставку');
      return;
    }
    if (amount > totalBalance) {
      toast.error(`Недостаточно средств (доступно: ${totalBalance.toFixed(2)})`);
      return;
    }

    setLoading(true);
    setShowResult(false);
    setFlipResult(null);
    setLastGame(null);

    try {
      const response = await playGame({
        betAmount: amount,
        choice, // 1 или 2
        tokenId: tokenId || undefined,
      });
      const gameData: GameResult = (response as any)?.data || response as any;
      if (!gameData || gameData.gameId === undefined) {
        throw new Error('Сервер не вернул данные');
      }

      // result = 1 (орёл) или 2 (решка)
      setFlipResult(gameData.result);
      setFlipKey(prev => prev + 1);
      setIsFlipping(true);

      setTimeout(() => {
        setIsFlipping(false);
        setShowResult(true);
        setLastGame(gameData);

        if (gameData.isWin) {
          toast.success(`🎉 Вы выиграли ${gameData.winAmount.toFixed(2)}!`);
          if (gameData.winAmount >= 1000) {
            setBigWinData({ winAmount: gameData.winAmount, multiplier: MULTIPLIER });
            setIsBigWinModalOpen(true);
          }
        } else {
          toast.error('😢 Не повезло! Попробуйте ещё раз');
        }

        setHistory(prev => [{
          id: gameData.gameId,
          choice: gameData.choice,
          result: gameData.result,
          isWin: gameData.isWin,
          betAmount: gameData.betAmount,
          winAmount: gameData.winAmount,
          multiplier: gameData.multiplier,
          token: selectedCurrency?.symbol || 'USDT',
          createdAt: new Date().toISOString(),
        }, ...prev].slice(0, 20));

        setTotalBalance(gameData.newBalance);
        refreshBalance();
      }, 1100);

    } catch (err: any) {
      toast.error(err.message || 'Не удалось начать игру');
      setIsFlipping(false);
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setShowResult(false);
    setFlipResult(null);
    setLastGame(null);
  };

  const potentialWin = choice ? (parseFloat(betAmount || '0') * MULTIPLIER).toFixed(2) : '0.00';
  const resultIsHeads = flipResult === 1;

  return (
    <div className="min-h-screen p-3 transition-colors duration-300" style={{ backgroundColor: colors.background, color: colors.foreground }}>
      <style>{`
        /* ===== HEADER z-index ===== */
        .coinflip-header-wrap {
          position: relative;
          z-index: 50;
        }

        /* ===== 3D МОНЕТА ===== */
        .coin-scene {
          perspective: 500px;
          width: 110px;
          height: 110px;
          margin: 0 auto;
        }
        .coin-scene.glow-win {
          filter: drop-shadow(0 0 20px rgba(16,185,129,0.7)) drop-shadow(0 0 6px rgba(16,185,129,0.4));
        }
        .coin-scene.glow-lose {
          filter: drop-shadow(0 0 20px rgba(239,68,68,0.5)) drop-shadow(0 0 6px rgba(239,68,68,0.3));
        }
        .coin-scene.glow-idle {
          filter: drop-shadow(0 4px 12px rgba(234,179,8,0.35));
        }
        .coin-scene.glow-flip {
          animation: sceneGlow 1s ease-in-out;
        }
        @keyframes sceneGlow {
          0%   { filter: drop-shadow(0 4px 8px rgba(234,179,8,0.3)); }
          40%  { filter: drop-shadow(0 8px 28px rgba(234,179,8,0.6)); }
          100% { filter: drop-shadow(0 4px 10px rgba(234,179,8,0.35)); }
        }

        .coin-3d {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
        }

        .coin-face {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          backface-visibility: hidden;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .coin-face .coin-icon {
          font-size: 46px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        /* ОРЁЛ — передняя (gold) */
        .coin-face--heads {
          transform: translateZ(5px);
          background: radial-gradient(circle at 38% 32%,
            #ffe066 0%, #fbbf24 25%, #f59e0b 50%, #d97706 75%, #b45309 100%);
          border: 3px solid #92400e;
          box-shadow:
            inset 0 -4px 8px rgba(0,0,0,0.35),
            inset 0 4px 8px rgba(255,255,255,0.4),
            inset 3px 0 6px rgba(255,255,255,0.15),
            inset -3px 0 6px rgba(0,0,0,0.15),
            0 2px 12px rgba(234,179,8,0.5);
        }
        .coin-face--heads::before {
          content: '';
          position: absolute;
          width: 82%;
          height: 82%;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.2);
          box-shadow: inset 0 0 8px rgba(255,255,255,0.1);
          pointer-events: none;
        }

        /* РЕШКА — задняя (silver/blue) */
        .coin-face--tails {
          transform: rotateY(180deg) translateZ(5px);
          background: radial-gradient(circle at 38% 32%,
            #e2e8f0 0%, #cbd5e1 25%, #94a3b8 50%, #64748b 75%, #475569 100%);
          border: 3px solid #334155;
          box-shadow:
            inset 0 -4px 8px rgba(0,0,0,0.3),
            inset 0 4px 8px rgba(255,255,255,0.5),
            inset 3px 0 6px rgba(255,255,255,0.2),
            inset -3px 0 6px rgba(0,0,0,0.1),
            0 2px 12px rgba(100,116,139,0.5);
        }
        .coin-face--tails::before {
          content: '';
          position: absolute;
          width: 82%;
          height: 82%;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          box-shadow: inset 0 0 8px rgba(255,255,255,0.15);
          pointer-events: none;
        }

        /* Ребро */
        .coin-edge-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(180deg, #d4a017 0%, #b8860b 50%, #8B6914 100%);
          box-shadow: inset 0 0 3px rgba(0,0,0,0.25);
        }

        /* Idle */
        .coin-3d.idle {
          animation: idleHover 3.5s ease-in-out infinite;
        }
        @keyframes idleHover {
          0%, 100% { transform: rotateY(0deg) rotateX(15deg); }
          25%  { transform: rotateY(20deg) rotateX(8deg); }
          50%  { transform: rotateY(0deg) rotateX(15deg); }
          75%  { transform: rotateY(-20deg) rotateX(8deg); }
        }

        /* Анимации подбрасывания — 1с */
        @keyframes flipToSide1 {
          0%   { transform: rotateY(0deg) rotateX(15deg) scale(1); }
          10%  { transform: rotateY(100deg) rotateX(5deg) scale(1.2); }
          25%  { transform: rotateY(250deg) rotateX(-2deg) scale(1.5); }
          40%  { transform: rotateY(420deg) rotateX(0deg) scale(1.75); }
          55%  { transform: rotateY(560deg) rotateX(0deg) scale(1.55); }
          70%  { transform: rotateY(660deg) rotateX(3deg) scale(1.25); }
          82%  { transform: rotateY(700deg) rotateX(6deg) scale(1.08); }
          92%  { transform: rotateY(716deg) rotateX(8deg) scale(0.98); }
          100% { transform: rotateY(720deg) rotateX(10deg) scale(1); }
        }
        @keyframes flipToSide2 {
          0%   { transform: rotateY(0deg) rotateX(15deg) scale(1); }
          10%  { transform: rotateY(120deg) rotateX(5deg) scale(1.2); }
          25%  { transform: rotateY(280deg) rotateX(-2deg) scale(1.5); }
          40%  { transform: rotateY(470deg) rotateX(0deg) scale(1.75); }
          55%  { transform: rotateY(640deg) rotateX(0deg) scale(1.55); }
          70%  { transform: rotateY(790deg) rotateX(3deg) scale(1.25); }
          82%  { transform: rotateY(860deg) rotateX(6deg) scale(1.08); }
          92%  { transform: rotateY(895deg) rotateX(8deg) scale(0.98); }
          100% { transform: rotateY(900deg) rotateX(10deg) scale(1); }
        }
        .coin-3d.flip-1 { animation: flipToSide1 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }
        .coin-3d.flip-2 { animation: flipToSide2 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }

        /* Тень */
        .coin-shadow {
          width: 70px; height: 8px; margin: 6px auto 0;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%);
        }
        .coin-shadow.flipping {
          animation: shadowAnim 1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }
        @keyframes shadowAnim {
          0%   { transform: scaleX(1); opacity: 0.5; }
          40%  { transform: scaleX(1.6); opacity: 0.15; }
          100% { transform: scaleX(1); opacity: 0.5; }
        }

        /* Кнопки выбора */
        .choice-btn {
          padding: 8px 12px;
          border-radius: 12px;
          border: 2px solid transparent;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          justify-content: center;
        }
        .choice-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.02); }
        .choice-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
        .choice-btn.c1 {
          background: linear-gradient(135deg, rgba(234,179,8,0.1), rgba(217,119,6,0.1));
          border-color: rgba(234,179,8,0.2);
          color: #fbbf24;
        }
        .choice-btn.c1.selected {
          background: linear-gradient(135deg, rgba(234,179,8,0.3), rgba(217,119,6,0.3));
          border-color: #f59e0b;
          box-shadow: 0 0 14px rgba(234,179,8,0.35);
        }
        .choice-btn.c2 {
          background: linear-gradient(135deg, rgba(148,163,184,0.1), rgba(100,116,139,0.1));
          border-color: rgba(148,163,184,0.2);
          color: #94a3b8;
        }
        .choice-btn.c2.selected {
          background: linear-gradient(135deg, rgba(148,163,184,0.3), rgba(100,116,139,0.3));
          border-color: #94a3b8;
          box-shadow: 0 0 14px rgba(148,163,184,0.35);
        }

        /* Быстрые кнопки ставки — pill */
        .bet-quick-btn {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: var(--muted-foreground);
        }
        .bet-quick-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          transform: scale(1.05);
        }
        .bet-quick-btn:active:not(:disabled) { transform: scale(0.95); }

        /* ===== ГОРИЗОНТАЛЬНАЯ ИСТОРИЯ ===== */
        .history-hscroll {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 4px 0;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .history-hscroll::-webkit-scrollbar { display: none; }

        .history-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          transition: transform 0.15s ease;
          cursor: default;
          border: 2px solid transparent;
        }
        .history-dot:hover { transform: scale(1.15); }
        .history-dot.win {
          background: rgba(16,185,129,0.15);
          border-color: rgba(16,185,129,0.4);
        }
        .history-dot.loss {
          background: rgba(239,68,68,0.12);
          border-color: rgba(239,68,68,0.35);
        }

        @keyframes dotPopIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .history-dot.new-entry {
          animation: dotPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>

      <div className="game-page max-w-md mx-auto" style={{ paddingBottom: '70px' }}>
        {/* Хедер — максимальный z-index */}
        <div className="coinflip-header-wrap">
          <GameHeader
            title="ОРЁЛ ИЛИ РЕШКА"
            icon="🪙"
            balance={totalBalance}
            currency={selectedCurrency?.symbol || 'USDT'}
            onCurrencyChange={handleCurrencyChange}
            onRefreshBalance={refreshBalance}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

          {/* Монета + результат */}
          <Card className="p-4 border" style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            overflow: 'visible',
          }}>
            <div className={`coin-scene ${
              isFlipping
                ? 'glow-flip'
                : showResult
                  ? (lastGame?.isWin ? 'glow-win' : 'glow-lose')
                  : 'glow-idle'
            }`}>
              <div
                key={flipKey}
                className={`coin-3d ${
                  isFlipping
                    ? `flip-${flipResult}`
                    : showResult
                      ? ''
                      : 'idle'
                }`}
                style={
                  !isFlipping && showResult && flipResult
                    ? { transform: `rotateY(${resultIsHeads ? '720' : '900'}deg) rotateX(10deg) scale(1)` }
                    : undefined
                }
              >
                {Array.from({ length: 8 }, (_, i) => {
                  const z = -4 + (8 * i / 7);
                  return (
                    <div key={`edge${i}`} className="coin-edge-ring"
                      style={{ transform: `translateZ(${z.toFixed(1)}px)` }} />
                  );
                })}
                <div className="coin-face coin-face--heads">
                  <span className="coin-icon">🦅</span>
                </div>
                <div className="coin-face coin-face--tails">
                  <span className="coin-icon">👑</span>
                </div>
              </div>
            </div>
            <div className={`coin-shadow ${isFlipping ? 'flipping' : ''}`} />

            {/* Результат — одна строка */}
            <div style={{
              maxHeight: showResult && lastGame ? '40px' : '0',
              opacity: showResult && lastGame ? 1 : 0,
              overflow: 'hidden',
              transition: 'all 0.4s ease',
              marginTop: showResult && lastGame ? '6px' : '0',
            }}>
              {lastGame && (
                <div className="text-center">
                  <span className={`text-sm font-black ${lastGame.isWin ? 'text-green-400' : 'text-red-400'}`}>
                    {lastGame.isWin ? `🎉 +${lastGame.winAmount.toFixed(2)}` : '💀 Проигрыш'}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* История — горизонтальный скролл, лаконичный */}
          <div style={{
            maxHeight: history.length > 0 ? '50px' : '0',
            opacity: history.length > 0 ? 1 : 0,
            overflow: 'hidden',
            transition: 'all 0.4s ease',
          }}>
            <div className="history-hscroll">
              {history.slice(0, 30).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`history-dot ${item.isWin ? 'win' : 'loss'} ${idx === 0 ? 'new-entry' : ''}`}
                  title={item.isWin ? `Победа +${item.winAmount.toFixed(2)}` : `Проигрыш -${item.betAmount.toFixed(2)}`}
                >
                  {item.result === 1 ? '🦅' : '👑'}
                </div>
              ))}
            </div>
          </div>

          {/* Управление */}
          <Card className="p-3 border" style={{
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: isFlipping ? 0.6 : 1,
            transition: 'opacity 0.3s',
          }}>
            {/* Выбор стороны */}
            <div className="flex gap-2 mb-3">
              <button
                className={`choice-btn c1 ${choice === 1 ? 'selected' : ''}`}
                onClick={() => setChoice(1)}
                disabled={isFlipping}
              >
                <span style={{ fontSize: '18px' }}>🦅</span>
                <span>Орёл</span>
              </button>
              <button
                className={`choice-btn c2 ${choice === 2 ? 'selected' : ''}`}
                onClick={() => setChoice(2)}
                disabled={isFlipping}
              >
                <span style={{ fontSize: '18px' }}>👑</span>
                <span>Решка</span>
              </button>
            </div>

            {/* Ставка */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="10"
                  className="w-full text-center font-bold"
                  style={{
                    color: colors.foreground,
                    border: '1.5px solid rgba(245,158,11,0.4)',
                    background: 'rgba(245,158,11,0.06)',
                    borderRadius: '10px',
                    padding: '6px 8px',
                    fontSize: '0.85rem',
                  }}
                  disabled={isFlipping}
                />
              </div>
              <div className="flex gap-1.5">
                {[0.5, 2, 'max'].map((mult) => (
                  <button
                    key={String(mult)}
                    onClick={() => {
                      if (mult === 'max') setBetAmount(totalBalance.toFixed(2));
                      else setBetAmount((parseFloat(betAmount || '0') * (mult as number)).toFixed(2));
                    }}
                    disabled={isFlipping}
                    className="bet-quick-btn"
                  >
                    {mult === 'max' ? 'MAX' : mult === 0.5 ? '÷2' : '×2'}
                  </button>
                ))}
              </div>
            </div>

            {/* Play */}
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold whitespace-nowrap" style={{ color: colors.mutedForeground }}>
                ×{MULTIPLIER} = <span style={{ color: '#34d399' }}>{potentialWin}</span>
              </div>
              <Button
                onClick={showResult ? () => { resetGame(); handlePlay(); } : handlePlay}
                disabled={!choice || loading || balanceLoading || isFlipping}
                className="flex-1 font-black py-2.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-sm"
                style={{
                  background: choice && !isFlipping
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)'
                    : 'rgba(100,116,139,0.3)',
                  color: choice && !isFlipping ? '#fff' : 'rgba(255,255,255,0.5)',
                  boxShadow: choice && !isFlipping ? '0 3px 12px rgba(245,158,11,0.4)' : 'none',
                  border: 'none',
                }}
              >
                {loading || isFlipping ? (
                  <><Loader className="animate-spin mr-1.5 inline" size={12} /> Бросок...</>
                ) : showResult ? '🔄 Ещё раз' : '🪙 Бросить'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {bigWinData && (
        <BigWinModal
          isOpen={isBigWinModalOpen}
          onClose={() => { setIsBigWinModalOpen(false); setBigWinData(null); }}
          winAmount={bigWinData.winAmount}
          multiplier={bigWinData.multiplier}
          gameType="coinflip"
        />
      )}
    </div>
  );
}
