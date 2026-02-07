import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface BlockedPageProps {
  remainingHours?: number;
  reason?: string;
  onRetry?: () => void;
}

export function BlockedPage({ remainingHours = 24, reason, onRetry }: BlockedPageProps) {
  const { theme } = useTheme();
  
  const bgColor = theme === 'dark' ? '#0a0f1e' : '#f8f9fa';
  const cardBg = theme === 'dark' ? '#0b1c3a' : '#ffffff';
  const textColor = theme === 'dark' ? '#fafafa' : '#1a1a2e';
  const mutedColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const errorColor = '#ef4444';
  const warningBg = theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: cardBg,
          borderRadius: '24px',
          padding: '40px 30px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
          boxShadow: theme === 'dark' 
            ? '0 20px 60px rgba(0, 0, 0, 0.5)' 
            : '0 20px 60px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: warningBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            border: `2px solid ${errorColor}40`,
          }}
        >
          <Shield size={40} color={errorColor} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: textColor,
            marginBottom: '12px',
          }}
        >
          Доступ заблокирован
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '14px',
            color: mutedColor,
            marginBottom: '24px',
            lineHeight: '1.6',
          }}
        >
          Ваш IP-адрес временно заблокирован из-за подозрительной активности. 
          Это мера безопасности для защиты вашего аккаунта.
        </p>

        {/* Timer Card */}
        <div
          style={{
            backgroundColor: warningBg,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            border: `1px solid ${errorColor}20`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <Clock size={20} color={errorColor} />
            <span
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: errorColor,
              }}
            >
              Время до разблокировки
            </span>
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: '700',
              color: textColor,
            }}
          >
            ~{remainingHours} ч.
          </div>
        </div>

        {/* Reason */}
        {reason && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <AlertTriangle size={18} color={mutedColor} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '12px', color: mutedColor, marginBottom: '4px' }}>
                Причина блокировки:
              </div>
              <div style={{ fontSize: '13px', color: textColor }}>
                {reason === 'Repeated rate limit violations' 
                  ? 'Слишком много запросов за короткое время'
                  : reason}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div
          style={{
            fontSize: '12px',
            color: mutedColor,
            marginBottom: '20px',
            lineHeight: '1.5',
          }}
        >
          Если вы считаете, что это ошибка, обратитесь в службу поддержки через Telegram.
        </div>

        {/* Retry Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: `1px solid ${mutedColor}40`,
              backgroundColor: 'transparent',
              color: textColor,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Попробовать снова
          </button>
        )}

        {/* Support Link */}
        <a
          href="https://t.me/SafariXCasinoBot"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: '16px',
            color: '#3b82f6',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          Связаться с поддержкой →
        </a>
      </div>
    </div>
  );
}












