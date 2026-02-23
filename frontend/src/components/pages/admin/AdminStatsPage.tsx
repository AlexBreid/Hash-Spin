import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  UserCheck,
  Wallet,
  Award
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  blockedUsers: number;
  registrationsByDay: Array<{ date: string; count: number }>;
  topUsers: Array<{
    id: number;
    username: string;
    firstName?: string;
    telegramId: string;
    totalBalance: number;
    createdAt: string;
  }>;
}

interface DepositStats {
  total: {
    amount: number;
    count: number;
    average: number;
  };
  today: {
    amount: number;
    count: number;
  };
  week: {
    amount: number;
    count: number;
  };
  month: {
    amount: number;
    count: number;
  };
  depositsByDay: Array<{
    date: string;
    totalAmount: number;
    count: number;
  }>;
  depositsByCurrency: Array<{
    tokenId: number;
    symbol: string;
    name: string;
    totalAmount: number;
    count: number;
  }>;
  topDepositors: Array<{
    userId: number;
    username: string;
    firstName?: string;
    telegramId: string;
    totalAmount: number;
    count: number;
  }>;
}

export function AdminStatsPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'deposits'>('users');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [depositStats, setDepositStats] = useState<DepositStats | null>(null);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики пользователей');
      }

      const data = await response.json();
      if (data.success) {
        setUserStats(data.data);
      } else {
        throw new Error(data.error || 'Ошибка загрузки данных');
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки статистики');
    }
  };

  const fetchDepositStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats/deposits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки статистики пополнений');
      }

      const data = await response.json();
      if (data.success) {
        setDepositStats(data.data);
      } else {
        throw new Error(data.error || 'Ошибка загрузки данных');
      }
    } catch (error) {
      console.error('Error fetching deposit stats:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка загрузки статистики');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchUserStats(), fetchDepositStats()]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'users') {
      await fetchUserStats();
    } else {
      await fetchDepositStats();
    }
    setRefreshing(false);
    toast.success('Статистика обновлена');
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      loadData();
    }
  }, [isAuthenticated, token]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return `$${formatNumber(num)}`;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}>
        <Loader2 size={48} className="animate-spin" style={{ color: '#10b981' }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '16px',
      paddingBottom: '100px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="sm"
            style={{
              color: '#9ca3af',
              padding: '8px'
            }}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#fff',
            margin: 0
          }}>
            Статистика
          </h1>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          style={{
            borderColor: '#374151',
            color: '#9ca3af'
          }}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        background: '#1f2937',
        padding: '4px',
        borderRadius: '12px'
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'users' ? '#10b981' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: activeTab === 'users' ? '#000' : '#9ca3af',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} />
          Пользователи
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'deposits' ? '#10b981' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: activeTab === 'deposits' ? '#000' : '#9ca3af',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <DollarSign size={18} />
          Пополнения
        </button>
      </div>

      {/* Users Stats */}
      {activeTab === 'users' && userStats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Всего</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>
                {userStats.totalUsers.toLocaleString('ru-RU')}
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Активных</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                {userStats.activeUsers.toLocaleString('ru-RU')}
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.05) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Сегодня</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#eab308' }}>
                {userStats.newUsersToday.toLocaleString('ru-RU')}
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>За неделю</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6' }}>
                {userStats.newUsersWeek.toLocaleString('ru-RU')}
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>За месяц</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ec4899' }}>
                {userStats.newUsersMonth.toLocaleString('ru-RU')}
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Заблокировано</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444' }}>
                {userStats.blockedUsers.toLocaleString('ru-RU')}
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card style={{
            background: '#1f2937',
            border: '1px solid #374151',
            padding: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '16px'
            }}>
              Регистрации за последние 30 дней
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              height: '200px',
              marginTop: '20px'
            }}>
              {userStats.registrationsByDay.map((day, index) => {
                const maxCount = Math.max(...userStats.registrationsByDay.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: day.count > 0 ? '4px' : '0',
                        transition: 'all 0.3s'
                      }}
                      title={`${day.date}: ${day.count}`}
                    />
                    {index % 5 === 0 && (
                      <div style={{
                        fontSize: '9px',
                        color: '#6b7280',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Users */}
          {userStats.topUsers.length > 0 && (
            <Card style={{
              background: '#1f2937',
              border: '1px solid #374151',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Award size={20} />
                Топ пользователей по балансу
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userStats.topUsers.map((user, index) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#111827',
                      borderRadius: '8px',
                      border: '1px solid #374151'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: index < 3 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: '600' }}>
                          {user.username || user.firstName || user.telegramId}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {user.telegramId}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#10b981', fontWeight: '600' }}>
                        {formatCurrency(user.totalBalance)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Deposits Stats */}
      {activeTab === 'deposits' && depositStats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Всего</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                {formatCurrency(depositStats.total.amount)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                {depositStats.total.count} операций
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Сегодня</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>
                {formatCurrency(depositStats.today.amount)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                {depositStats.today.count} операций
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.05) 100%)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>За неделю</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#eab308' }}>
                {formatCurrency(depositStats.week.amount)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                {depositStats.week.count} операций
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>За месяц</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6' }}>
                {formatCurrency(depositStats.month.amount)}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                {depositStats.month.count} операций
              </div>
            </Card>
            <Card style={{
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.2)',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Средний чек</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#ec4899' }}>
                {formatCurrency(depositStats.total.average)}
              </div>
            </Card>
          </div>

          {/* Chart */}
          <Card style={{
            background: '#1f2937',
            border: '1px solid #374151',
            padding: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#fff',
              marginBottom: '16px'
            }}>
              Пополнения за последние 30 дней
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              height: '200px',
              marginTop: '20px'
            }}>
              {depositStats.depositsByDay.map((day, index) => {
                const maxAmount = Math.max(...depositStats.depositsByDay.map(d => d.totalAmount), 1);
                const height = (day.totalAmount / maxAmount) * 100;
                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: day.totalAmount > 0 ? '4px' : '0',
                        transition: 'all 0.3s'
                      }}
                      title={`${day.date}: ${formatCurrency(day.totalAmount)} (${day.count} операций)`}
                    />
                    {index % 5 === 0 && (
                      <div style={{
                        fontSize: '9px',
                        color: '#6b7280',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        {new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* By Currency */}
          {depositStats.depositsByCurrency.length > 0 && (
            <Card style={{
              background: '#1f2937',
              border: '1px solid #374151',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
                marginBottom: '16px'
              }}>
                По валютам
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {depositStats.depositsByCurrency.map((currency) => (
                  <div
                    key={currency.tokenId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#111827',
                      borderRadius: '8px',
                      border: '1px solid #374151'
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: '600' }}>
                        {currency.symbol} - {currency.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {currency.count} операций
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#10b981', fontWeight: '600' }}>
                        {formatCurrency(currency.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top Depositors */}
          {depositStats.topDepositors.length > 0 && (
            <Card style={{
              background: '#1f2937',
              border: '1px solid #374151',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#fff',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Award size={20} />
                Топ пополнителей
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {depositStats.topDepositors.map((user, index) => (
                  <div
                    key={user.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#111827',
                      borderRadius: '8px',
                      border: '1px solid #374151'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: index < 3 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px'
                      }}>
                        {index + 1}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: '600' }}>
                          {user.username || user.firstName || user.telegramId}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {user.count} пополнений
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#3b82f6', fontWeight: '600' }}>
                        {formatCurrency(user.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

