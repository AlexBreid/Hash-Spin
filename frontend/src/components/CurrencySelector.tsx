/**
 * Компонент выбора валюты для игр и навигации
 * Запоминает выбор в localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Coins } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const STORAGE_KEY = 'selectedCurrency';

export interface CurrencyInfo {
  tokenId: number;
  symbol: string;
  name: string;
  network: string;
  balance: number;
  bonus: number;
}

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: CurrencyInfo) => void;
  compact?: boolean; // Компактный режим для игр
  showBalance?: boolean;
  className?: string;
}

// Глобальное хранилище для синхронизации между компонентами
let globalCurrency: CurrencyInfo | null = null;
const listeners: Set<(currency: CurrencyInfo) => void> = new Set();

export function setGlobalCurrency(currency: CurrencyInfo) {
  globalCurrency = currency;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    tokenId: currency.tokenId,
    symbol: currency.symbol,
  }));
  listeners.forEach(fn => fn(currency));
}

export function getGlobalCurrency(): CurrencyInfo | null {
  return globalCurrency;
}

export function subscribeToGlobalCurrency(fn: (currency: CurrencyInfo) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function CurrencySelector({ 
  onCurrencyChange, 
  compact = false,
  showBalance = true,
  className = ''
}: CurrencySelectorProps) {
  const { theme } = useTheme();
  const { token, isAuthenticated } = useAuth();
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Загружаем валюты и балансы
  const loadCurrencies = useCallback(async () => {
    if (!token) return;
    
    try {
      // Загружаем базовые токены
      const tokensRes = await fetch(`${API_BASE_URL}/api/v1/wallet/tokens`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Загружаем балансы
      const balanceRes = await fetch(`${API_BASE_URL}/api/v1/wallet/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tokensRes.ok && balanceRes.ok) {
        const tokensData = await tokensRes.json();
        const balanceData = await balanceRes.json();
        
        const tokens = tokensData.data || [];
        const balances = balanceData.data || [];
        
        // ✅ Группируем балансы по СИМВОЛУ (USDT, USDC, etc.)
        const balanceBySymbol = new Map<string, { tokenId: number; main: number; bonus: number }>();
        balances.forEach((b: any) => {
          const existing = balanceBySymbol.get(b.symbol) || { tokenId: b.tokenId, main: 0, bonus: 0 };
          if (b.type === 'MAIN') existing.main += b.amount;
          if (b.type === 'BONUS') existing.bonus += b.amount;
          balanceBySymbol.set(b.symbol, existing);
        });
        
        // Создаём список валют из токенов
        const currencyList: CurrencyInfo[] = tokens.map((t: any) => {
          const bal = balanceBySymbol.get(t.symbol) || { tokenId: t.id, main: 0, bonus: 0 };
          return {
            tokenId: t.id,
            symbol: t.symbol,
            name: t.name,
            network: t.network || 'MULTI',
            balance: bal.main + bal.bonus,
            bonus: bal.bonus,
          };
        });
        
        setCurrencies(currencyList);
        
        // Восстанавливаем выбор из localStorage или globalCurrency
        const saved = localStorage.getItem(STORAGE_KEY);
        let defaultCurrency: CurrencyInfo | null = null;
        
        if (globalCurrency) {
          defaultCurrency = currencyList.find(c => c.tokenId === globalCurrency!.tokenId) || null;
        }
        
        if (!defaultCurrency && saved) {
          try {
            const parsed = JSON.parse(saved);
            defaultCurrency = currencyList.find(c => c.tokenId === parsed.tokenId) || null;
          } catch {}
        }
        
        if (!defaultCurrency) {
          // По умолчанию USDT или первая валюта
          defaultCurrency = currencyList.find(c => c.symbol === 'USDT') || currencyList[0];
        }
        
        if (defaultCurrency) {
          setSelectedCurrency(defaultCurrency);
          setGlobalCurrency(defaultCurrency);
          onCurrencyChange?.(defaultCurrency);
        }
      }
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  }, [token, onCurrencyChange]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrencies();
    }
  }, [isAuthenticated, loadCurrencies]);

  // Подписываемся на глобальные изменения
  useEffect(() => {
    const unsubscribe = subscribeToGlobalCurrency((currency) => {
      const found = currencies.find(c => c.tokenId === currency.tokenId);
      if (found) {
        setSelectedCurrency(found);
      }
    });
    return unsubscribe;
  }, [currencies]);

  const handleSelect = (currency: CurrencyInfo) => {
    setSelectedCurrency(currency);
    setGlobalCurrency(currency);
    onCurrencyChange?.(currency);
    setIsOpen(false);
  };

  const formatBalance = (balance: number) => {
    if (balance >= 10000) {
      return balance.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    if (balance >= 100) {
      return balance.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    return balance.toLocaleString('en-US', { maximumFractionDigits: 8 });
  };

  // Цвета
  const bgColor = theme === 'dark' ? '#1f2937' : '#f3f4f6';
  const borderColor = theme === 'dark' ? '#374151' : '#d1d5db';
  const textColor = theme === 'dark' ? '#f9fafb' : '#111827';
  const mutedColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  if (loading) {
    return (
      <div 
        className={className}
        style={{
          padding: compact ? '8px 12px' : '10px 14px',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          color: mutedColor,
          fontSize: '13px',
        }}
      >
        Загрузка...
      </div>
    );
  }

  if (!selectedCurrency) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={className}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: compact ? '6px' : '10px',
            padding: compact ? '8px 12px' : '10px 14px',
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{
            width: compact ? '24px' : '32px',
            height: compact ? '24px' : '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: compact ? '9px' : '11px',
            color: '#fff',
          }}>
            {selectedCurrency.symbol.substring(0, 3)}
          </div>
          
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: compact ? '13px' : '14px',
              fontWeight: '600',
              color: textColor,
              lineHeight: '1.2',
            }}>
              {selectedCurrency.symbol}
            </div>
            {showBalance && (
              <div style={{
                fontSize: compact ? '11px' : '12px',
                color: selectedCurrency.balance > 0 ? '#10b981' : mutedColor,
                fontWeight: '600',
              }}>
                {formatBalance(selectedCurrency.balance)}
              </div>
            )}
          </div>
          
          <ChevronDown 
            size={compact ? 14 : 16} 
            style={{ 
              color: mutedColor,
              marginLeft: 'auto',
            }} 
          />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        style={{
          background: theme === 'dark' ? '#1f2937' : '#ffffff',
          border: `1px solid ${borderColor}`,
          borderRadius: '12px',
          padding: '8px',
          minWidth: '220px',
          maxHeight: '350px',
          overflowY: 'auto',
        }}
      >
        {/* Заголовок */}
        <div style={{
          padding: '8px 12px',
          fontSize: '11px',
          fontWeight: '600',
          color: mutedColor,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Выберите валюту
        </div>
        
        {currencies.map(currency => (
          <DropdownMenuItem
            key={currency.tokenId}
            onClick={() => handleSelect(currency)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: selectedCurrency?.tokenId === currency.tokenId
                ? 'rgba(16, 185, 129, 0.1)'
                : 'transparent',
              border: selectedCurrency?.tokenId === currency.tokenId
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid transparent',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: selectedCurrency?.tokenId === currency.tokenId
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : theme === 'dark' ? '#374151' : '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '10px',
              color: selectedCurrency?.tokenId === currency.tokenId ? '#fff' : mutedColor,
            }}>
              {currency.symbol.substring(0, 3)}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: selectedCurrency?.tokenId === currency.tokenId ? '#10b981' : textColor,
              }}>
                {currency.symbol}
              </div>
              <div style={{
                fontSize: '11px',
                color: mutedColor,
              }}>
                {currency.name}
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: currency.balance > 0 ? '#10b981' : mutedColor,
              }}>
                {formatBalance(currency.balance)}
              </div>
              {currency.bonus > 0 && (
                <div style={{
                  fontSize: '10px',
                  color: '#f59e0b',
                }}>
                  +{formatBalance(currency.bonus)} бонус
                </div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CurrencySelector;

