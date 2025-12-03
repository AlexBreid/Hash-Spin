import { CheckCircle, Clock, ExternalLink } from 'lucide-react';

interface PaymentStatusProps {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: string;
  currency: string;
  transactionId: number;
  blockExplorer: string;
  onClose?: () => void;
}

export default function PaymentStatus({
  status,
  amount,
  currency,
  transactionId,
  blockExplorer,
  onClose,
}: PaymentStatusProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'PENDING':
        return {
          icon: <Clock size={64} className="status-icon pending" />,
          title: '⏳ Ожидаю платеж',
          message: `Обычно занимает 30-120 секунд`,
          details: `Отправьте ${amount} ${currency}`,
        };
      case 'SUCCESS':
        return {
          icon: <CheckCircle size={64} className="status-icon success" />,
          title: '✅ Успешно!',
          message: `Ваш баланс пополнен`,
          details: `+${amount} ${currency}`,
        };
      case 'FAILED':
        return {
          icon: <span className="status-icon failed">❌</span>,
          title: '❌ Ошибка платежа',
          message: 'Платеж не прошел',
          details: 'Попробуйте еще раз',
        };
      default:
        return null;
    }
  };

  const content = getStatusContent();

  return (
    <div className="payment-status">
      <div className="status-container">
        {content?.icon}
        <h2>{content?.title}</h2>
        <p className="status-message">{content?.message}</p>
        <p className="status-details">{content?.details}</p>

        {/* Ссылка на Block Explorer */}
        {status !== 'PENDING' && (
          <a
            href={`${blockExplorer}/tx/${transactionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link"
          >
            <ExternalLink size={16} />
            Просмотреть на блоке
          </a>
        )}

        {/* Кнопка закрытия */}
        {(status === 'SUCCESS' || status === 'FAILED') && onClose && (
          <button className="close-button" onClick={onClose}>
            ✓ Завершить
          </button>
        )}
      </div>
    </div>
  );
}