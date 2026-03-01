# Настройка CryptoCloud для проекта Hash-Spin

## Переменные окружения

Добавьте следующие переменные в файл `.env` в корне проекта `api/`:

```env
# CryptoCloud API настройки
CRYPTO_CLOUD_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1dWlkIjoiT0RNNE5UTT0iLCJ0eXBlIjoicHJvamVjdCIsInYiOiI0YmNmNGYxMmNhNzMyNGVjMzYyNWMwZjM1YjgxZTAyN2NkZThhNGE0MTRlMzUzMWIwYzE0NjI1MWMwOWM1MTVmIiwiZXhwIjo4ODE2Njc4MzM5N30.DvyMDzdRWNEgm8GtEOMaWT5njtiw6nAiUpUO_S6P0jo
CRYPTO_CLOUD_SHOP_ID=6cIUewIuaGohxks5
CRYPTO_CLOUD_SECRET=hyVRuoPkQIThAaRiqN784I4Dqhz3gg8Bnl3g

# URL для callback (webhook от CryptoCloud)
CRYPTO_CLOUD_CALLBACK_URL=https://safarix.vercel.app/callback

# URL вашего API сервера (для webhook)
API_BASE_URL=http://localhost:4000
# или для production:
# API_BASE_URL=https://your-domain.com
```

## Настройка Webhook в CryptoCloud

1. Войдите в личный кабинет CryptoCloud
2. Перейдите в раздел "Настройки проекта"
3. Заполните следующие поля:
   - **Ваш сайт**: `https://safarix.vercel.app/`
   - **Успешный URL**: `https://safarix.vercel.app/successful-payment`
   - **Неудачный URL**: `https://safarix.vercel.app/failed-payment`
   - **URL для уведомлений**: `https://safarix.vercel.app/callback`
   - **Формат получения POSTBACK**: `json`

4. Сохраните настройки

**Постоянная страница оплаты**: `https://pay.cryptocloud.plus/pos/6cIUewIuaGohxks5`

## API Endpoints

### Создание депозита
```
POST /api/v1/deposit/create
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amount": 100.50,
  "withBonus": true  // или false
}
```

### Проверка статуса депозита
```
GET /api/v1/deposit/status/:invoiceId
Authorization: Bearer <JWT_TOKEN>
```

### Проверка доступности бонуса
```
GET /api/v1/deposit/check-bonus
Authorization: Bearer <JWT_TOKEN>
```

### Webhook (автоматический, вызывается CryptoCloud)
```
POST /api/v1/deposit/cryptocloud/webhook
```

## Логика бонусов

### С бонусом:
- +100% к пополнению (максимум 1500 USDT)
- Требуется отыграть 10x от суммы депозита + бонуса
- Максимальный выигрыш: 3x от суммы депозита + бонуса
- Срок действия: 7 дней

### Без бонуса:
- Сумма сразу поступает на основной баланс
- Нет условий отыгрыша

## Требования для бонуса

- Минимальная сумма депозита: 10 USDT
- Пользователь должен быть зарегистрирован через реферала
- У пользователя не должно быть активного бонуса
- Бонус доступен только один раз

## Тестирование

1. Убедитесь, что все переменные окружения установлены
2. Запустите API сервер:
   ```bash
   cd api
   npm start
   ```

3. Откройте фронтенд и попробуйте создать депозит
4. Проверьте логи сервера для отладки

## Примечания

- CryptoCloud API использует JWT токен для авторизации
- Webhook должен быть доступен из интернета (используйте ngrok для разработки)
- Все суммы в USDT
- Статусы платежей обновляются автоматически через webhook

