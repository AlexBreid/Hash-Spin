import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export function PaymentFailedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const error = searchParams.get('error');

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--background, #0f1d3a)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          padding: '32px',
          borderRadius: '24px',
          background: 'var(--card, #1f2937)',
          border: '1px solid var(--border, #3b82f640)',
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
          }}
        >
          <XCircle size={48} color="#fff" />
        </motion.div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'var(--foreground, #fafafa)',
            marginBottom: '12px',
          }}
        >
          Платеж не прошел
        </h1>

        <p
          style={{
            color: 'var(--muted-foreground, #a0aac0)',
            marginBottom: '24px',
            fontSize: '16px',
          }}
        >
          {error || 'Произошла ошибка при обработке платежа. Пожалуйста, попробуйте еще раз.'}
        </p>

        {invoiceId && (
          <div
            style={{
              padding: '12px',
              background: 'var(--card, #1f2937)',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '12px',
              color: 'var(--muted-foreground, #a0aac0)',
            }}
          >
            ID транзакции: {invoiceId}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => navigate('/account')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ArrowLeft size={20} />
            Вернуться в аккаунт
          </button>

          <button
            onClick={() => navigate('/account')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--card, #1f2937)',
              color: 'var(--foreground, #fafafa)',
              border: '1px solid var(--border, #374151)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = '1px solid #3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = '1px solid var(--border, #374151)';
            }}
          >
            <RefreshCw size={20} />
            Попробовать снова
          </button>
        </div>
      </motion.div>
    </div>
  );
}

