import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Shield, 
  Zap, 
  Gift, 
  ChevronRight, 
  Trophy,
  Lock,
  FileText,
  Star,
  Gamepad2,
  Bitcoin,
  Clock,
  X,
  Users
} from 'lucide-react';

// Изображения игр
import imgMines from '../../assets/task_01kbn75ywbfpz83qvdbm3c9sbx_1764870071_img_1.webp';
import imgCrash from '../../assets/task_01kbn7a4xqenbt8px4rsk9zexr_1764870172_img_0.webp';
import imgPlinko from '../../assets/plinko.png';

interface WelcomePageProps {
  onEnter: () => void;
}

const TELEGRAM_BOT_URL = 'https://t.me/SafariUpbot';

// Цвета темы
const COLORS = {
  background: '#0a0e1a',
  card: '#111827',
  primary: '#3b82f6',
  success: '#10b981',
  accent: '#8b5cf6',
  gold: '#f59e0b',
  foreground: '#f9fafb',
  mutedForeground: '#9ca3af',
  border: '#1f2937',
};

// Игры для показа
const FEATURED_GAMES = [
  { id: 'minesweeper', title: 'Сапёр', image: imgMines, description: 'Классическая логическая игра' },
  { id: 'crash', title: 'Краш', image: imgCrash, description: 'Поймай множитель до краха!' },
  { id: 'plinko', title: 'Плинко', image: imgPlinko, description: 'Шарик падает - ты выигрываешь' },
];

// Преимущества казино
const FEATURES = [
  { icon: <Bitcoin className="w-6 h-6" />, title: 'Криптовалюты', desc: 'Мгновенные депозиты и выводы в USDT' },
  { icon: <Shield className="w-6 h-6" />, title: 'Безопасность', desc: 'Доказуемо честные игры' },
  { icon: <Users className="w-6 h-6" />, title: 'Реферальная программа', desc: 'Зарабатывайте на приглашенных друзьях' },
  { icon: <Clock className="w-6 h-6" />, title: '24/7', desc: 'Поддержка круглосуточно' },
];

