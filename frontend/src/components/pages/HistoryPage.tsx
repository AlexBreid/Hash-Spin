import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Filter,
  Calendar,
  Coins,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ЦВЕТОВАЯ ПАЛИТРА
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: 'var(--background)',
  card: 'var(--card)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  accent: 'var(--accent)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  error: '#EF4444',
  warning: '#F59E0B',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 ИНТЕРФЕЙСЫ
// ═══════════════════════════════════════════════════════════════════════════════

interface Transaction {
  id: number;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BET' | 'WIN' | 'BONUS' | 'REFERRAL';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: string | number;
  currency: string;
  txHash?: string;
  walletAddress?: string;
  createdAt: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    total: number;
    page: number;
    totalPages: number;
  };
}

type FilterType = 'all' | 'deposit' | 'withdraw';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

const getStatusInfo = (status: Transaction['status']) => {
  switch (status) {
    case 'COMPLETED':
      return { icon: CheckCircle2, color: COLORS.success, text: 'Выполнено' };
    case 'PENDING':
      return { icon: Clock, color: COLORS.warning, text: 'В обработке' };
    case 'FAILED':
      return { icon: XCircle, color: COLORS.error, text: 'Ошибка' };
    case 'CANCELLED':
      return { icon: XCircle, color: COLORS.mutedForeground, text: 'Отменено' };
    default:
      return { icon: Clock, color: COLORS.mutedForeground, text: status };
  }
};

const getTypeInfo = (type: Transaction['type']) => {
  switch (type) {
    case 'DEPOSIT':
      return { icon: ArrowDownCircle, color: COLORS.success, text: 'Пополнение', sign: '+' };
    case 'WITHDRAW':
      return { icon: ArrowUpCircle, color: COLORS.primary, text: 'Вывод', sign: '-' };
    case 'BET':
      return { icon: Coins, color: COLORS.warning, text: 'Ставка', sign: '-' };
    case 'WIN':
      return { icon: Coins, color: COLORS.success, text: 'Выигрыш', sign: '+' };
    case 'BONUS':
      return { icon: Coins, color: '#A855F7', text: 'Бонус', sign: '+' };
    case 'REFERRAL':
      return { icon: Coins, color: '#06B6D4', text: 'Реферал', sign: '+' };
    default:
      return { icon: Coins, color: COLORS.mutedForeground, text: type, sign: '' };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 КОМПОНЕНТ: TransactionCard
// ═══════════════════════════════════════════════════════════════════════════════

const TransactionCard = ({ tx, index }: { tx: Transaction; index: number }) => {
  const typeInfo = getTypeInfo(tx.type);
  const statusInfo = getStatusInfo(tx.status);
  const TypeIcon = typeInfo.icon;
  const StatusIcon = statusInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl p-4 border transition-all hover:scale-[1.01]"
      style={{
        background: `color-mix(in srgb, ${typeInfo.color} 8%, ${COLORS.card})`,
        borderColor: `color-mix(in srgb, ${typeInfo.color} 30%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        {/* Тип транзакции */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${typeInfo.color} 20%, transparent)`,
            }}
          >
            <TypeIcon size={20} style={{ color: typeInfo.color }} />
          </div>
          <div>
            <p style={{ color: COLORS.foreground }} className="font-semibold text-sm">
              {typeInfo.text}
            </p>
            <p style={{ color: COLORS.mutedForeground }} className="text-xs">
              #{tx.id}
            </p>
          </div>
        </div>

        {/* Сумма */}
        <div className="text-right">
          <p
            style={{ color: typeInfo.color }}
            className="font-bold text-lg"
          >
            {typeInfo.sign}{formatAmount(tx.amount)}
          </p>
          <p style={{ color: COLORS.mutedForeground }} className="text-xs">
            {tx.currency}
          </p>
        </div>
      </div>

      {/* Дата и статус */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: `color-mix(in srgb, ${COLORS.border} 50%, transparent)` }}>
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: COLORS.mutedForeground }} />
          <span style={{ color: COLORS.mutedForeground }} className="text-xs">
            {formatDate(tx.createdAt)}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <StatusIcon size={14} style={{ color: statusInfo.color }} />
          <span style={{ color: statusInfo.color }} className="text-xs font-medium">
            {statusInfo.text}
          </span>
        </div>
      </div>

      {/* TxHash если есть */}
      {tx.txHash && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: `color-mix(in srgb, ${COLORS.border} 30%, transparent)` }}>
          <p style={{ color: COLORS.mutedForeground }} className="text-xs truncate">
            TX: {tx.txHash.slice(0, 16)}...{tx.txHash.slice(-8)}
          </p>
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 КОМПОНЕНТ: FilterButton
// ═══════════════════════════════════════════════════════════════════════════════

