import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  User,
  Coins,
  Calendar,
  AlertTriangle,
  Eye,
  Check,
  X,
  Search,
  Filter,
  ChevronDown,
  UserCheck,
  MessageSquare,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 ЦВЕТОВАЯ ПАЛИТРА
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  background: 'var(--background)',
  card: 'var(--card)',
  primary: 'var(--primary)',
  success: '#22C55E',
  accent: 'var(--accent)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  error: '#EF4444',
  warning: '#F59E0B',
  admin: '#8B5CF6',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 ИНТЕРФЕЙСЫ
// ═══════════════════════════════════════════════════════════════════════════════

interface Withdrawal {
  id: number;
  amount: string | number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  walletAddress: string | null;
  txHash: string | null;
  rejectReason: string | null;
  approvedAt: string | null;
  user: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    telegramId: string;
  };
  token: {
    id: number;
    symbol: string;
    network: string;
  };
  approvedBy: {
    id: number;
    username: string | null;
    firstName: string | null;
  } | null;
}

interface Filters {
  search: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'ALL';
  tokenId: string;
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════════

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
  return num.toFixed(num < 1 ? 8 : 2);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 КОМПОНЕНТ: WithdrawalCard
// ═══════════════════════════════════════════════════════════════════════════════

const WithdrawalCard = ({ 
  withdrawal, 
  onApprove, 
  onReject,
  processing 
}: { 
  withdrawal: Withdrawal; 
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  processing: number | null;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const isProcessing = processing === withdrawal.id;
  
  const statusColors = {
    PENDING: COLORS.warning,
    COMPLETED: COLORS.success,
    FAILED: COLORS.error,
  };
  
  const statusText = {
    PENDING: 'Ожидает проверки',
    COMPLETED: 'Одобрено',
    FAILED: 'Отклонено',
  };

  const userName = withdrawal.user.username 
    ? `@${withdrawal.user.username}` 
    : withdrawal.user.firstName || `User #${withdrawal.user.id}`;
  
  const approverName = withdrawal.approvedBy 
    ? (withdrawal.approvedBy.username ? `@${withdrawal.approvedBy.username}` : withdrawal.approvedBy.firstName || `Admin #${withdrawal.approvedBy.id}`)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-2xl p-4 border transition-all"
      style={{
        background: withdrawal.status === 'PENDING' 
          ? `color-mix(in srgb, ${COLORS.warning} 5%, ${COLORS.card})`
          : COLORS.card,
        borderColor: withdrawal.status === 'PENDING' 
          ? `color-mix(in srgb, ${COLORS.warning} 40%, transparent)`
          : COLORS.border,
      }}
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${statusColors[withdrawal.status]} 20%, transparent)`,
            }}
          >
            {withdrawal.status === 'PENDING' && <Clock size={20} style={{ color: COLORS.warning }} />}
            {withdrawal.status === 'COMPLETED' && <CheckCircle2 size={20} style={{ color: COLORS.success }} />}
            {withdrawal.status === 'FAILED' && <XCircle size={20} style={{ color: COLORS.error }} />}
          </div>
          <div>
            <p style={{ color: COLORS.foreground }} className="font-semibold text-sm">
              Заявка #{withdrawal.id}
            </p>
            <p style={{ color: statusColors[withdrawal.status] }} className="text-xs font-medium">
              {statusText[withdrawal.status]}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p style={{ color: COLORS.primary }} className="font-bold text-lg">
            {formatAmount(withdrawal.amount)}
          </p>
          <p style={{ color: COLORS.mutedForeground }} className="text-xs">
            {withdrawal.token.symbol}
          </p>
        </div>
      </div>

      {/* Информация о пользователе */}
      <div 
        className="rounded-xl p-3 mb-3"
        style={{ background: `color-mix(in srgb, ${COLORS.muted} 30%, transparent)` }}
      >
        <div className="flex items-center gap-2 mb-2">
          <User size={14} style={{ color: COLORS.mutedForeground }} />
          <span style={{ color: COLORS.foreground }} className="text-sm font-medium">
            {userName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: COLORS.mutedForeground }} />
          <span style={{ color: COLORS.mutedForeground }} className="text-xs">
            {formatDate(withdrawal.createdAt)}
          </span>
        </div>
      </div>
      
      {/* Информация об обработке (если одобрено/отклонено) */}
      {withdrawal.approvedBy && (
        <div 
          className="rounded-xl p-3 mb-3"
          style={{ 
            background: withdrawal.status === 'COMPLETED'
              ? `color-mix(in srgb, ${COLORS.success} 10%, transparent)`
              : `color-mix(in srgb, ${COLORS.error} 10%, transparent)`,
            border: `1px solid ${withdrawal.status === 'COMPLETED' ? COLORS.success : COLORS.error}30`
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={14} style={{ color: withdrawal.status === 'COMPLETED' ? COLORS.success : COLORS.error }} />
            <span style={{ color: COLORS.foreground }} className="text-xs font-medium">
              {withdrawal.status === 'COMPLETED' ? 'Одобрил:' : 'Отклонил:'} {approverName}
            </span>
          </div>
          {withdrawal.approvedAt && (
            <div className="flex items-center gap-2">
              <Calendar size={12} style={{ color: COLORS.mutedForeground }} />
              <span style={{ color: COLORS.mutedForeground }} className="text-xs">
                {formatDate(withdrawal.approvedAt)}
              </span>
            </div>
          )}
          {withdrawal.rejectReason && (
            <div className="flex items-start gap-2 mt-2">
              <MessageSquare size={12} style={{ color: COLORS.error }} className="mt-0.5" />
              <span style={{ color: COLORS.error }} className="text-xs">
                {withdrawal.rejectReason}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Детали (раскрывающиеся) */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div 
              className="rounded-xl p-3 mb-3 space-y-2"
              style={{ background: `color-mix(in srgb, ${COLORS.muted} 20%, transparent)` }}
            >
              <div className="flex justify-between">
                <span style={{ color: COLORS.mutedForeground }} className="text-xs">Telegram ID:</span>
                <span style={{ color: COLORS.foreground }} className="text-xs font-mono">
                  {withdrawal.user.telegramId}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.mutedForeground }} className="text-xs">User ID:</span>
                <span style={{ color: COLORS.foreground }} className="text-xs font-mono">
                  {withdrawal.user.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.mutedForeground }} className="text-xs">Сеть:</span>
                <span style={{ color: COLORS.foreground }} className="text-xs">
                  {withdrawal.token.network}
                </span>
              </div>
              {withdrawal.walletAddress && (
                <div className="flex justify-between">
                  <span style={{ color: COLORS.mutedForeground }} className="text-xs">Адрес:</span>
                  <span style={{ color: COLORS.foreground }} className="text-xs font-mono truncate max-w-[150px]">
                    {withdrawal.walletAddress}
                  </span>
                </div>
              )}
              {withdrawal.txHash && (
                <div className="flex justify-between">
                  <span style={{ color: COLORS.mutedForeground }} className="text-xs">TX Hash:</span>
                  <span style={{ color: COLORS.foreground }} className="text-xs font-mono truncate max-w-[150px]">
                    {withdrawal.txHash}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопки */}
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
          style={{
            background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
            color: COLORS.foreground,
          }}
        >
          <Eye size={14} />
          {showDetails ? 'Скрыть' : 'Детали'}
        </motion.button>

        {withdrawal.status === 'PENDING' && (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onReject(withdrawal.id)}
              disabled={isProcessing}
              className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
              style={{
                background: `color-mix(in srgb, ${COLORS.error} 15%, transparent)`,
                color: COLORS.error,
                border: `1px solid ${COLORS.error}`,
              }}
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              Отклонить
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onApprove(withdrawal.id)}
              disabled={isProcessing}
              className="flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
              style={{
                background: COLORS.success,
                color: 'white',
              }}
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Одобрить
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

// Модальное окно для отклонения
const RejectModal = ({
  isOpen,
  onClose,
  onConfirm,
  withdrawalId,
  loading
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  withdrawalId: number | null;
  loading: boolean;
}) => {
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: COLORS.foreground }} className="text-lg font-bold mb-4">
          Отклонить заявку #{withdrawalId}
        </h3>
        
        <p style={{ color: COLORS.mutedForeground }} className="text-sm mb-4">
          Средства будут возвращены пользователю на баланс. Укажите причину отклонения (необязательно):
        </p>
        
        <textarea
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: Подозрительная активность, требуется верификация..."
          className="w-full p-3 rounded-xl text-sm resize-none"
          style={{
            background: COLORS.muted,
            color: COLORS.foreground,
            border: `1px solid ${COLORS.border}`,
            minHeight: '100px'
          }}
        />
        
        <div className="flex gap-3 mt-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-medium"
            style={{
              background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
              color: COLORS.foreground,
            }}
          >
            Отмена
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{
              background: COLORS.error,
              color: 'white',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
            Отклонить
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export function AdminWithdrawalsPage() {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [stats, setStats] = useState({ pending: 0, completed: 0, failed: 0, total: 0 });
  
  // Фильтры
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'PENDING',
    tokenId: '',
    minAmount: '',
    maxAmount: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Модальное окно отклонения
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

  const getToken = () => {
    return localStorage.getItem('casino_jwt_token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('token');
  };
  
  // Debounced поиск
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 500);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchInput]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🔄 ЗАГРУЗКА ДАННЫХ
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchWithdrawals = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('Необходима авторизация');
        return;
      }

      // Строим query параметры из фильтров
      const params = new URLSearchParams();
      params.append('type', 'WITHDRAW');
      params.append('limit', '100');
      
      if (filters.status !== 'ALL') {
        params.append('status', filters.status);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.tokenId) {
        params.append('tokenId', filters.tokenId);
      }
      if (filters.minAmount) {
        params.append('minAmount', filters.minAmount);
      }
      if (filters.maxAmount) {
        params.append('maxAmount', filters.maxAmount);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      const response = await fetch(
        `${API_BASE}/api/admin/transactions?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 403) {
        setError('Доступ запрещён. Только для администраторов.');
        return;
      }