export function WelcomePage({ onEnter }: WelcomePageProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  return (
    <div 
      className="min-h-screen pb-12"
      style={{ backgroundColor: COLORS.background }}
    >
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative px-6 pt-12 pb-8"
      >
        {/* Фоновое свечение */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-purple-500/20 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
        
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative text-center"
        >
          {/* Логотип */}
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
              boxShadow: `0 0 40px ${COLORS.primary}40`
            }}
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>

          <h1 className="text-4xl font-black mb-3">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              SafariUp Casino
            </span>
          </h1>
          
          <p style={{ color: COLORS.mutedForeground }} className="text-lg mb-2">
            Крипто-казино нового поколения
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: COLORS.gold }}>
            <Star className="w-4 h-4 fill-current" />
            <span>Доказуемо честные игры</span>
            <Star className="w-4 h-4 fill-current" />
          </div>
        </motion.div>
      </motion.div>

      {/* Преимущества */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-4 mb-8"
      >
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-4 rounded-2xl border"
              style={{ 
                backgroundColor: COLORS.card,
                borderColor: COLORS.border
              }}
            >
              <div style={{ color: COLORS.primary }} className="mb-2">
                {feature.icon}
              </div>
              <h3 style={{ color: COLORS.foreground }} className="font-bold text-sm mb-1">
                {feature.title}
              </h3>
              <p style={{ color: COLORS.mutedForeground }} className="text-xs">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>


      {/* Информация */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="px-4 mb-8"
      >
        <div 
          className="p-4 rounded-2xl border"
          style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
        >
          <h3 style={{ color: COLORS.foreground }} className="font-bold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: COLORS.gold }} />
            Почему SafariUp?
          </h3>
          
          <ul className="space-y-2 text-sm" style={{ color: COLORS.mutedForeground }}>
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.success }} />
              <span>Мгновенные выплаты в криптовалюте без верификации</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.primary }} />
              <span>Provably Fair - проверяемая честность каждой игры</span>
            </li>
            <li className="flex items-start gap-2">
              <Gift className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.accent }} />
              <span>Щедрая реферальная программа - 30% от оборота ваших рефералов</span>
            </li>
          </ul>
        </div>
      </motion.div>

      {/* Кнопка входа */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        className="px-4 mb-6"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onEnter}
          className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 text-white"
          style={{ 
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            boxShadow: `0 4px 20px ${COLORS.primary}40`
          }}
        >
          <Sparkles className="w-5 h-5" />
          Начать играть
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Политики */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="px-4 mb-6"
      >
        <div className="flex items-center justify-center gap-4 text-xs" style={{ color: COLORS.mutedForeground }}>
          <button 
            onClick={() => setShowTerms(true)}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <FileText className="w-3 h-3" />
            Условия использования
          </button>
          <span>•</span>
          <button 
            onClick={() => setShowPrivacy(true)}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Lock className="w-3 h-3" />
            Политика конфиденциальности
          </button>
        </div>
      </motion.div>

      {/* Предупреждение 18+ */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="px-4 pb-12"
      >
        <div 
          className="p-4 rounded-xl text-center text-xs"
          style={{ 
            backgroundColor: '#ef444420',
            border: '1px solid #ef444440',
            color: '#fca5a5'
          }}
        >
          <p className="font-bold mb-1">⚠️ Только для лиц старше 18 лет</p>
          <p style={{ color: COLORS.mutedForeground }}>
            Играйте ответственно. Азартные игры могут вызывать зависимость.
          </p>
        </div>
      </motion.div>

      {/* Модальное окно - Условия использования */}
      <AnimatePresence>
        {showTerms && (
          <PolicyModal 
            title="Условия использования"
            onClose={() => setShowTerms(false)}
          >
            <TermsContent />
          </PolicyModal>
        )}
      </AnimatePresence>

      {/* Модальное окно - Политика конфиденциальности */}
      <AnimatePresence>
        {showPrivacy && (
          <PolicyModal 
            title="Политика конфиденциальности"
            onClose={() => setShowPrivacy(false)}
          >
            <PrivacyContent />
          </PolicyModal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Модальное окно для политик
function PolicyModal({ 
  title, 
  children, 
  onClose 
}: { 
  title: string; 
  children: React.ReactNode; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="relative w-full max-w-lg max-h-[80vh] rounded-t-3xl md:rounded-3xl overflow-hidden"
        style={{ backgroundColor: COLORS.card }}
      >
        {/* Header */}
        <div 
          className="sticky top-0 z-10 flex items-center justify-between p-4 border-b"
          style={{ backgroundColor: COLORS.card, borderColor: COLORS.border }}
        >
          <h2 style={{ color: COLORS.foreground }} className="text-lg font-bold">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: COLORS.mutedForeground }} />
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-4 overflow-y-auto text-sm leading-relaxed"
          style={{ color: COLORS.mutedForeground, maxHeight: 'calc(80vh - 60px)' }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// Содержимое условий использования
function TermsContent() {
  return (
    <div className="space-y-4">
      <p style={{ color: COLORS.foreground }} className="font-bold">
        Последнее обновление: Декабрь 2024
      </p>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">1. Общие положения</h3>
        <p>
          Добро пожаловать в SafariUp Casino. Используя наш сервис, вы соглашаетесь с настоящими условиями.
          SafariUp Casino предоставляет онлайн-игры на криптовалюту исключительно в развлекательных целях.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">2. Право на использование</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Вам должно быть не менее 18 лет</li>
          <li>Вы должны проживать в юрисдикции, где онлайн-гемблинг разрешён</li>
          <li>Вы не должны быть ограничены в праве на азартные игры</li>
          <li>Вы несёте ответственность за соблюдение местного законодательства</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">3. Регистрация и аккаунт</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Каждый пользователь может иметь только один аккаунт</li>
          <li>Информация при регистрации должна быть достоверной</li>
          <li>Вы несёте ответственность за безопасность своего аккаунта</li>
          <li>Передача аккаунта третьим лицам запрещена</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">4. Депозиты и выводы</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Минимальный депозит: 1 USDT</li>
          <li>Минимальный вывод: 5 USDT</li>
          <li>Все транзакции проводятся в криптовалюте (USDT, BTC, ETH и др.)</li>
          <li>Время обработки вывода: до 24 часов</li>
          <li>Казино оставляет за собой право запросить верификацию при подозрении на мошенничество</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">5. Реферальная программа</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Приглашайте друзей и получайте комиссию с их ставок</li>
          <li>Комиссия составляет 30% от преимущества казино каждого реферала</li>
          <li>Рефералы получают бонус +100% на первый депозит при регистрации по вашей ссылке</li>
          <li>Комиссия начисляется пожизненно</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">6. Честная игра (Provably Fair)</h3>
        <p>
          Все игры используют криптографически защищённые алгоритмы, 
          позволяющие игрокам самостоятельно проверить честность каждого раунда.
          Server seed и client seed доступны для верификации после каждой игры.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">7. Запрещённые действия</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Использование ботов и автоматизированного ПО</li>
          <li>Эксплуатация багов и уязвимостей</li>
          <li>Сговор с другими игроками</li>
          <li>Отмывание денег</li>
          <li>Мультиаккаунтинг</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">8. Ответственная игра</h3>
        <p>
          Мы призываем играть ответственно. Установите лимиты на депозиты и время игры.
          Если вы чувствуете, что теряете контроль, обратитесь в службу поддержки для 
          самоисключения.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">9. Ограничение ответственности</h3>
        <p>
          SafariUp Casino не несёт ответственности за убытки, возникшие в результате 
          использования сервиса. Все игры носят развлекательный характер, и вы играете 
          на свой страх и риск.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">10. Изменения условий</h3>
        <p>
          Мы оставляем за собой право изменять настоящие условия в любое время.
          Продолжая использовать сервис после изменений, вы принимаете новые условия.
        </p>
      </section>
    </div>
  );
}

// Содержимое политики конфиденциальности
function PrivacyContent() {
  return (
    <div className="space-y-4">
      <p style={{ color: COLORS.foreground }} className="font-bold">
        Последнее обновление: Декабрь 2024
      </p>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">1. Введение</h3>
        <p>
          SafariUp Casino уважает вашу конфиденциальность и стремится защитить ваши персональные данные.
          Настоящая политика описывает, как мы собираем, используем и защищаем вашу информацию.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">2. Какие данные мы собираем</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Telegram ID и имя пользователя</li>
          <li>Адреса криптовалютных кошельков</li>
          <li>История транзакций и игровая активность</li>
          <li>IP-адрес и данные устройства</li>
          <li>Реферальные данные</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">3. Как мы используем данные</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Предоставление игровых услуг</li>
          <li>Обработка депозитов и выводов</li>
          <li>Предотвращение мошенничества</li>
          <li>Улучшение качества сервиса</li>
          <li>Начисление бонусов и реферальных комиссий</li>
          <li>Связь с вами по важным вопросам</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">4. Хранение данных</h3>
        <p>
          Ваши данные хранятся на защищённых серверах с использованием современных 
          методов шифрования. Мы храним данные столько, сколько необходимо для 
          предоставления услуг и выполнения юридических обязательств.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">5. Передача данных третьим лицам</h3>
        <p>Мы не продаём и не передаём ваши данные третьим лицам, за исключением:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Платёжных провайдеров для обработки транзакций</li>
          <li>По требованию правоохранительных органов</li>
          <li>Для защиты наших законных интересов</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">6. Cookies и аналитика</h3>
        <p>
          Мы используем cookies и аналитические инструменты для улучшения работы сервиса.
          Вы можете отключить cookies в настройках браузера, но это может ограничить 
          функциональность сайта.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">7. Ваши права</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Доступ к вашим персональным данным</li>
          <li>Исправление неточных данных</li>
          <li>Удаление данных (право на забвение)</li>
          <li>Ограничение обработки</li>
          <li>Перенос данных</li>
        </ul>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">8. Безопасность</h3>
        <p>
          Мы применяем отраслевые стандарты безопасности: SSL-шифрование, 
          двухфакторную аутентификацию, регулярные аудиты безопасности.
          Однако ни одна система не является абсолютно безопасной.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">9. Изменения политики</h3>
        <p>
          Мы можем обновлять настоящую политику. Существенные изменения будут 
          доведены до вашего сведения через уведомления в приложении.
        </p>
      </section>

      <section>
        <h3 style={{ color: COLORS.foreground }} className="font-bold mb-2">10. Контакты</h3>
        <p>
          По вопросам конфиденциальности обращайтесь в нашу службу поддержки 
          через Telegram-бота или на странице поддержки.
        </p>
      </section>
    </div>
  );
}

export default WelcomePage;
