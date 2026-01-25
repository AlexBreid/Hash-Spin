import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { useTheme } from '../../../context/ThemeContext';
import { GameHeader } from './GameHeader';
import './plinko.css';
import './games.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const ROWS = 16;
const MULTS = [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110];

interface Pin { x: number; y: number; }

interface Ball {
  id: number;
  x: number;
  y: number;
  targetSlot: number;
  multiplier: number;
  bet: number;
  win: number;
  done: boolean;
  directions: number[];
  currentRow: number;
  targetX: number;
  animationProgress: number;
  currentPinIndex: number;
  trajectory: Array<{ x: number; y: number; pinIndex?: number }>;
  startTime: number;
  duration: number;
  finalBalance: number | null; // Баланс для обновления после падения
}

export default function PlinkoGame() {
  const { token, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pinsRef = useRef<Pin[]>([]);
  const frameRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(1);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<{ m: number }[]>([]);
  const [profit, setProfit] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  
  // Анимация слотов при попадании шарика (используем ref для доступа в requestAnimationFrame)
  const slotAnimationsRef = useRef<Record<number, number>>({});

  const W = 850;
  const H = 900;
  const PIN_R = 5;
  const BALL_R = 6.5; // Увеличен размер шарика
  const TOP_Y = 100;
  const BOT_Y = H - 140;
  const SIDE_PAD = 60;

  const ANIMATION_DURATION = 3000; // Быстрее для динамичности
  const BOUNCE_AMPLITUDE = 6;
  // Реалистичное ускорение под действием гравитации (ease-in с квадратичным ускорением)
  const EASING_FUNCTION = (t: number) => {
    // Квадратичное ускорение - шарик быстро разгоняется под действием гравитации
    return t * t * (2.5 - 1.5 * t); // Быстрое ускорение, затем плавное замедление
  };

  const rowHeight = (BOT_Y - TOP_Y) / ROWS;

  // ✅ Обработка фокуса на input
  const handleInputFocus = useCallback(() => {
    setKeyboardOpen(true);
    
    // Скроллим к контролам после появления клавиатуры
    setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }
    }, 150);
  }, []);

  const handleInputBlur = useCallback(() => {
    // Задержка для плавного закрытия клавиатуры
    setTimeout(() => {
      setKeyboardOpen(false);
    }, 300); // Даём время клавиатуре закрыться перед изменением классов
  }, []);

  // ✅ Обработка Enter - закрываем клавиатуру
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }, []);

  // Создаём пины
  useEffect(() => {
    const pins: Pin[] = [];
    const totalWidth = W - SIDE_PAD * 2;
    const baseSpacing = totalWidth / (ROWS + 1);

    for (let row = 0; row < ROWS; row++) {
      const pinsInRow = row + 2;
      const rowWidth = (pinsInRow - 1) * baseSpacing;
      const startX = (W - rowWidth) / 2;
      const y = TOP_Y + row * rowHeight;

      for (let col = 0; col < pinsInRow; col++) {
        pins.push({ x: startX + col * baseSpacing, y: y });
      }
    }
    pinsRef.current = pins;
  }, [rowHeight]);

  const getSlotX = useCallback((slot: number) => {
    const totalWidth = W - SIDE_PAD * 2;
    const slotWidth = totalWidth / (ROWS + 1);
    return SIDE_PAD + slot * slotWidth + slotWidth / 2;
  }, []);

  const generateTrajectory = (
    directions: number[], 
    targetX: number, 
    pins: Pin[],
    width: number,
    topY: number,
    botY: number,
    rowH: number,
    sidePad: number,
    pinR: number,
    bounceAmp: number
  ): Array<{ x: number; y: number; pinIndex?: number }> => {
    const trajectory: Array<{ x: number; y: number; pinIndex?: number }> = [];
    let currentX = width / 2;
    let currentY = topY - 20;
    
    trajectory.push({ x: currentX, y: currentY });
    
    for (let row = 0; row < ROWS; row++) {
      const rowY = topY + row * rowH;
      const pinsInRow = row + 2;
      const totalWidth = width - sidePad * 2;
      const baseSpacing = totalWidth / (ROWS + 1);
      const rowWidth = (pinsInRow - 1) * baseSpacing;
      const startX = (width - rowWidth) / 2;
      
      const direction = directions[row] || 0;
      
      let nearestPin: Pin | null = null;
      let nearestPinIndex = -1;
      let minDist = Infinity;
      
      for (let idx = 0; idx < pins.length; idx++) {
        const pin = pins[idx];
        const pinRow = Math.floor((pin.y - topY) / rowH);
        if (pinRow === row) {
          const dist = Math.abs(pin.x - currentX);
          if (dist < minDist) {
            minDist = dist;
            nearestPin = pin;
            nearestPinIndex = idx;
          }
        }
      }
      
      if (nearestPin) {
        // Шарик проходит между пинами, не касаясь их напрямую
        const pinGap = baseSpacing * 0.4; // Расстояние между пинами
        const offsetX = direction * pinGap;
        
        // Точка ПЕРЕД пином (шарик движется к пину, но не касается)
        const beforePinX = nearestPin.x - (direction > 0 ? pinGap * 0.3 : -pinGap * 0.3);
        const beforePinY = nearestPin.y - pinR - BALL_R - 2; // Над пином с запасом
        
        // Точка ПОСЛЕ пина (шарик отскакивает в сторону)
        const afterPinX = nearestPin.x + offsetX;
        const afterPinY = nearestPin.y + pinR + BALL_R + 2; // Под пином
        
        // Промежуточная точка для плавного перехода
        const midX = (beforePinX + afterPinX) / 2;
        const midY = (beforePinY + afterPinY) / 2 - bounceAmp * 0.5; // Легкий отскок
        
        trajectory.push({ x: beforePinX, y: beforePinY });
        trajectory.push({ x: midX, y: midY, pinIndex: nearestPinIndex });
        trajectory.push({ x: afterPinX, y: afterPinY });
        
        currentX = afterPinX;
        currentY = afterPinY;
      } else {
        // Плавное движение между рядами без пинов
        const offsetX = direction * baseSpacing * 0.45;
        currentX += offsetX;
        trajectory.push({ x: currentX, y: rowY });
      }
    }
    
    const slotY = botY + 35;
    trajectory.push({ x: targetX, y: slotY - BALL_R });
    
    return trajectory;
  };

  const loadBalance = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/api/v1/plinko/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) return;
      const d = await r.json();
      if (d.success && d.balance !== undefined) {
        setBalance(parseFloat(d.balance));
      }
    } catch (err) {
      console.error('[PLINKO] Ошибка загрузки баланса:', err);
    }
  }, [token]);

  const drop = async () => {
    if (bet > balance) return toast.error('Недостаточно средств');
    if (bet < 0.1) return toast.error('Мин. ставка 0.1');

    try {
      const r = await fetch(`${API}/api/v1/plinko/drop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet })
      });
      
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        return toast.error(errorData.error || `Ошибка: ${r.status}`);
      }
      
      const d = await r.json();
      
      if (!d.success) {
        return toast.error(d.error || 'Ошибка при броске');
      }

      // Сразу вычитаем ставку из баланса (показываем что деньги списались)
      setBalance(prev => prev - bet);

      const targetX = getSlotX(d.ball.slot);
      const trajectory = generateTrajectory(d.ball.directions, targetX, pinsRef.current, W, TOP_Y, BOT_Y, rowHeight, SIDE_PAD, PIN_R, BOUNCE_AMPLITUDE);
      
      // Сохраняем новый баланс для обновления после падения шарика
      const finalBalance = d.newBalance !== undefined 
        ? parseFloat(d.newBalance) 
        : d.balance !== undefined 
          ? parseFloat(d.balance) 
          : null;
      
      const ball: Ball = {
        id: Date.now() + Math.random(),
        x: W / 2,
        y: TOP_Y - 20,
        targetSlot: d.ball.slot,
        multiplier: d.ball.multiplier,
        bet: bet,
        win: parseFloat(d.ball.winAmount),
        done: false,
        directions: d.ball.directions,
        currentRow: -1,
        targetX: targetX,
        animationProgress: 0,
        currentPinIndex: 0,
        trajectory: trajectory,
        startTime: Date.now(),
        duration: ANIMATION_DURATION,
        finalBalance: finalBalance // Сохраняем баланс для обновления после падения
      };

      ballsRef.current.push(ball);
      setCount(c => c + 1);
    } catch {
      toast.error('Ошибка сети');
    }
  };

  // Анимация
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    if (!ctx.roundRect) {
      (ctx as any).roundRect = function(x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
      };
    }

    const slotY = BOT_Y + 35;
    const slotHeight = 50;

    const render = () => {
      const currentTime = Date.now(); // ✅ Обновляем время на каждом кадре
      const isDark = theme === 'dark';
      const bgColor = isDark ? '#0A0F1E' : '#f8f9fa';
      const pinColor1 = isDark ? '#3B82F6' : '#1E3A8A';
      const pinColor2 = isDark ? '#1E3A8A' : '#0B1C3A';
      const textColor = isDark ? '#fafafa' : '#0d1117';

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      pinsRef.current.forEach(pin => {
        const grad = ctx.createRadialGradient(pin.x - 2, pin.y - 2, 0, pin.x, pin.y, PIN_R);
        grad.addColorStop(0, pinColor1);
        grad.addColorStop(1, pinColor2);
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, PIN_R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 58, 138, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const slotWidth = (W - SIDE_PAD * 2) / (ROWS + 1) - 2;

      MULTS.forEach((m, i) => {
        const x = getSlotX(i) - slotWidth / 2;
        let col: string;
        if (m >= 41) col = isDark ? '#EF4444' : '#dc2626';
        else if (m >= 1) col = isDark ? '#F59E0B' : '#f39c12';
        else if (m >= 0.3) col = isDark ? '#FCD34D' : '#FBBF24';
        else col = isDark ? '#94A3B8' : '#636e72';

        // Анимация подпрыгивания слота
        let bounceY = 0;
        let scale = 1;
        const animationStartTime = slotAnimationsRef.current[i];
        if (animationStartTime) {
          const elapsed = currentTime - animationStartTime;
          if (elapsed < 600) { // Анимация 600мс
            const progress = elapsed / 600;
            // Эффект подпрыгивания: сначала вверх, потом вниз с затуханием
            const bounce = Math.sin(progress * Math.PI) * (1 - progress) * 12; // Подъём до 12px
            bounceY = -bounce;
            // Легкое увеличение при подпрыгивании
            scale = 1 + Math.sin(progress * Math.PI) * 0.15 * (1 - progress);
          } else {
            // Убираем завершённую анимацию
            delete slotAnimationsRef.current[i];
          }
        }

        ctx.save();
        // Применяем трансформацию для анимации
        ctx.translate(x + slotWidth / 2, slotY + slotHeight / 2 + bounceY);
        ctx.scale(scale, scale);
        ctx.translate(-(x + slotWidth / 2), -(slotY + slotHeight / 2));

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(x, slotY, slotWidth, slotHeight, 5);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayText = m >= 100 ? String(m) : m + 'x';
        ctx.fillText(displayText, x + slotWidth / 2, slotY + slotHeight / 2);
        
        ctx.restore();
      });

      const toRemove: number[] = [];

      ballsRef.current.forEach((ball, idx) => {
        if (ball.done) {
          toRemove.push(idx);
          return;
        }

        const elapsed = currentTime - ball.startTime;
        ball.animationProgress = Math.min(1, elapsed / ball.duration);

        if (ball.animationProgress >= 1) {
          ball.x = ball.targetX;
          ball.y = slotY - BALL_R;
          ball.done = true;

          // 🎯 Запускаем анимацию слота при попадании шарика
          const targetSlot = ball.targetSlot;
          if (targetSlot !== undefined && targetSlot >= 0 && targetSlot < MULTS.length) {
            // Сохраняем время начала анимации в ref (доступно сразу в requestAnimationFrame)
            slotAnimationsRef.current[targetSlot] = currentTime;
          }

          // ✅ Обновляем баланс ПОСЛЕ падения шарика (добавляем выигрыш)
          if (ball.finalBalance !== null) {
            setBalance(ball.finalBalance);
          } else {
            // Если нет finalBalance, добавляем выигрыш к текущему балансу
            setBalance(prev => prev + ball.win);
          }

          const p = ball.win - ball.bet;
          setProfit(pr => pr + p);
          setCount(c => Math.max(0, c - 1));
          setHistory(h => [{ m: ball.multiplier }, ...h].slice(0, 20));

          if (p > 0) {
            const mt = ball.multiplier >= 100 ? String(ball.multiplier) : ball.multiplier + 'x';
            toast.success(`${mt} → +${p.toFixed(2)}`);
          } else if (p < -0.01) {
            const mt = ball.multiplier >= 100 ? String(ball.multiplier) : ball.multiplier + 'x';
            toast.error(`${mt} → ${p.toFixed(2)}`);
          }
          return;
        }

        if (ball.trajectory.length > 1) {
          let totalLength = 0;
          const segmentLengths: number[] = [];
          for (let i = 0; i < ball.trajectory.length - 1; i++) {
            const dx = ball.trajectory[i + 1].x - ball.trajectory[i].x;
            const dy = ball.trajectory[i + 1].y - ball.trajectory[i].y;
            segmentLengths.push(Math.sqrt(dx * dx + dy * dy));
            totalLength += segmentLengths[i];
          }

          const easedProgress = EASING_FUNCTION(ball.animationProgress);
          const targetDistance = easedProgress * totalLength;

          let accumulatedLength = 0;
          let segmentIndex = 0;
          let segmentT = 0;

          for (let i = 0; i < segmentLengths.length; i++) {
            if (accumulatedLength + segmentLengths[i] >= targetDistance) {
              segmentIndex = i;
              segmentT = (targetDistance - accumulatedLength) / segmentLengths[i];
              break;
            }
            accumulatedLength += segmentLengths[i];
          }

          if (segmentIndex < ball.trajectory.length - 1) {
            const startPoint = ball.trajectory[segmentIndex];
            const endPoint = ball.trajectory[segmentIndex + 1];
            
            // Динамичная интерполяция - быстро вниз (гравитация), естественно на поворотах
            const isDownward = endPoint.y > startPoint.y;
            let smoothT: number;
            
            if (isDownward) {
              // Вниз - быстрое ускорение под действием гравитации
              smoothT = segmentT * segmentT * (2 - segmentT); // Ускорение с естественным замедлением
            } else {
              // На поворотах - более плавное движение
              smoothT = segmentT * (1.5 - segmentT * 0.5); // Линейное с легким ускорением
            }
            
            // Ограничиваем значение до [0, 1]
            smoothT = Math.max(0, Math.min(1, smoothT));
            
            ball.x = startPoint.x + (endPoint.x - startPoint.x) * smoothT;
            ball.y = startPoint.y + (endPoint.y - startPoint.y) * smoothT;

            // Плавный эффект отскока при прохождении мимо пина
            if (endPoint.pinIndex !== undefined) {
              // Синусоидальный отскок с затуханием
              const bounceProgress = Math.sin(segmentT * Math.PI);
              const bounceAmount = bounceProgress * BOUNCE_AMPLITUDE * (1 - segmentT * 0.3); // Затухание
              ball.y -= bounceAmount;
            }
          } else {
            const lastPoint = ball.trajectory[ball.trajectory.length - 1];
            ball.x = lastPoint.x;
            ball.y = lastPoint.y;
          }
        }

        // Тень
        ctx.beginPath();
        ctx.ellipse(ball.x + 2, ball.y + 5, BALL_R * 0.7, BALL_R * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)';
        ctx.fill();

        // Шарик
        const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, BALL_R);
        if (isDark) {
          ballGrad.addColorStop(0, '#F59E0B');
          ballGrad.addColorStop(0.5, '#F59E0B');
          ballGrad.addColorStop(1, '#D97706');
        } else {
          ballGrad.addColorStop(0, '#FCD34D');
          ballGrad.addColorStop(0.5, '#F59E0B');
          ballGrad.addColorStop(1, '#D97706');
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.fill();
        ctx.strokeStyle = isDark ? '#B45309' : '#92400E';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Блик
        ctx.beginPath();
        ctx.arc(ball.x - 2.5, ball.y - 2.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      });

      toRemove.reverse().forEach(i => ballsRef.current.splice(i, 1));
      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameRef.current);
  }, [getSlotX, theme]);

  useEffect(() => {
    if (token) loadBalance();
  }, [token, loadBalance]);

  if (!isAuthenticated) {
    return (
      <div className="plinko-page">
        <div className="plinko-login">
          <span>🔒</span>
          <p>Войдите для игры</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={pageRef}
      className={`plinko-page game-page ${keyboardOpen ? 'keyboard-open' : ''}`}
    >
      <GameHeader 
        title="PLINKO" 
        balance={balance}
        icon="🎯"
      />

      <div className="plinko-board">
        <canvas ref={canvasRef} width={W} height={H} />
        {count > 0 && <div className="plinko-balls">{count}</div>}
      </div>

      <div className="plinko-history">
        {history.map((h, i) => {
          const m = h.m;
          const displayText = m >= 100 ? String(m) : m < 1 ? m.toFixed(1) + 'x' : m + 'x';
          return (
            <span key={i} className={m >= 1 ? 'win' : 'lose'}>
              {displayText}
            </span>
          );
        })}
      </div>

      <div ref={controlsRef} className="plinko-controls">
        <div className="plinko-input-row">
          <button onClick={() => setBet(b => Math.max(0.1, +(b / 2).toFixed(2)))}>½</button>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={bet}
            onChange={e => setBet(Math.max(0, +e.target.value))}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            step="0.1"
            className="game-input"
          />
          <button onClick={() => setBet(b => Math.min(balance, +(b * 2).toFixed(2)))}>2×</button>
        </div>

        <div className="plinko-quick-btns">
          <button onClick={() => setBet(0.1)}>MIN</button>
          <button onClick={() => setBet(1)}>1</button>
          <button onClick={() => setBet(5)}>5</button>
          <button onClick={() => setBet(10)}>10</button>
          <button onClick={() => setBet(Math.min(1000, balance))}>MAX</button>
        </div>

        <button
          className="plinko-play-btn game-button"
          onClick={drop}
          disabled={bet > balance || bet < 0.1}
        >
          БРОСИТЬ ({bet.toFixed(2)})
        </button>

        <div className={`plinko-stat game-stat ${profit >= 0 ? 'positive' : 'negative'}`}>
          {profit >= 0 ? '+' : ''}{profit.toFixed(2)} USDT
        </div>
      </div>
    </div>
  );
}