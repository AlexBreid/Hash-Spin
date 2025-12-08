import io, { Socket } from 'socket.io-client';

const GAME_SERVER_URL = import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
  private authToken: string | null = null;

  async connect(userId: number, userName: string, authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.authToken = authToken;

        this.socket = io(GAME_SERVER_URL, {
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          auth: {
            token: authToken
          }
        });

        this.socket.on('connect', () => {

          
          this.socket!.emit('joinGame', {
            userId,
            userName,
          });

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
      console.error('❌ Game error:', message);
      this.emit('error', { message });
    });
  }

  async placeBet(amount: number, tokenId: number): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.emit('placeBet', { 
      amount, 
      tokenId,
      token: this.authToken
    });
  }

  async cashout(): Promise<void> {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('cashout');
  }

  async fetchLastCrashes(): Promise<any[]> {
    try {
      console.log(`📊 [SERVICE] Загружаю последние крахи с бэкенда...`);

      const response = await fetch(`${API_BASE_URL}/api/v1/crash/last-crashes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Invalid response');
      }

      if (!Array.isArray(data.data)) {
        throw new Error('Data is not an array');
      }
      
      const crashes = data.data.map((crash: any) => {
        const timestamp = new Date(crash.timestamp);
        return {
          id: crash.id || crash.gameId,
          crashPoint: parseFloat(crash.crashPoint.toString()),
          timestamp,
          gameId: crash.gameId
        };
      });

      const sorted = crashes.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      );


      return sorted;
    } catch (error) {
      console.error('❌ [SERVICE] Ошибка загрузки крашей:', error);
      return [];
    }
  }

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