      if (!response.ok) {
        throw new Error(`Ошибка ${response.status}`);
      }

      const data = await response.json();
      setWithdrawals(Array.isArray(data) ? data : []);

      // Считаем статистику
      const pending = (Array.isArray(data) ? data : []).filter((w: Withdrawal) => w.status === 'PENDING').length;
      const completed = (Array.isArray(data) ? data : []).filter((w: Withdrawal) => w.status === 'COMPLETED').length;
      const failed = (Array.isArray(data) ? data : []).filter((w: Withdrawal) => w.status === 'FAILED').length;
      setStats({ pending, completed, failed, total: data.length });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [filters]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎬 ДЕЙСТВИЯ
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleApprove = async (id: number) => {
    if (!confirm('Вы уверены что хотите ОДОБРИТЬ этот вывод? Средства будут отправлены пользователю.')) {
      return;
    }

    try {
      setProcessing(id);
      const token = getToken();

      const response = await fetch(`${API_BASE}/api/admin/transactions/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка одобрения');
      }

      // Обновляем список
      await fetchWithdrawals(false);
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setProcessing(null);
    }
  };

  // Открыть модал отклонения
  const openRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectModalOpen(true);
  };

  // Обработка отклонения с причиной
  const handleReject = async (reason: string) => {
    if (!rejectingId) return;

    try {
      setProcessing(rejectingId);
      const token = getToken();

      const response = await fetch(`${API_BASE}/api/admin/transactions/${rejectingId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка отклонения');
      }

      // Закрываем модал и обновляем список
      setRejectModalOpen(false);
      setRejectingId(null);
      await fetchWithdrawals(false);
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setProcessing(null);
    }
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    setSearchInput('');
    setFilters({
      search: '',
      status: 'PENDING',
      tokenId: '',
      minAmount: '',
      maxAmount: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 🎨 РЕНДЕР
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        backgroundColor: COLORS.background,
        minHeight: '100vh',
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
        <div className="flex items-center justify-between max-w-[600px] mx-auto">
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
              <div className="flex items-center gap-2">
                <Shield size={18} style={{ color: COLORS.admin }} />
                <h1 style={{ color: COLORS.foreground }} className="text-xl font-bold">
                  Заявки на вывод
                </h1>
              </div>
              <p style={{ color: COLORS.mutedForeground }} className="text-xs">
                Админ-панель
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchWithdrawals(false)}
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

      <div className="px-4 pb-24 max-w-[600px] mx-auto">
        {/* СТАТИСТИКА */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6"
        >
          <div
            className="rounded-xl p-3 text-center"
            style={{
              background: `color-mix(in srgb, ${COLORS.warning} 15%, ${COLORS.card})`,
              border: `1px solid color-mix(in srgb, ${COLORS.warning} 30%, transparent)`,
            }}
          >
            <p style={{ color: COLORS.warning }} className="text-xl font-bold">
              {stats.pending}
            </p>
            <p style={{ color: COLORS.mutedForeground }} className="text-xs">
              Ожидают
            </p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              background: `color-mix(in srgb, ${COLORS.success} 15%, ${COLORS.card})`,
              border: `1px solid color-mix(in srgb, ${COLORS.success} 30%, transparent)`,
            }}
          >
            <p style={{ color: COLORS.success }} className="text-xl font-bold">
              {stats.completed}
            </p>
            <p style={{ color: COLORS.mutedForeground }} className="text-xs">
              Одобрено
            </p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              background: `color-mix(in srgb, ${COLORS.error} 15%, ${COLORS.card})`,
              border: `1px solid color-mix(in srgb, ${COLORS.error} 30%, transparent)`,
            }}
          >
            <p style={{ color: COLORS.error }} className="text-xl font-bold">
              {stats.failed}
            </p>
            <p style={{ color: COLORS.mutedForeground }} className="text-xs">
              Отклонено
            </p>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <p style={{ color: COLORS.foreground }} className="text-xl font-bold">
              {stats.total}
            </p>
            <p style={{ color: COLORS.mutedForeground }} className="text-xs">
              Всего
            </p>
          </div>
        </motion.div>

