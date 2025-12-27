import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoice_id');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // Через 3 секунды автоматически перенаправляем на страницу аккаунта
    const timer = setTimeout(() => {
      navigate('/account');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

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
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
          }}
        >
          <CheckCircle size={48} color="#fff" />
        </motion.div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'var(--foreground, #fafafa)',
            marginBottom: '12px',
          }}
        >
          Платеж успешно выполнен!
        </h1>

        <p
          style={{
            color: 'var(--muted-foreground, #a0aac0)',
            marginBottom: '24px',
            fontSize: '16px',
          }}
        >
          Ваш баланс пополнен
          {amount && (
            <span style={{ color: 'var(--foreground, #fafafa)', fontWeight: 'bold' }}>
              {' '}
              на {parseFloat(amount).toFixed(2)} USDT
            </span>
          )}
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

        <div
          style={{
            color: 'var(--muted-foreground, #a0aac0)',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          Перенаправление через 3 секунды...
        </div>

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
      </motion.div>
    </div>
  );
}

