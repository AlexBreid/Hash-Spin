// minesweeperService.js
const prisma = require('../../prismaClient');
const { Decimal } = require('@prisma/client');

class MinesweeperService {
    /**
     * Возвращает прогрессивный множитель на основе сложности и количества открытых клеток.
     */
    getMultiplier(revealedCount, minesCount) {
        if (revealedCount <= 0) return 1.0;
        
        const gridSize = 6;
        const totalSafeCells = (gridSize * gridSize) - minesCount;

        let baseMultiplier;
        if (minesCount === 6) baseMultiplier = 0.05;
        else if (minesCount === 12) baseMultiplier = 0.10;
        else if (minesCount === 18) baseMultiplier = 0.15;
        else baseMultiplier = 0.1;

        let multiplier = 1.0 + (revealedCount * baseMultiplier);
        
        if (revealedCount > totalSafeCells * 0.5) {
            multiplier *= 1.5;
        }

        return Math.round(multiplier * 100) / 100;
    }

    // Генерируем поле 6x6 с минами
    generateField(minesCount) {
        const gridSize = 6;
        const grid = Array(gridSize).fill(null).map(() => 
            Array(gridSize).fill(null).map(() => ({
                mine: false,
                revealed: false,
                flagged: false,
                adjacentMines: 0,
            }))
        );

        // Случайно расставляем мины
        const minesPositions = [];
        while (minesPositions.length < minesCount) {
            const x = Math.floor(Math.random() * gridSize);
            const y = Math.floor(Math.random() * gridSize);
            if (!grid[y][x].mine) {
                minesPositions.push([x, y]);
                grid[y][x].mine = true;
            }
        }

        // Считаем соседние мины для каждой пустой клетки
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
    
    // Проверяем победу (все безопасные клетки открыты)
    checkWin(grid) {
        const gridSize = 6;
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (!grid[y][x].mine && !grid[y][x].revealed) {
                    return false;
                }
            }
        }
        return true;
    }
    
    // Считаем открытые безопасные клетки
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
     * 🔒 Подготовка СЕТКИ для ФРОНТА с минимальной информацией
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
     * 🎰 Подготовка ПОЛНОГО РАСКРЫТОГО ПОЛЯ (для конца игры)
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
     */
    async createGame(userId, tokenId, difficultyId, betAmount) {
        try {
            const difficulty = await prisma.minesweeperDifficulty.findUnique({
                where: { id: difficultyId },
            });

            if (!difficulty) {
                throw new Error('❌ Сложность не найдена');
            }

            // Генерируем ПОЛНОЕ ПОЛЕ на сервере (с минами)
            const { grid, minesPositions } = this.generateField(difficulty.minesCount);
            const initialMultiplier = 1.0;

            const game = await prisma.minesweeperGame.create({
                data: {
                    userId,
                    tokenId,
                    difficultyId,
                    betAmount,
                    gameState: JSON.stringify(grid),
                    minesPositions: JSON.stringify(minesPositions),
                    status: 'PLAYING',
                    multiplier: initialMultiplier,
                    revealedCells: 0,
                },
            });

            console.log(`✅ Игра создана: ID ${game.id}, ставка ${betAmount}, мин ${difficulty.minesCount}`);

            // Отправляем фронту ПУСТОЕ ПОЛЕ
            const emptyGrid = Array(6).fill(null).map(() =>
                Array(6).fill(null).map(() => ({
                    revealed: false,
                }))
            );

            return {
                gameId: game.id,
                grid: emptyGrid,
                currentMultiplier: initialMultiplier,
                potentialWin: new Decimal(betAmount).mul(initialMultiplier).toString(),
            };
        } catch (error) {
            console.error('❌ Ошибка создания игры:', error.message);
            throw error;
        }
    }

    /**
     * ⚡ Открываем ОДНУ клетку (ВСЯ ЛОГИКА НА СЕРВЕРЕ)
     */
    async revealGameCell(gameId, x, y, userId) {
        try {
            // Проверяем что игра принадлежит пользователю
            const game = await prisma.minesweeperGame.findUnique({
                where: { id: gameId },
                include: { difficulty: true },
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

            // ✅ Валидация координат
            if (x < 0 || x >= 6 || y < 0 || y >= 6 || !Number.isInteger(x) || !Number.isInteger(y)) {
                throw new Error('❌ Некорректные координаты');
            }
            
            // ВОССТАНАВЛИВАЕМ ПОЛНОЕ ПОЛЕ с минами на СЕРВЕРЕ
            let grid = JSON.parse(game.gameState);
            let betAmount = new Decimal(game.betAmount);

            // Проверяем что клетка еще не открывалась
            if (grid[y][x].revealed) {
                throw new Error('❌ Клетка уже открыта');
            }

            const cell = grid[y][x];
            const isMine = cell.mine;

            // ОТКРЫВАЕМ ТОЛЬКО ЭТУ КЛЕТКУ НА СЕРВЕРЕ
            grid[y][x].revealed = true;

            // ❌ ПОПАЛИ В МИНУ
            if (isMine) {
                // Открываем ВСЕ мины на сервере
                const minesPositions = JSON.parse(game.minesPositions);
                for (const [mx, my] of minesPositions) {
                    grid[my][mx].revealed = true;
                }

                await prisma.minesweeperGame.update({
                    where: { id: gameId },
                    data: {
                        status: 'LOST',
                        gameState: JSON.stringify(grid),
                        winAmount: 0,
                    },
                });

                console.log(`❌ Игра ${gameId}: попадание в мину в позиции [${x}, ${y}]`);
                
                // Отправляем ПОЛНОЕ РАСКРЫТОЕ ПОЛЕ
                const fullRevealedGrid = this.prepareFullRevealedGrid(grid);
                
                return {
                    status: 'LOST',
                    isMine: true,
                    x,
                    y,
                    currentMultiplier: 0,
                    potentialWin: '0',
                    winAmount: '0',
                    fullGrid: fullRevealedGrid, // ← ПОЛНОЕ ПОЛЕ!
                    message: '💣 Вы попали в мину! Игра окончена.',
                };
            }

            // ✅ БЕЗОПАСНАЯ КЛЕТКА - продолжаем игру
            const revealedCount = this.countRevealedCells(grid);
            const currentMultiplier = this.getMultiplier(revealedCount, game.difficulty.minesCount);
            const potentialWin = betAmount.mul(currentMultiplier);
            
            // Проверяем победу
            const isWon = this.checkWin(grid);
            
            const updateData = {
                gameState: JSON.stringify(grid),
                revealedCells: revealedCount,
                multiplier: currentMultiplier,
                status: isWon ? 'WON' : 'PLAYING',
            };
            
            let finalWinAmount = null;

            // 🎉 ПОЛНАЯ ПОБЕДА
            if (isWon) {
                finalWinAmount = potentialWin;
                await this.depositWinAmount(game.userId, game.tokenId, finalWinAmount);
                updateData.winAmount = finalWinAmount;
                console.log(`🎉 Игра ${gameId}: ПОЛНАЯ ПОБЕДА! Выигрыш ${finalWinAmount}`);

                // Отправляем ПОЛНОЕ РАСКРЫТОЕ ПОЛЕ
                const fullRevealedGrid = this.prepareFullRevealedGrid(grid);
                
                return {
                    status: 'WON',
                    isMine: false,
                    x,
                    y,
                    currentMultiplier,
                    potentialWin: potentialWin.toString(),
                    winAmount: finalWinAmount.toString(),
                    fullGrid: fullRevealedGrid, // ← ПОЛНОЕ ПОЛЕ!
                    message: `🎉 Вы выиграли ${finalWinAmount.toString()}!`,
                };
            }

            await prisma.minesweeperGame.update({
                where: { id: gameId },
                data: updateData,
            });

            // Отправляем только обновленную клетку (без полного поля)
            const responseGrid = this.prepareGridForFront(grid);

            return {
                status: 'PLAYING',
                isMine: false,
                x,
                y,
                currentMultiplier,
                potentialWin: potentialWin.toString(),
                winAmount: null,
                fullGrid: null, // ← Нет полного поля, игра продолжается
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
                include: { difficulty: true },
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
            
            // Пополняем баланс
            await this.depositWinAmount(game.userId, game.tokenId, winAmount);
            
            // Обновляем статус игры
            const finalGame = await prisma.minesweeperGame.update({
                where: { id: gameId },
                data: {
                    status: 'CASHED_OUT',
                    winAmount: winAmount,
                },
            });

            // Восстанавливаем поле для отправки
            let grid = JSON.parse(game.gameState);
            const fullRevealedGrid = this.prepareFullRevealedGrid(grid);

            console.log(`💸 Игра ${gameId}: Кэшаут на ${game.multiplier}X. Выигрыш: ${winAmount}`);
            
            return {
                status: 'CASHED_OUT',
                winAmount: winAmount.toString(),
                multiplier: finalGame.multiplier,
                fullGrid: fullRevealedGrid, // ← ПОЛНОЕ ПОЛЕ!
                message: `💸 Вы успешно забрали ${winAmount.toString()}!`,
            };

        } catch (error) {
            console.error('❌ Ошибка кэшаута:', error.message);
            throw error;
        }
    }

    /**
     * 🏦 Пополнение баланса
     */
    async depositWinAmount(userId, tokenId, amount) {
        const winAmountDecimal = amount instanceof Decimal ? amount : new Decimal(amount.toString());

        return prisma.balance.upsert({
            where: {
                userId_tokenId_type: {
                    userId: userId,
                    tokenId: tokenId,
                    type: 'MAIN',
                },
            },
            update: {
                amount: {
                    increment: winAmountDecimal,
                },
            },
            create: {
                userId: userId,
                tokenId: tokenId,
                type: 'MAIN',
                amount: winAmountDecimal,
            },
        });
    }
}

module.exports = new MinesweeperService();