const FilterButton = ({ 
  active, 
  onClick, 
  children, 
  color 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  color: string;
}) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
    style={{
      background: active 
        ? `color-mix(in srgb, ${color} 25%, transparent)`
        : `color-mix(in srgb, ${COLORS.muted} 30%, transparent)`,
      color: active ? color : COLORS.mutedForeground,
      border: `1px solid ${active ? color : 'transparent'}`,
    }}
  >
    {children}
  </motion.button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export function HistoryPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  const hasLoadedRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchHistory = async (pageNum: number = 1, showLoader: boolean = true) => {
    try {
      if (showLoader) setLoading(true);
      setRefreshing(!showLoader);
      setError(null);

      const token = localStorage.getItem('casino_jwt_token') || 
                   localStorage.getItem('authToken') || 
                   localStorage.getItem('token');

      if (!token) {
        setError('Необходима авторизация');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/v1/wallet/history?page=${pageNum}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        // Фильтруем по типу
        let filtered = data.data.transactions;
        if (filter === 'deposit') {
          filtered = filtered.filter(t => t.type === 'DEPOSIT');
        } else if (filter === 'withdraw') {
          filtered = filtered.filter(t => t.type === 'WITHDRAW');
        }

        setTransactions(filtered);
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages || 1);
        setPage(pageNum);
      }
    } catch (err) {
      
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchHistory(1);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) {
      fetchHistory(1);
    }
  }, [filter]);

  const handleRefresh = () => {
    fetchHistory(page, false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 РЕНДЕР
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        backgroundColor: COLORS.background,
        minHeight: '100vh',
        transition: 'background-color 300ms ease',
      }}
    >
      {/* ЗАГОЛОВОК */}
      <div
        className="sticky top-0 z-10 px-4 py-4"
        style={{
          background: `linear-gradient(to bottom, ${COLORS.background} 80%, transparent)`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center justify-between max-w-[500px] mx-auto">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/account')}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
              }}
            >
              <ArrowLeft size={20} style={{ color: COLORS.foreground }} />
            </motion.button>
            <div>
              <h1 style={{ color: COLORS.foreground }} className="text-xl font-bold">
                История операций
              </h1>
              <p style={{ color: COLORS.mutedForeground }} className="text-xs">
                {total} транзакций
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${COLORS.primary} 20%, transparent)`,
            }}
          >
            <RefreshCw
              size={18}
              style={{ color: COLORS.primary }}
              className={refreshing ? 'animate-spin' : ''}
            />
          </motion.button>
        </div>
      </div>

      <div className="px-4 pb-24 max-w-[500px] mx-auto">
        {/* ФИЛЬТРЫ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
        >
          <Filter size={16} style={{ color: COLORS.mutedForeground }} className="flex-shrink-0" />
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            color={COLORS.primary}
          >
            Все
          </FilterButton>
          <FilterButton
            active={filter === 'deposit'}
            onClick={() => setFilter('deposit')}
            color={COLORS.success}
          >
            <span className="flex items-center gap-1">
              <ArrowDownCircle size={14} />
              Пополнения
            </span>
          </FilterButton>
          <FilterButton
            active={filter === 'withdraw'}
            onClick={() => setFilter('withdraw')}
            color={COLORS.primary}
          >
            <span className="flex items-center gap-1">
              <ArrowUpCircle size={14} />
              Выводы
            </span>
          </FilterButton>
        </motion.div>

        {/* КОНТЕНТ */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 size={40} style={{ color: COLORS.primary }} />
            </motion.div>
            <p style={{ color: COLORS.mutedForeground }} className="mt-4">
              Загрузка истории...
            </p>
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl p-6 text-center"
            style={{
              background: `color-mix(in srgb, ${COLORS.error} 10%, ${COLORS.card})`,
              border: `1px solid color-mix(in srgb, ${COLORS.error} 30%, transparent)`,
            }}
          >
            <XCircle size={48} style={{ color: COLORS.error }} className="mx-auto mb-4" />
            <p style={{ color: COLORS.error }} className="font-semibold mb-2">
              {error}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchHistory(1)}
              className="px-6 py-2 rounded-xl font-medium mt-2"
              style={{
                background: COLORS.primary,
                color: 'white',
              }}
            >
              Повторить
            </motion.button>
          </motion.div>
        ) : transactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 text-center"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${COLORS.primary} 15%, transparent)`,
              }}
            >
              <Clock size={40} style={{ color: COLORS.primary }} />
            </div>
            <h3 style={{ color: COLORS.foreground }} className="text-lg font-bold mb-2">
              История пуста
            </h3>
            <p style={{ color: COLORS.mutedForeground }} className="text-sm">
              {filter === 'deposit' 
                ? 'У вас пока нет пополнений' 
                : filter === 'withdraw' 
                  ? 'У вас пока нет выводов'
                  : 'У вас пока нет транзакций'}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/deposit')}
              className="px-6 py-3 rounded-xl font-semibold mt-6"
              style={{
                background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.primary})`,
                color: 'white',
              }}
            >
              Пополнить счёт
            </motion.button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {transactions.map((tx, index) => (
                <TransactionCard key={tx.id} tx={tx} index={index} />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* ПАГИНАЦИЯ */}
        {totalPages > 1 && !loading && transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-4 mt-6 pt-4"
            style={{ borderTop: `1px solid ${COLORS.border}` }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchHistory(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-40"
              style={{
                background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
                color: COLORS.foreground,
              }}
            >
              ← Назад
            </motion.button>
            
            <span style={{ color: COLORS.mutedForeground }} className="text-sm">
              {page} / {totalPages}
            </span>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchHistory(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl font-medium text-sm disabled:opacity-40"
              style={{
                background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
                color: COLORS.foreground,
              }}
            >
              Вперёд →
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;



