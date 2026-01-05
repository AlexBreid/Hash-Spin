// minesweeperService.js - ФИНАЛЬНАЯ ВЕРСИЯ БЕЗ SCHEMA ИЗМЕНЕНИЙ
const prisma = require('../../prismaClient');
const { Decimal } = require('@prisma/client');

class MinesweeperService {
    /**
     * 🆕 НОВАЯ ФОРМУЛА МНОЖИТЕЛЯ для поля 5x5
     * МАКСИМАЛЬНЫЙ МНОЖИТЕЛЬ ВСЕГДА 24.8x (независимо от количества мин)
     * При 1 мине: 1 клетка = 1.03x, 2 клетки = 1.08x, макс = 24.8x (24 безопасных клетки)
     * При 15 минах: 1 клетка = 2.48x, макс = 24.8x (10 безопасных клеток)
     * При 24 минах: 1 клетка = 24.8x (1 безопасная клетка, сразу максимум)
     * Скорость роста зависит от количества мин (чем больше мин, тем быстрее растет)
     */
    getMultiplier(revealedCount, minesCount) {
        if (revealedCount <= 0) return 1.0;
        
        const gridSize = 5;
        const totalSafeCells = (gridSize * gridSize) - minesCount;
        
        // МАКСИМАЛЬНЫЙ МНОЖИТЕЛЬ ВСЕГДА 24.8x
        const maxMultiplier = 24.8;
        
        // Если всего 1 безопасная клетка (24 мины), сразу возвращаем максимальный множитель
        if (totalSafeCells === 1) {
            return Math.round(maxMultiplier * 100) / 100;
        }
        
        // Базовый множитель для первой клетки зависит от количества мин
        // При 1 мине: 1.03x (самая легкая, медленный рост)
        // При 15 минах: 2.48x (быстрый рост)
        // При 24 минах: равен максимальному (уже обработано выше)
        // Используем интерполяцию между известными точками
        let baseMultiplier;
        if (minesCount === 1) {
            baseMultiplier = 1.03;
        } else if (minesCount === 15) {
            baseMultiplier = 2.48;
        } else if (minesCount >= 24) {
            // При 24+ минах базовый множитель близок к максимальному
            baseMultiplier = maxMultiplier * 0.95; // 95% от максимума
        } else {
            // Линейная интерполяция между 1.03 (1 мина) и 2.48 (15 мин)
            // Для значений больше 15 используем экспоненциальный рост
            if (minesCount < 15) {
                const slope = (2.48 - 1.03) / (15 - 1);
                baseMultiplier = 1.03 + (minesCount - 1) * slope;
            } else {
                // Экспоненциальный рост от 2.48 (15 мин) до maxMultiplier * 0.95 (24 мин)
                const progress = (minesCount - 15) / (24 - 15);
                const targetBase = maxMultiplier * 0.95;
                baseMultiplier = 2.48 + (targetBase - 2.48) * Math.pow(progress, 1.5);
            }
        }
        
        // Прогресс от 0 до 1
        const progress = revealedCount / totalSafeCells;
        
        // Скорость роста зависит от количества мин
        // Чем больше мин, тем быстрее растет множитель (более крутая кривая)
        // Используем степень, которая зависит от количества мин
        // При 1 мине: более плавная кривая (степень 2.0)
        // При большем количестве мин: более крутая кривая (меньше степень = быстрее рост)
        // Формула: от 2.0 (1 мина) до 0.2 (24 мины) - более агрессивное уменьшение
        const minPower = 0.2;
        const maxPower = 2.0;
        // Используем квадратичную функцию для более резкого изменения при большем количестве мин
        const normalizedMines = (minesCount - 1) / 23; // От 0 до 1
        const curvePower = maxPower - Math.pow(normalizedMines, 1.5) * (maxPower - minPower);
        const exponentialCurve = Math.pow(progress, Math.max(0.1, curvePower));
        
        // Рассчитываем множитель: от базового до максимального (24.8x)
        let multiplier = baseMultiplier + (maxMultiplier - baseMultiplier) * exponentialCurve;
        
        // Корректируем для точных значений на первых шагах
        if (minesCount === 1) {
            if (revealedCount === 1) {
                multiplier = 1.03;
            } else if (revealedCount === 2) {
                multiplier = 1.08;
            }
        } else {
            // Для других количеств мин первая клетка должна точно равняться базовому множителю
            if (revealedCount === 1) {
                multiplier = baseMultiplier;
            }
        }
        
        return Math.round(multiplier * 100) / 100;
    }

