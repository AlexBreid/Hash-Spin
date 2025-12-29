import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../../../context/ThemeContext';
import { GameHeader } from './GameHeader';
import './plinko.css';
import './games.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const ROWS = 16; // 16 рядов = 17 слотов
// Мультипликаторы: симметрично от края к центру и обратно
// Слоты: 0    1   2    3    4     5     6    7     8     9    10   11   12   13   14   15   16
const MULTS = [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110];

interface Pin {
  x: number;
  y: number;
}

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
  // Для детерминированной анимации
  animationProgress: number; // 0-1, прогресс анимации
  currentPinIndex: number; // Индекс текущего пина в траектории
  trajectory: Array<{ x: number; y: number; pinIndex?: number }>; // Предопределенная траектория
  startTime: number; // Время начала анимации
  duration: number; // Длительность анимации в мс
}

export default function PlinkoGame() {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const pinsRef = useRef<Pin[]>([]);
  const frameRef = useRef(0);

  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(1);
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState<{ m: number }[]>([]);
  const [profit, setProfit] = useState(0);

  // Размеры
  const W = 400;
  const H = 650;
  const PIN_R = 3; // Размер пина
  const BALL_R = 3; // Уменьшен размер шарика для лучшего прохождения между пинами
  const TOP_Y = 60;
  const BOT_Y = H - 100;
  const SIDE_PAD = 30;

  // Параметры детерминированной анимации
  const ANIMATION_DURATION = 2500; // Длительность анимации в мс (2.5 секунды)
  const BOUNCE_AMPLITUDE = 8; // Амплитуда отскока от пина
  const EASING_FUNCTION = (t: number) => {
    // Ease-out cubic для плавного падения
    return 1 - Math.pow(1 - t, 3);
  };

  const rowHeight = (BOT_Y - TOP_Y) / ROWS;

  // Создаём пины один раз - меньше пинов, больше расстояние
  useEffect(() => {
    const pins: Pin[] = [];
    const totalWidth = W - SIDE_PAD * 2;
    // Увеличиваем базовое расстояние между пинами
    const baseSpacing = totalWidth / (ROWS + 1);

    for (let row = 0; row < ROWS; row++) {
      // Для 8 рядов: количество пинов в ряду = row + 2 (начинаем с 2, добавляем по 1)
      const pinsInRow = row + 2;
      const rowWidth = (pinsInRow - 1) * baseSpacing;
      const startX = (W - rowWidth) / 2;
      const y = TOP_Y + row * rowHeight;

      for (let col = 0; col < pinsInRow; col++) {
        pins.push({
          x: startX + col * baseSpacing,
          y: y
        });
      }
    }
    pinsRef.current = pins;
  }, [rowHeight]);

  // X для финального слота
  const getSlotX = useCallback((slot: number) => {
    const totalWidth = W - SIDE_PAD * 2;
    const slotWidth = totalWidth / (ROWS + 1);
    return SIDE_PAD + slot * slotWidth + slotWidth / 2;
  }, []);

  // Генерация предопределенной траектории на основе directions
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
    
    // Начальная точка
    trajectory.push({ x: currentX, y: currentY });
    
    // Проходим по каждому ряду
    for (let row = 0; row < ROWS; row++) {
      const rowY = topY + row * rowH;
      const pinsInRow = row + 2;
      const totalWidth = width - sidePad * 2;
      const baseSpacing = totalWidth / (ROWS + 1);
      const rowWidth = (pinsInRow - 1) * baseSpacing;
      const startX = (width - rowWidth) / 2;
      
      // Определяем направление для этого ряда
      const direction = directions[row] || 0; // -1 влево, 1 вправо, 0 прямо
      
      // Находим ближайший пин в этом ряду
      let nearestPin: Pin | null = null;
      let nearestPinIndex = -1;
      let minDist = Infinity;
      
      pins.forEach((pin, idx) => {
        const pinRow = Math.floor((pin.y - topY) / rowH);
        if (pinRow === row) {
          const dist = Math.abs(pin.x - currentX);
          if (dist < minDist) {
            minDist = dist;
            nearestPin = pin;
            nearestPinIndex = idx;
          }
        }
      });
      
      if (nearestPin) {
        // Вычисляем целевую позицию после столкновения с пином
        // Смещаемся в направлении, указанном сервером
        const offsetX = direction * baseSpacing * 0.6; // Смещение после отскока
        const targetXAfterPin = nearestPin.x + offsetX;
        
        // Точка столкновения с пином (немного выше центра пина для красивого отскока)
        const hitY = nearestPin.y - pinR * 0.3;
        trajectory.push({ x: nearestPin.x, y: hitY, pinIndex: nearestPinIndex });
        
        // Точка после отскока (красивый отскок вверх и в сторону)
        const bounceY = hitY - bounceAmp;
        trajectory.push({ x: targetXAfterPin, y: bounceY });
        
        // Обновляем текущую позицию
        currentX = targetXAfterPin;
        currentY = bounceY;
      } else {
        // Если пин не найден, просто двигаемся в направлении
        const offsetX = direction * baseSpacing * 0.5;
        currentX += offsetX;
        trajectory.push({ x: currentX, y: rowY });
      }
    }
    
    // Финальная точка - целевой слот
    const slotY = botY + 25;
    trajectory.push({ x: targetX, y: slotY - BALL_R });
    
    return trajectory;
  };

  // Баланс
  const loadBalance = useCallback(async () => {
    if (!token) {
      console.warn('[PLINKO] loadBalance: No token');
      return;
    }
    try {
      console.log('[PLINKO] Загружаю баланс...');
      const r = await fetch(`${API}/api/v1/plinko/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!r.ok) {
        console.error(`[PLINKO] Баланс: HTTP ${r.status}`, r.statusText);
        return;
      }
      
      const d = await r.json();
      console.log('[PLINKO] Ответ баланса:', d);
      
      if (d.success && d.balance !== undefined) {
        setBalance(parseFloat(d.balance));
        console.log(`[PLINKO] Баланс установлен: ${d.balance}`);
      } else {
        console.error('[PLINKO] Неверный формат ответа:', d);
      }
    } catch (err) {
      console.error('[PLINKO] Ошибка загрузки баланса:', err);
    }
  }, [token]);

  // Бросок
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
      console.log('[PLINKO] Ответ от drop:', d);
      
      if (!d.success) {
        return toast.error(d.error || 'Ошибка при броске');
      }

      // Обновляем баланс из ответа
      if (d.newBalance !== undefined) {
        setBalance(parseFloat(d.newBalance));
        console.log(`[PLINKO] Баланс обновлён: ${d.newBalance}`);
      } else if (d.balance !== undefined) {
        setBalance(parseFloat(d.balance));
        console.log(`[PLINKO] Баланс обновлён (balance): ${d.balance}`);
      } else {
        // Если баланс не пришёл в ответе, перезагружаем его
        console.warn('[PLINKO] Баланс не пришёл в ответе, перезагружаю...');
        await loadBalance();
      }

      const targetX = getSlotX(d.ball.slot);
      
      // Логирование для отладки
      console.log(`🎯 [FRONTEND] Получены данные: slot=${d.ball.slot}, multiplier=${d.ball.multiplier}x, directions=[${d.ball.directions.join(',')}], targetX=${targetX}`);
      
      // Создаем предопределенную траекторию на основе directions
      const trajectory = generateTrajectory(d.ball.directions, targetX, pinsRef.current, W, TOP_Y, BOT_Y, rowHeight, SIDE_PAD, PIN_R, BOUNCE_AMPLITUDE);
      
      const ball: Ball = {
        id: Date.now() + Math.random(),
        x: W / 2, // Начинаем точно в центре
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
        duration: ANIMATION_DURATION
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

    // Полифилл для roundRect если не поддерживается
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

    const slotY = BOT_Y + 25;
    const slotHeight = 35;

    const render = () => {
      // Получаем цвета темы
      const isDark = theme === 'dark';
      const bgColor = isDark ? '#0A0F1E' : '#f8f9fa';
      const pinColor1 = isDark ? '#3B82F6' : '#1E3A8A';
      const pinColor2 = isDark ? '#1E3A8A' : '#0B1C3A';
      const textColor = isDark ? '#fafafa' : '#0d1117';

      // Фон
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // Пины
      pinsRef.current.forEach(pin => {
        const grad = ctx.createRadialGradient(pin.x - 2, pin.y - 2, 0, pin.x, pin.y, PIN_R);
        grad.addColorStop(0, pinColor1);
        grad.addColorStop(1, pinColor2);
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, PIN_R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        
        // Обводка пина
        ctx.strokeStyle = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(30, 58, 138, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Слоты
      const slotWidth = (W - SIDE_PAD * 2) / (ROWS + 1) - 2;

      MULTS.forEach((m, i) => {
        const x = getSlotX(i) - slotWidth / 2;

        let col: string;
        if (m >= 41) col = isDark ? '#EF4444' : '#dc2626'; // Красный для очень высоких (41, 110)
        else if (m >= 1) col = isDark ? '#F59E0B' : '#f39c12'; // Оранжевый для средних (1, 1.5, 3, 5, 10)
        else if (m >= 0.3) col = isDark ? '#FCD34D' : '#FBBF24'; // Желто-оранжевый для низких (0.3, 0.5)
        else col = isDark ? '#94A3B8' : '#636e72'; // Серый для очень низких

        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(x, slotY, slotWidth, slotHeight, 5);
        ctx.fill();

        ctx.fillStyle = textColor;
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Форматируем вывод: все значения показываем с 'x', кроме 110
        let displayText: string;
        if (m >= 100) {
          displayText = String(m); // 110 без 'x'
        } else {
          displayText = m + 'x'; // Все остальные с 'x' (включая 0.3x и 0.5x)
        }
        ctx.fillText(displayText, x + slotWidth / 2, slotY + slotHeight / 2);
      });

      // Детерминированная анимация шариков
      const toRemove: number[] = [];
      const currentTime = Date.now();

      ballsRef.current.forEach((ball, idx) => {
        if (ball.done) {
          toRemove.push(idx);
          return;
        }

        // Вычисляем прогресс анимации (0-1)
        const elapsed = currentTime - ball.startTime;
        ball.animationProgress = Math.min(1, elapsed / ball.duration);

        // Если анимация завершена
        if (ball.animationProgress >= 1) {
          ball.x = ball.targetX;
          ball.y = slotY - BALL_R;
          ball.done = true;

          const actualMultiplier = ball.multiplier;
          const p = ball.win - ball.bet;
          setProfit(pr => pr + p);
          setCount(c => Math.max(0, c - 1));
          setHistory(h => [{ m: actualMultiplier }, ...h].slice(0, 20));

          if (p > 0) {
            const multiplierText = actualMultiplier >= 100 ? String(actualMultiplier) : actualMultiplier + 'x';
            toast.success(`${multiplierText} → +${p.toFixed(2)}`);
          } else if (p < -0.01) {
            const multiplierText = actualMultiplier >= 100 ? String(actualMultiplier) : actualMultiplier + 'x';
            toast.error(`${multiplierText} → ${p.toFixed(2)}`);
          }
          return;
        }

        // Применяем easing функцию
        const easedProgress = EASING_FUNCTION(ball.animationProgress);

        // Интерполируем позицию по траектории
        if (ball.trajectory.length > 1) {
          // Находим сегмент траектории для текущего прогресса
          const totalSegments = ball.trajectory.length - 1;
          const segmentProgress = easedProgress * totalSegments;
          const segmentIndex = Math.floor(segmentProgress);
          const segmentT = segmentProgress - segmentIndex;

          if (segmentIndex < totalSegments) {
            const startPoint = ball.trajectory[segmentIndex];
            const endPoint = ball.trajectory[segmentIndex + 1];

            // Линейная интерполяция между точками
            ball.x = startPoint.x + (endPoint.x - startPoint.x) * segmentT;
            ball.y = startPoint.y + (endPoint.y - startPoint.y) * segmentT;

            // Если это точка столкновения с пином, добавляем эффект отскока
            if (endPoint.pinIndex !== undefined) {
              // Эффект отскока - красивое попадание и отскок
              if (segmentT < 0.5) {
                // Приближение к пину - небольшое ускорение
                const approachT = segmentT * 2; // 0-1
                const approachOffset = Math.sin(approachT * Math.PI * 0.5) * 2;
                ball.y -= approachOffset;
              } else {
                // Отскок от пина - красивый отскок вверх и в сторону
                const bounceT = (segmentT - 0.5) * 2; // 0-1
                const bounceOffset = Math.sin(bounceT * Math.PI) * BOUNCE_AMPLITUDE;
                ball.y -= bounceOffset;
              }
            }
          } else {
            // Последний сегмент - финальное движение к слоту
            const lastPoint = ball.trajectory[ball.trajectory.length - 1];
            ball.x = lastPoint.x;
            ball.y = lastPoint.y;
          }
        }

        // Рисуем тень
        ctx.beginPath();
        ctx.ellipse(ball.x + 2, ball.y + 5, BALL_R * 0.7, BALL_R * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)';
        ctx.fill();

        // Рисуем шарик с градиентом в стиле темы
        const ballGrad = ctx.createRadialGradient(
          ball.x - 2, ball.y - 2, 0,
          ball.x, ball.y, BALL_R
        );
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

        // Обводка шарика
        ctx.strokeStyle = isDark ? '#B45309' : '#92400E';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Блик на шарике
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
    <div className="plinko-page game-page">
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
          const multiplier = h.m;
          const displayText = multiplier >= 100 ? String(multiplier) : multiplier < 1 ? multiplier.toFixed(1) + 'x' : multiplier + 'x';
          return (
            <span key={i} className={multiplier >= 1 ? 'win' : 'lose'}>
              {displayText}
            </span>
          );
        })}
      </div>

      <div className="plinko-controls">
        <div className="plinko-input-row">
          <button onClick={() => setBet(b => Math.max(0.1, +(b / 2).toFixed(2)))}>½</button>
          <input
            type="number"
            value={bet}
            onChange={e => setBet(Math.max(0, +e.target.value))}
            step="0.1"
            min="0.1"
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
