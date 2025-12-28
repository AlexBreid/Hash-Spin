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
  vx: number;
  vy: number;
  targetSlot: number;
  multiplier: number;
  bet: number;
  win: number;
  done: boolean;
  lastHitPin: number;
  lastHitTime: number;
  directions: number[];
  dirIndex: number;
  currentRow: number;
  targetX: number;
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

  // Физика - естественное падение с гравитацией
  const GRAVITY = 0.25; // Увеличена гравитация для более естественного падения
  const BOUNCE = 0.6; // Отскок от пинов (немного уменьшен для реалистичности)
  const FRICTION = 0.99; // Увеличено трение воздуха для замедления
  const MIN_VELOCITY = 0.05;
  const MAX_SPEED = 2.5; // Уменьшена максимальная скорость
  const MIN_DOWN_VELOCITY = 0.2; // Минимальная скорость вниз

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
      
      const ball: Ball = {
        id: Date.now() + Math.random(),
        x: W / 2, // Начинаем точно в центре
        y: TOP_Y - 20,
        vx: 0, // Начинаем без горизонтальной скорости
        vy: 0.3, // Медленная начальная скорость вниз для красивого падения
        targetSlot: d.ball.slot,
        multiplier: d.ball.multiplier,
        bet: bet,
        win: parseFloat(d.ball.winAmount),
        done: false,
        lastHitPin: -1,
        lastHitTime: 0,
        directions: d.ball.directions,
        dirIndex: 0,
        currentRow: -1,
        targetX: targetX
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

      // Физика шариков
      const toRemove: number[] = [];

      ballsRef.current.forEach((ball, idx) => {
        if (ball.done) {
          toRemove.push(idx);
          return;
        }

        // Определяем текущий ряд шарика
        const ballCurrentRow = Math.floor((ball.y - TOP_Y) / rowHeight);
        if (ballCurrentRow !== ball.currentRow && ballCurrentRow >= 0 && ballCurrentRow < ROWS) {
          ball.currentRow = ballCurrentRow;
          
          // При переходе в новый ряд применяем направление с сервера
          if (ballCurrentRow >= 0 && ballCurrentRow < ball.directions.length) {
            const dir = ball.directions[ballCurrentRow];
            // Сильное влияние направления - это определяет путь шарика
            // Применяем направление более агрессивно при переходе в новый ряд
            ball.vx += dir * 2.5;
            
            // Логирование для отладки
            if (ballCurrentRow % 4 === 0) { // Логируем каждые 4 ряда
              console.log(`🎯 [ROW ${ballCurrentRow}] dir=${dir}, vx=${ball.vx.toFixed(2)}, targetSlot=${ball.targetSlot}`);
            }
          }
        }

        // Гравитация - основная сила, тянет шарик вниз
        ball.vy += GRAVITY;
        
        // Ограничиваем максимальную скорость вниз для реалистичности
        if (ball.vy > MAX_SPEED * 0.7) {
          ball.vy = MAX_SPEED * 0.7;
        }

        // Трение воздуха (только горизонтальное)
        ball.vx *= FRICTION;
        
        // Постоянное притяжение к целевому слоту на основе направлений
        if (ball.currentRow >= 0 && ball.currentRow < ball.directions.length) {
          const dir = ball.directions[ball.currentRow];
          // Притяжение в нужную сторону на основе направления
          const desiredVx = dir * 1.8;
          ball.vx += (desiredVx - ball.vx) * 0.08;
        }
        
        // Дополнительное притяжение к целевому слоту (усиливается ближе к финишу)
        const distanceToFinish = slotY - ball.y;
        if (distanceToFinish < 150 && distanceToFinish > 0) {
          const progress = 1 - (distanceToFinish / 150);
          const guidanceForce = 0.15 * progress * progress;
          const dxToTarget = ball.targetX - ball.x;
          ball.vx += dxToTarget * guidanceForce * 0.12;
        }

        // Сохраняем старую позицию для непрерывного обнаружения коллизий
        const oldX = ball.x;
        const oldY = ball.y;

        // Вычисляем границы треугольника пинов для текущего ряда
        const rowForTriangle = Math.floor((ball.y - TOP_Y) / rowHeight);
        let triangleMinXBefore = SIDE_PAD + BALL_R;
        let triangleMaxXBefore = W - SIDE_PAD - BALL_R;
        
        if (rowForTriangle >= 0 && rowForTriangle < ROWS) {
          // Находим первый и последний пин в текущем ряду
          const pinsInRow = rowForTriangle + 2;
          const totalWidth = W - SIDE_PAD * 2;
          const baseSpacing = totalWidth / (ROWS + 1);
          const rowWidth = (pinsInRow - 1) * baseSpacing;
          const startX = (W - rowWidth) / 2;
          
          // Границы треугольника: от первого пина до последнего
          triangleMinXBefore = startX - BALL_R - PIN_R;
          triangleMaxXBefore = startX + rowWidth + BALL_R + PIN_R;
        }
        
        // Ограничиваем шарик границами треугольника пинов
        if (ball.x < triangleMinXBefore) {
          ball.x = triangleMinXBefore;
          ball.vx = Math.max(0, ball.vx);
        }
        if (ball.x > triangleMaxXBefore) {
          ball.x = triangleMaxXBefore;
          ball.vx = Math.min(0, ball.vx);
        }

        // Движение
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Ограничиваем скорость для предотвращения проскакивания через пины
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > MAX_SPEED) {
          const scale = MAX_SPEED / speed;
          ball.vx *= scale;
          ball.vy *= scale;
        }

        // Непрерывное обнаружение коллизий - проверяем путь движения
        const currentTime = Date.now();
        const collisions: Array<{ pin: Pin; pinIdx: number; dist: number; nx: number; ny: number }> = [];
        
        pinsRef.current.forEach((pin, pinIdx) => {
          // Проверяем расстояние от старой позиции до пина
          const oldDx = oldX - pin.x;
          const oldDy = oldY - pin.y;
          const oldDist = Math.sqrt(oldDx * oldDx + oldDy * oldDy);
          
          // Проверяем расстояние от новой позиции до пина
          const newDx = ball.x - pin.x;
          const newDy = ball.y - pin.y;
          const newDist = Math.sqrt(newDx * newDx + newDy * newDy);
          
          const minDist = BALL_R + PIN_R;
          
          // Проверяем коллизию: либо шарик уже внутри пина, либо пересек границу
          if (newDist < minDist || (oldDist >= minDist && newDist < minDist)) {
            // Вычисляем точку пересечения на пути движения
            const dx = newDx;
            const dy = newDy;
            const dist = newDist || 0.001;
            
            // Нормаль столкновения
            const nx = dx / dist;
            const ny = dy / dist;
            
            collisions.push({ pin, pinIdx, dist, nx, ny });
          }
        });

        // Обрабатываем все коллизии
        if (collisions.length > 0) {
          // Сортируем по расстоянию (ближайшие первыми)
          collisions.sort((a, b) => a.dist - b.dist);
          
          // Обрабатываем каждую коллизию
          collisions.forEach(({ pin, pinIdx, dist, nx, ny }) => {
            const minDist = BALL_R + PIN_R;
            
            // Выталкиваем шарик из пина
            if (dist < minDist) {
              ball.x = pin.x + nx * minDist;
              ball.y = pin.y + ny * minDist;
            }

            // Отскок только если новый пин или прошло достаточно времени
            const timeSinceLastHit = currentTime - ball.lastHitTime;
            if (ball.lastHitPin !== pinIdx || timeSinceLastHit > 30) {
              ball.lastHitPin = pinIdx;
              ball.lastHitTime = currentTime;

              // Скорость вдоль нормали
              const velAlongNormal = ball.vx * nx + ball.vy * ny;

              // Всегда отражаем при столкновении
              if (velAlongNormal < 0 || Math.abs(velAlongNormal) < 0.2) {
                // Отражаем скорость
                const reflectedVx = ball.vx - 2 * velAlongNormal * nx;
                const reflectedVy = ball.vy - 2 * velAlongNormal * ny;
                
                ball.vx = reflectedVx * BOUNCE;
                ball.vy = Math.max(reflectedVy * BOUNCE, MIN_DOWN_VELOCITY);

                // Применяем направление с сервера для этого ряда - сильное влияние
                if (ball.currentRow >= 0 && ball.currentRow < ball.directions.length) {
                  const dir = ball.directions[ball.currentRow];
                  // Применяем направление с сервера - это определяет куда шарик отскочит
                  // Используем сильное влияние для гарантированного попадания в целевой слот
                  ball.vx += dir * 2.0;
                  
                  // Ограничиваем горизонтальную скорость после применения направления
                  if (Math.abs(ball.vx) > MAX_SPEED * 0.7) {
                    ball.vx = Math.sign(ball.vx) * MAX_SPEED * 0.7;
                  }
                }

                // Гарантируем минимальную скорость вниз для продолжения падения
                if (ball.vy < MIN_DOWN_VELOCITY) {
                  ball.vy = MIN_DOWN_VELOCITY;
                }
                
                // Если шарик движется вверх, принудительно направляем вниз
                if (ball.vy <= 0) {
                  ball.vy = MIN_DOWN_VELOCITY;
                }
                
                // Ограничиваем максимальную скорость
                const newSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                if (newSpeed > MAX_SPEED) {
                  const scale = MAX_SPEED / newSpeed;
                  ball.vx *= scale;
                  ball.vy *= scale;
                }
              }
            }
          });
        }

        // Дополнительная проверка: если шарик все еще внутри пина, принудительно выталкиваем
        pinsRef.current.forEach((pin) => {
          const dx = ball.x - pin.x;
          const dy = ball.y - pin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = BALL_R + PIN_R;
          
          if (dist < minDist && dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            // Жестко выталкиваем шарик из пина с зазором
            const safeDist = minDist + 0.3;
            ball.x = pin.x + nx * safeDist;
            ball.y = pin.y + ny * safeDist;
            
            const overlap = minDist - dist;
            // Принудительно выталкиваем с силой
            ball.vx += nx * overlap * 3;
            ball.vy += ny * overlap * 3;
            
            // Ограничиваем скорость после выталкивания
            const pushSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            if (pushSpeed > MAX_SPEED) {
              const scale = MAX_SPEED / pushSpeed;
              ball.vx *= scale;
              ball.vy *= scale;
            }
            
            // Если шарик застрял на пине, принудительно даем ему скорость
            if (Math.abs(ball.vx) < 0.2 && ball.vy < 0.2) {
              // Применяем направление с сервера
              if (ball.currentRow >= 0 && ball.currentRow < ball.directions.length) {
                const dir = ball.directions[ball.currentRow];
                ball.vx = dir * 1.0;
              } else {
                ball.vx = (Math.random() - 0.5) * 0.8;
              }
              ball.vy = MIN_DOWN_VELOCITY;
            }
          }
        });

        // Если шарик застрял (не двигается), принудительно двигаем его
        if (Math.abs(ball.vx) < MIN_VELOCITY && ball.vy < 0.4) {
          // Направляем к целевому слоту
          const dxToTarget = ball.targetX - ball.x;
          if (Math.abs(dxToTarget) > 5) {
            ball.vx = dxToTarget * 0.12;
          } else {
            // Если близко к цели, даем случайное направление
            ball.vx = (Math.random() - 0.5) * 1.2;
          }
          ball.vy = MIN_DOWN_VELOCITY * 1.3;
        }
        
        // Гарантируем, что шарик всегда падает вниз
        if (ball.vy <= 0) {
          ball.vy = MIN_DOWN_VELOCITY;
        }
        
        // Дополнительная проверка: если шарик не двигается вертикально, принудительно двигаем
        if (ball.vy < 0.15 && ball.y < slotY - 50) {
          ball.vy = MIN_DOWN_VELOCITY;
        }

        // Жесткие границы треугольника пинов - шарик не должен вылетать за пределы треугольника
        const rowForBounds = Math.floor((ball.y - TOP_Y) / rowHeight);
        let triangleMinXAfter = SIDE_PAD + BALL_R;
        let triangleMaxXAfter = W - SIDE_PAD - BALL_R;
        
        if (rowForBounds >= 0 && rowForBounds < ROWS) {
          const pinsInRow = rowForBounds + 2;
          const totalWidth = W - SIDE_PAD * 2;
          const baseSpacing = totalWidth / (ROWS + 1);
          const rowWidth = (pinsInRow - 1) * baseSpacing;
          const startX = (W - rowWidth) / 2;
          
          // Границы треугольника: от первого пина до последнего с запасом
          triangleMinXAfter = startX - BALL_R - PIN_R - 2;
          triangleMaxXAfter = startX + rowWidth + BALL_R + PIN_R + 2;
        }
        
        // Жесткая коррекция границ треугольника
        if (ball.x < triangleMinXAfter) {
          ball.x = triangleMinXAfter;
          ball.vx = Math.max(0, ball.vx);
        }
        if (ball.x > triangleMaxXAfter) {
          ball.x = triangleMaxXAfter;
          ball.vx = Math.min(0, ball.vx);
        }
        
        // Защита от вылета по Y
        if (ball.y < TOP_Y - 50) {
          ball.y = TOP_Y - 30;
          ball.vy = 0.5;
        }
        if (ball.y > H - 20) {
          ball.y = slotY - BALL_R;
          ball.vy = 0;
        }
        
        // Предотвращение застревания - если шарик не двигается, принудительно двигаем
        if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1 && ball.y < slotY - 20) {
          ball.vy = MIN_DOWN_VELOCITY;
          if (ball.currentRow >= 0 && ball.currentRow < ball.directions.length) {
            const dir = ball.directions[ball.currentRow];
            ball.vx = dir * 1.5;
          }
        }

        // Финиш - гарантированное попадание в целевой слот
        if (ball.y >= slotY - BALL_R - 10) {
          const targetSlotX = getSlotX(ball.targetSlot);
          
          // Плавное притяжение к целевому слоту ближе к финишу
          if (ball.y >= slotY - BALL_R - 8) {
            const progress = 1 - Math.max(0, (slotY - BALL_R - ball.y) / 8);
            const pullStrength = 0.2 * progress; // Усиливается ближе к финишу
            ball.x += (targetSlotX - ball.x) * pullStrength;
            ball.vx *= 0.85; // Замедление
          }
          
          // Когда шарик достиг финиша, точно устанавливаем позицию в целевой слот
          if (ball.y >= slotY - BALL_R) {
            // Определяем в какой слот попал шарик визуально (для отладки)
            const slotWidth = (W - SIDE_PAD * 2) / (ROWS + 1);
            const relativeX = ball.x - SIDE_PAD;
            const visualSlot = Math.round(relativeX / slotWidth);
            const visualMultiplier = MULTS[Math.max(0, Math.min(ROWS, visualSlot))];
            
            // Логирование для отладки
            console.log(`🎯 [FRONTEND FINISH] targetSlot=${ball.targetSlot}, targetMultiplier=${ball.multiplier}x, visualSlot=${visualSlot}, visualMultiplier=${visualMultiplier}x, targetX=${targetSlotX}, actualX=${ball.x}`);
            
            // Точное попадание в целевой слот (который указал бэкенд)
            ball.x = targetSlotX;
            ball.y = slotY - BALL_R;
            ball.done = true;

            // Используем мультипликатор из бэкенда - он соответствует targetSlot
            const actualMultiplier = ball.multiplier;
            const p = ball.win - ball.bet;
            setProfit(pr => pr + p);
            setCount(c => Math.max(0, c - 1));
            setHistory(h => [{ m: actualMultiplier }, ...h].slice(0, 20));

            // Показываем уведомление только если есть выигрыш или значительный проигрыш
            if (p > 0) {
              const multiplierText = actualMultiplier >= 100 ? String(actualMultiplier) : actualMultiplier + 'x';
              toast.success(`${multiplierText} → +${p.toFixed(2)}`);
            } else if (p < -0.01) {
              const multiplierText = actualMultiplier >= 100 ? String(actualMultiplier) : actualMultiplier + 'x';
              toast.error(`${multiplierText} → ${p.toFixed(2)}`);
            }
            return;
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