    /**
     * 🆕 ПОЛУЧИТЬ СЛЕДУЮЩИЙ МНОЖИТЕЛЬ
     */
    getNextMultiplier(currentRevealedCount, minesCount) {
        return this.getMultiplier(currentRevealedCount + 1, minesCount);
    }

    /**
     * 🆕 ПОЛУЧИТЬ МАКСИМАЛЬНЫЙ МНОЖИТЕЛЬ
     */
    getMaxMultiplier(minesCount) {
        const gridSize = 5;
        const totalSafeCells = (gridSize * gridSize) - minesCount;
        return this.getMultiplier(totalSafeCells, minesCount);
    }

    // Генерируем поле 5x5 с минами
    generateField(minesCount) {
        const gridSize = 5;
        const grid = Array(gridSize).fill(null).map(() => 
            Array(gridSize).fill(null).map(() => ({
                mine: false,
                revealed: false,
                flagged: false,
                adjacentMines: 0,
            }))
        );

        const minesPositions = [];
        while (minesPositions.length < minesCount) {
            const x = Math.floor(Math.random() * gridSize);
            const y = Math.floor(Math.random() * gridSize);
            if (!grid[y][x].mine) {
                minesPositions.push([x, y]);
                grid[y][x].mine = true;
            }
        }

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!grid[y][x].mine) {
                    let count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const ny = y + dy;
                            const nx = x + dx;
                            if (ny >= 0 && ny < gridSize && nx >= 0 && nx < gridSize && grid[ny][nx].mine) {
                                count++;
                            }
                        }
                    }
                    grid[y][x].adjacentMines = count;
                }
            }
        }
        return { grid, minesPositions };
    }
    
    checkWin(grid) {
        const gridSize = 5;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!grid[y][x].mine && !grid[y][x].revealed) {
                    return false;
                }
            }
        }
        return true;
    }
    
    countRevealedCells(grid) {
        let count = 0;
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x].revealed && !grid[y][x].mine) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 🔒 Подготовка СЕТКИ для ФРОНТА
     */
    prepareGridForFront(grid) {
        return grid.map(row => 
            row.map(cell => ({
                revealed: cell.revealed,
                isMine: cell.revealed ? cell.mine : undefined,
            }))
        );
    }

    /**
     * 🆕 Подготовка ПОЛНОГО РАСКРЫТОГО ПОЛЯ
     */
    prepareFullRevealedGrid(grid) {
        return grid.map(row => 
            row.map(cell => ({
                revealed: true,
                isMine: cell.mine,
            }))
        );
    }
    
    /**
     * 🕹️ Создаём новую игру
     * Теперь принимает minesCount напрямую, БЕЗ использования БД для difficulty
     */
    async createGame(userId, tokenId, minesCount, betAmount) {
        try {
            console.log('   ⚙️ [Service.createGame] Параметры:');
            console.log('      userId:', userId);
            console.log('      tokenId:', tokenId);
            console.log('      minesCount:', minesCount);
            console.log('      betAmount:', betAmount);

            // Валидация количества мин
            const gridSize = 5;
            const maxMines = gridSize * gridSize - 1; // Максимум 24 мины на поле 5x5
            
            if (minesCount < 1 || minesCount > maxMines) {
                throw new Error(`❌ Количество мин должно быть от 1 до ${maxMines}`);
            }

            const { grid, minesPositions } = this.generateField(minesCount);
            const initialMultiplier = 1.0;

            console.log('   ✅ Поле сгенерировано');

            // Сохраняем minesCount в gameState как метаданные
            const gameStateWithMeta = {
                grid: grid,
                minesCount: parseInt(minesCount),
                gridSize: gridSize
            };

            // Используем любое существующее difficulty для совместимости с БД (если требуется)
            // Но minesCount храним в gameState и НЕ используем difficulty из БД
            const defaultDifficulty = await prisma.minesweeperDifficulty.findFirst();

            const game = await prisma.minesweeperGame.create({
                data: {
                    userId,
                    tokenId,
                    difficultyId: defaultDifficulty?.id || 1, // Для совместимости с БД, но не используем
                    betAmount,
                    gameState: JSON.stringify(gameStateWithMeta),
                    minesPositions: JSON.stringify(minesPositions),
                    status: 'PLAYING',
                    multiplier: initialMultiplier,
                    revealedCells: 0,
                },
            });

            console.log(`   ✅ Игра создана в БД: ID ${game.id}`);

            // Принудительно создаем пустое поле 5x5 для фронтенда
            const emptyGrid = Array(5).fill(null).map(() =>
                Array(5).fill(null).map(() => ({
                    revealed: false,
                }))
            );

            const maxMultiplier = this.getMaxMultiplier(minesCount);
            const nextMultiplier = this.getNextMultiplier(0, minesCount);

            const response = {
                gameId: game.id,
                grid: emptyGrid,
                currentMultiplier: initialMultiplier,
                nextMultiplier: nextMultiplier,
                maxMultiplier: maxMultiplier,
                potentialWin: new Decimal(betAmount).mul(initialMultiplier).toString(),
            };

            console.log('   ✅ Ответ подготовлен');
            return response;

        } catch (error) {
            console.error('❌ [Service.createGame] ОШИБКА:', error.message);
            console.error('   Stack:', error.stack);
            throw error;
        }
    }

    /**
     * ⚡ Открываем ОДНУ клетку
     */
    async revealGameCell(gameId, x, y, userId) {
        try {
            const game = await prisma.minesweeperGame.findUnique({
                where: { id: gameId },
            });

            if (!game) {
                throw new Error('❌ Игра не найдена');
            }

            if (game.userId !== userId) {
                throw new Error('❌ Вы не можете играть чужую игру');
            }

            if (game.status !== 'PLAYING') {
                throw new Error('❌ Игра уже завершена');
            }

            if (x < 0 || x >= 5 || y < 0 || y >= 5 || !Number.isInteger(x) || !Number.isInteger(y)) {
                throw new Error('❌ Некорректные координаты');
            }
            
            // Получаем gameState с метаданными
            const gameStateData = JSON.parse(game.gameState);
            // Поддержка старого формата (только grid) и нового (объект с grid и minesCount)
            const grid = Array.isArray(gameStateData) ? gameStateData : gameStateData.grid;
            const minesCount = gameStateData.minesCount || 6; // Fallback для старых игр
            let betAmount = new Decimal(game.betAmount);

            if (grid[y][x].revealed) {
                throw new Error('❌ Клетка уже открыта');
            }

            const cell = grid[y][x];
            const isMine = cell.mine;

            grid[y][x].revealed = true;

            // ❌ ПОПАЛИ В МИНУ
            if (isMine) {
                // Открываем ВСЕ клетки (и мины, и безопасные)
                for (let y = 0; y < 5; y++) {
                    for (let x = 0; x < 5; x++) {
                        grid[y][x].revealed = true;
                    }
                }

                // Сохраняем обновленное поле с метаданными
                const updatedGameState = {
                    grid: grid,
                    minesCount: minesCount,
                    gridSize: 5
                };

                await prisma.minesweeperGame.update({
                    where: { id: gameId },
                    data: {
                        status: 'LOST',
                        gameState: JSON.stringify(updatedGameState),
                        winAmount: 0,
                    },
                });

                console.log(`❌ Игра ${gameId}: попадание в мину в позиции [${x}, ${y}]`);
                
                const fullRevealedGrid = this.prepareFullRevealedGrid(grid);
                
                return {
                    status: 'LOST',
                    isMine: true,
                    x,
                    y,
                    currentMultiplier: 0,
                    nextMultiplier: 0,
                    maxMultiplier: this.getMaxMultiplier(minesCount),
                    potentialWin: '0',
                    winAmount: '0',
                    fullGrid: fullRevealedGrid,
                    message: '💣 Вы попали в мину! Игра окончена.',
                };
            }

            // ✅ БЕЗОПАСНАЯ КЛЕТКА
            const revealedCount = this.countRevealedCells(grid);
            
            console.log(`   📊 Расчет множителя: revealedCount=${revealedCount}, minesCount=${minesCount}`);
            
            const currentMultiplier = this.getMultiplier(revealedCount, minesCount);
            const nextMultiplier = this.getNextMultiplier(revealedCount, minesCount);
            const maxMultiplier = this.getMaxMultiplier(minesCount);
            const potentialWin = betAmount.mul(currentMultiplier);
            
            const isWon = this.checkWin(grid);
            
            // Сохраняем обновленное поле с метаданными
            const updatedGameState = {
                grid: grid,
                minesCount: minesCount,
                gridSize: 5
            };
            
            const updateData = {
                gameState: JSON.stringify(updatedGameState),
                revealedCells: revealedCount,
                multiplier: currentMultiplier,
                status: isWon ? 'WON' : 'PLAYING',
            };

            // 🎉 ПОЛНАЯ ПОБЕДА
            if (isWon) {
                const finalWinAmount = potentialWin;
                updateData.winAmount = finalWinAmount;
                
                await prisma.minesweeperGame.update({
                    where: { id: gameId },
                    data: updateData,
                });

                console.log(`🎉 Игра ${gameId}: ПОЛНАЯ ПОБЕДА! Выигрыш ${finalWinAmount}`);

                const fullRevealedGrid = this.prepareFullRevealedGrid(grid);
                
                return {
                    status: 'WON',
                    isMine: false,
                    x,
                    y,
                    currentMultiplier,
                    nextMultiplier: 0,
                    maxMultiplier,
                    potentialWin: potentialWin.toString(),
                    winAmount: finalWinAmount.toString(),
                    fullGrid: fullRevealedGrid,
                    message: `🎉 Вы выиграли ${finalWinAmount.toString()}!`,
                };
            }

            await prisma.minesweeperGame.update({
                where: { id: gameId },
                data: updateData,
            });

            const responseGrid = this.prepareGridForFront(grid);

            return {
                status: 'PLAYING',
                isMine: false,
                x,
                y,
                currentMultiplier,
                nextMultiplier,
                maxMultiplier,
                potentialWin: potentialWin.toString(),
                winAmount: null,
                fullGrid: null,
                message: '✅ Безопасно.',
            };
            
        } catch (error) {
            console.error('❌ Ошибка открытия клетки:', error.message);
            throw error;
        }
    }

    /**
     * 💰 Забрать выигрыш (Кэшаут)
     */
    async cashOutGame(gameId, userId) {
        try {
            const game = await prisma.minesweeperGame.findUnique({
                where: { id: gameId },
            });

            if (!game) {
                throw new Error('❌ Игра не найдена');
            }

            if (game.userId !== userId) {
                throw new Error('❌ Вы не можете кэшить чужую игру');
            }

            if (game.status !== 'PLAYING') {
                throw new Error('❌ Кэшаут невозможен: игра уже завершена');
            }
            
            const winAmount = new Decimal(game.betAmount).mul(game.multiplier);
            
            const finalGame = await prisma.minesweeperGame.update({
                where: { id: gameId },
                data: {
                    status: 'CASHED_OUT',
                    winAmount: winAmount,
                },
            });

            // Получаем gameState с метаданными
            const gameStateData = JSON.parse(game.gameState);
            const grid = Array.isArray(gameStateData) ? gameStateData : gameStateData.grid;
            const fullRevealedGrid = this.prepareFullRevealedGrid(grid);

            console.log(`💸 Игра ${gameId}: Кэшаут на ${game.multiplier}X. Выигрыш: ${winAmount}`);
            
            return {
                status: 'CASHED_OUT',
                winAmount: winAmount.toString(),
                multiplier: finalGame.multiplier,
                fullGrid: fullRevealedGrid,
                message: `💸 Вы успешно забрали ${winAmount.toString()}!`,
            };

        } catch (error) {
            console.error('❌ Ошибка кэшаута:', error.message);
            throw error;
        }
    }
}

module.exports = new MinesweeperService();