        {/* ПРЕДУПРЕЖДЕНИЕ */}
        {stats.pending > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{
              background: `color-mix(in srgb, ${COLORS.warning} 10%, ${COLORS.card})`,
              border: `1px solid ${COLORS.warning}`,
            }}
          >
            <AlertTriangle size={20} style={{ color: COLORS.warning }} className="flex-shrink-0 mt-0.5" />
            <div>
              <p style={{ color: COLORS.warning }} className="font-semibold text-sm">
                Внимание!
              </p>
              <p style={{ color: COLORS.mutedForeground }} className="text-xs mt-1">
                Перед одобрением вывода убедитесь, что пользователь не использовал читы или эксплойты.
                Проверьте историю игр и транзакций.
              </p>
            </div>
          </motion.div>
        )}

        {/* ПОИСК */}
        <div className="mb-4">
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Search size={18} style={{ color: COLORS.mutedForeground }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Поиск по нику, имени или Telegram ID..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: COLORS.foreground }}
            />
            {searchInput && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSearchInput('')}
                className="p-1 rounded-full"
                style={{ background: `color-mix(in srgb, ${COLORS.muted} 50%, transparent)` }}
              >
                <X size={14} style={{ color: COLORS.mutedForeground }} />
              </motion.button>
            )}
          </div>
        </div>

        {/* ФИЛЬТРЫ ПО СТАТУСУ */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {(['PENDING', 'COMPLETED', 'FAILED', 'ALL'] as const).map((status) => {
            const isActive = filters.status === status;
            const statusConfig = {
              PENDING: { color: COLORS.warning, icon: Clock, label: 'Ожидающие' },
              COMPLETED: { color: COLORS.success, icon: CheckCircle2, label: 'Одобренные' },
              FAILED: { color: COLORS.error, icon: XCircle, label: 'Отклонённые' },
              ALL: { color: COLORS.primary, icon: Coins, label: 'Все' },
            };
            const config = statusConfig[status];
            const Icon = config.icon;
            
            return (
              <motion.button
                key={status}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilters(prev => ({ ...prev, status }))}
                className="px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 whitespace-nowrap"
                style={{
                  background: isActive 
                    ? `color-mix(in srgb, ${config.color} 25%, transparent)`
                    : `color-mix(in srgb, ${COLORS.muted} 30%, transparent)`,
                  color: isActive ? config.color : COLORS.mutedForeground,
                  border: `1px solid ${isActive ? config.color : 'transparent'}`,
                }}
              >
                <span className="flex items-center gap-1">
                  <Icon size={12} />
                  {config.label}
                </span>
              </motion.button>
            );
          })}
          
          {/* Кнопка дополнительных фильтров */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 whitespace-nowrap"
            style={{
              background: showFilters 
                ? `color-mix(in srgb, ${COLORS.admin} 25%, transparent)`
                : `color-mix(in srgb, ${COLORS.muted} 30%, transparent)`,
              color: showFilters ? COLORS.admin : COLORS.mutedForeground,
              border: `1px solid ${showFilters ? COLORS.admin : 'transparent'}`,
            }}
          >
            <span className="flex items-center gap-1">
              <Filter size={12} />
              Фильтры
              <ChevronDown 
                size={12} 
                style={{ 
                  transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} 
              />
            </span>
          </motion.button>
        </div>
        
        {/* ДОПОЛНИТЕЛЬНЫЕ ФИЛЬТРЫ */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="rounded-xl p-4 space-y-4"
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {/* Сумма */}
                <div>
                  <label style={{ color: COLORS.mutedForeground }} className="text-xs font-medium mb-2 block">
                    Сумма
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={filters.minAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                      placeholder="От"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: COLORS.muted,
                        color: COLORS.foreground,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    />
                    <input
                      type="number"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                      placeholder="До"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: COLORS.muted,
                        color: COLORS.foreground,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    />
                  </div>
                </div>
                
                {/* Дата */}
                <div>
                  <label style={{ color: COLORS.mutedForeground }} className="text-xs font-medium mb-2 block">
                    Период
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: COLORS.muted,
                        color: COLORS.foreground,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: COLORS.muted,
                        color: COLORS.foreground,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    />
                  </div>
                </div>
                
                {/* Сброс фильтров */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={resetFilters}
                  className="w-full py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: `color-mix(in srgb, ${COLORS.muted} 40%, transparent)`,
                    color: COLORS.foreground,
                  }}
                >
                  Сбросить фильтры
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              Загрузка заявок...
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
            <Shield size={48} style={{ color: COLORS.error }} className="mx-auto mb-4" />
            <p style={{ color: COLORS.error }} className="font-semibold mb-2">
              {error}
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchWithdrawals()}
              className="px-6 py-2 rounded-xl font-medium mt-2"
              style={{
                background: COLORS.primary,
                color: 'white',
              }}
            >
              Повторить
            </motion.button>
          </motion.div>
        ) : withdrawals.length === 0 ? (
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
                background: `color-mix(in srgb, ${COLORS.success} 15%, transparent)`,
              }}
            >
              <CheckCircle2 size={40} style={{ color: COLORS.success }} />
            </div>
            <h3 style={{ color: COLORS.foreground }} className="text-lg font-bold mb-2">
              {filters.status === 'PENDING' ? 'Нет ожидающих заявок' : 'Заявок нет'}
            </h3>
            <p style={{ color: COLORS.mutedForeground }} className="text-sm">
              {filters.status === 'PENDING' 
                ? 'Все заявки на вывод обработаны!' 
                : 'Пока нет заявок на вывод'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <WithdrawalCard 
                  key={withdrawal.id} 
                  withdrawal={withdrawal}
                  onApprove={handleApprove}
                  onReject={openRejectModal}
                  processing={processing}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
      
      {/* Модальное окно отклонения */}
      <AnimatePresence>
        {rejectModalOpen && (
          <RejectModal
            isOpen={rejectModalOpen}
            onClose={() => {
              setRejectModalOpen(false);
              setRejectingId(null);
            }}
            onConfirm={handleReject}
            withdrawalId={rejectingId}
            loading={processing === rejectingId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminWithdrawalsPage;


