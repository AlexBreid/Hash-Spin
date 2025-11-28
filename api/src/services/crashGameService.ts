// src/services/crashGameService.ts
import io, { Socket } from 'socket.io-client';

const GAME_SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:5000';

export interface CrashGameState {
  gameId: string;
  status: 'waiting' | 'flying' | 'crashed';
  multiplier: number;
  crashPoint: number | null;
  countdown: number;
}

export interface PlayerBet {
  userId: number;
  amount: number;
  tokenId: number;
  multiplier?: number;
  winnings?: number;
  result?: 'won' | 'lost';
}

export interface LiveEvent {
  id: string;
  type: 'bet' | 'cashout' | 'crash' | 'join';
  message: string;
  timestamp: Date;
  player?: string;
  data?: any;
}

class CrashGameService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  async connect(userId: number, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(GAME_SERVER_URL, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
          console.log('✅ Подключились к Crash Server');
          
          this.socket!.emit('joinGame', {
            userId,
            userName,
          });

          // Подписываемся на все события
          this.setupEventListeners();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ Ошибка подключения:', error);
          reject(error);
        });

        this.socket.on('disconnect', () => {
          console.log('⚠️ Отключились от Crash Server');
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Все события связаны с игровым состоянием
    this.socket.on('gameStatus', (data: CrashGameState) => {
      this.emit('gameStatus', data);
    });

    this.socket.on('multiplierUpdate', (data: { multiplier: number; gameId: string }) => {
      this.emit('multiplierUpdate', data);
    });

    this.socket.on('gameCrashed', (data: any) => {
      this.emit('gameCrashed', data);
    });

    this.socket.on('playerJoined', (data: { playersCount: number }) => {
      this.emit('playerJoined', data);
    });

    this.socket.on('betPlaced', (data: any) => {
      this.emit('betPlaced', data);
    });

    this.socket.on('cashoutSuccess', (data: { multiplier: number; winnings: number }) => {
      this.emit('cashoutSuccess', data);
    });

    this.socket.on('playerCashedOut', (data: any) => {
      this.emit('playerCashedOut', data);
    });

    this.socket.on('countdownUpdate', (data: { seconds: number }) => {
      this.emit('countdownUpdate', data);
    });

    this.socket.on('error', (message: string) => {
      this.emit('error', { message });
    });
  }

  // Методы для размещения ставок и кэшаута
  async placeBet(amount: number, tokenId: number): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('placeBet', { amount, tokenId });
  }

  async cashout(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('cashout');
  }

  // Система эмиттеров для подписки на события
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => callback(data));
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const crashGameService = new CrashGameService();