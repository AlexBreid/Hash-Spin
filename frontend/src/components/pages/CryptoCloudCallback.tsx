import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function CryptoCloudCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState('Обработка платежа...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Получаем параметры из URL (CryptoCloud редиректит с параметрами)
        const invoiceId = searchParams.get('invoice_id') || searchParams.get('uuid');
        const paymentStatus = searchParams.get('status');
        const orderId = searchParams.get('order_id');

        console.log('🪝 [CALLBACK] Processing CryptoCloud callback:', {
          invoiceId,
          status: paymentStatus,
          orderId,
          allParams: Object.fromEntries(searchParams.entries())
        });

        // Если есть параметры от CryptoCloud - отправляем на бек
        if (invoiceId || orderId) {
          // Формируем данные для бека
          const webhookData = {
            invoice_id: invoiceId,
            uuid: invoiceId,
            status: paymentStatus || 'success',
            order_id: orderId,
            // Передаём все параметры
            ...Object.fromEntries(searchParams.entries())
          };

          console.log('🪝 [CALLBACK] Sending to backend:', webhookData);

          // Отправляем на бек webhook endpoint
          const response = await fetch(`${API_BASE_URL}/api/v1/deposit/cryptocloud/webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          });

          const result = await response.json();
          console.log('🪝 [CALLBACK] Backend response:', result);

          if (result.success && result.processed) {
            setStatus('success');
            setMessage('Платёж успешно обработан!');
            
            // Редирект на страницу успеха через 2 сек
            setTimeout(() => {
              navigate('/successful-payment');
            }, 2000);
          } else {
            // Проверяем статус депозита напрямую
            await checkDepositStatus(invoiceId);
          }
        } else {
          // Нет параметров - проверяем есть ли pending депозит
          await checkLatestDeposit();
        }

      } catch (error) {
        console.error('❌ [CALLBACK] Error:', error);
        setStatus('error');
        setMessage('Ошибка обработки платежа');
        
        setTimeout(() => {
          navigate('/failed-payment');
        }, 2000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  // Проверяем статус конкретного депозита
  const checkDepositStatus = async (invoiceId: string | null) => {
    if (!invoiceId) {
      setStatus('error');
      setMessage('ID счёта не найден');
      return;
    }

    try {
      const token = localStorage.getItem('casino_jwt_token') 
        || localStorage.getItem('authToken') 
        || localStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/status/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('🪝 [CALLBACK] Deposit status:', data);

      if (data.success) {
        const depositStatus = data.data.status;
        
        if (depositStatus === 'success' || depositStatus === 'paid' || depositStatus === 'completed') {
          setStatus('success');
          setMessage('Платёж успешно обработан!');
          setTimeout(() => navigate('/successful-payment'), 2000);
        } else if (depositStatus === 'pending' || depositStatus === 'created') {
          setMessage('Ожидание подтверждения платежа...');
          // Повторяем проверку через 3 сек
          setTimeout(() => checkDepositStatus(invoiceId), 3000);
        } else {
          setStatus('error');
          setMessage('Платёж не прошёл');
          setTimeout(() => navigate('/failed-payment'), 2000);
        }
      }
    } catch (error) {
      console.error('❌ [CALLBACK] Error checking status:', error);
    }
  };

  // Проверяем последний депозит пользователя
  const checkLatestDeposit = async () => {
    try {
      const token = localStorage.getItem('casino_jwt_token') 
        || localStorage.getItem('authToken') 
        || localStorage.getItem('token');

      if (!token) {
        setStatus('error');
        setMessage('Необходима авторизация');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/deposit/history?limit=1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.data.deposits.length > 0) {
        const latestDeposit = data.data.deposits[0];
        await checkDepositStatus(latestDeposit.invoiceId);
      } else {
        setStatus('error');
        setMessage('Депозит не найден');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('❌ [CALLBACK] Error:', error);
      setStatus('error');
      setMessage('Ошибка проверки платежа');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        {/* Иконка статуса */}
        <div className="mb-6">
          {status === 'processing' && (
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-10 h-10 text-white" />
            </div>
          )}
        </div>

        {/* Заголовок */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {status === 'processing' && 'Обработка платежа'}
          {status === 'success' && 'Успешно!'}
          {status === 'error' && 'Ошибка'}
        </h1>

        {/* Сообщение */}
        <p className="text-muted-foreground mb-6">{message}</p>

        {/* Кнопка возврата */}
        {status !== 'processing' && (
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            На главную
          </button>
        )}
      </div>
    </div>
  );
}

export { CryptoCloudCallback };
