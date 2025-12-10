import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ArrowLeft, Zap, Gift, Users, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const faqData = [
  {
    question: "Как играть в Сапёр?",
    answer: "Цель игры - найти все мины на игровом поле, не наступив на них. Нажимайте на клетки, чтобы открыть их. Числа показывают количество мин в соседних клетках."
  },
  {
    question: "Что такое игра Краш?",
    answer: "Краш - это игра на удачу, где нужно вовремя забрать выигрыш до того, как график 'упадёт'. Чем дольше ждёте, тем больше множитель, но и больше риск."
  },
  {
    question: "Как работает 'Курица через дорогу'?",
    answer: "Помогите курице безопасно перейти дорогу, избегая препятствий. Тапайте по экрану, чтобы двигаться вперёд, и собирайте бонусы на пути."
  },
  {
    question: "Правила игры 'Мячики падают на иксы'?",
    answer: "Мячики падают сверху и попадают на множители. Ваша задача - угадать, в какую зону упадёт мячик. Чем выше множитель, тем больше очков вы получите."
  },
  {
    question: "Как получить больше очков?",
    answer: "Играйте регулярно, выполняйте ежедневные задания, участвуйте в турнирах и приглашайте друзей. За каждое достижение вы получаете дополнительные очки."
  },
  {
    question: "Что делать, если забыл пароль?",
    answer: "Нажмите 'Забыли пароль?' на странице входа и введите ваш email. Вы получите ссылку для сброса пароля в течение нескольких минут. Проверьте папку спам."
  },
  {
    question: "Как вывести деньги?",
    answer: "Перейди в раздел 'Вывод', выбери способ вывода, введи сумму и следуй инструкциям. Минимальная сумма вывода зависит от выбранного способа. Выплаты обрабатываются в течение 24 часов."
  },
  {
    question: "Какие способы пополнения доступны?",
    answer: "Мы поддерживаем карты, кошельки, крипто и другие способы. Выбери удобный для тебя способ в разделе 'Пополнение'. Средства поступают мгновенно или в течение нескольких минут."
  }
];

export function SupportPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const section = searchParams.get('section');

  return (
    <div className="pb-24 pt-6 px-4">
      {/* BONUS CONDITIONS SECTION */}
      {section === 'bonus' && (
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/support')}
            variant="ghost"
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Условия Бонуса
            </h1>
            <p className="text-zinc-400">Полная информация о стартовом бонусе +100%</p>
          </div>

          <div className="space-y-4">
            {/* Main Bonus Card */}
            <Card className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">+100% БОНУС К ДЕПОЗИТУ</h2>
                  <p className="text-yellow-300 text-sm">На первое пополнение счёта</p>
                </div>
              </div>
            </Card>

            {/* How to get */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Как получить бонус?
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                  <div>
                    <p className="text-white font-semibold">Введи реферальный код</p>
                    <p className="text-zinc-400 text-sm">При регистрации или в профиле</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p className="text-white font-semibold">Пополни счёт</p>
                    <p className="text-zinc-400 text-sm">Минимум $10, максимум бонуса $500</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p className="text-white font-semibold">Получи бонус автоматически</p>
                    <p className="text-zinc-400 text-sm">Сразу после пополнения счёта</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Wagering Requirements */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Условия Отыгрыша
              </h3>
              <div className="space-y-3 text-zinc-300">
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                  <p className="text-white font-semibold mb-2">Требуемый коэффициент отыгрыша: x10</p>
                  <p className="text-sm">Тебе нужно отыграть сумму в размере x10 от суммы пополнения вместе с бонусом</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm"><span className="text-white font-semibold">Пример:</span></p>
                  <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 p-3 rounded-lg border border-orange-500/20">
                    <p className="text-sm">Ты пополнил счёт на $100</p>
                    <p className="text-sm">Ты получил бонус +$100</p>
                    <p className="text-white font-semibold text-sm my-2">Всего на счёте: $200</p>
                    <p className="text-yellow-300 font-semibold text-sm">Нужно отыграть: $200 × 10 = $2,000</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-white font-semibold">Что учитывается при отыгрыше?</p>
                  <ul className="space-y-1 text-sm">
                    <li>✓ Все ставки в играх (Краш, Сапёр и т.д.)</li>
                    <li>✓ Выигрыши и проигрыши</li>
                    <li>✓ Множители в краш игре</li>
                    <li>✗ Вывод средств НЕ сбрасывает прогресс</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Important Notes */}
            <Card className="p-6 bg-red-500/10 border-red-500/20">
              <h3 className="font-bold text-lg text-white mb-3">⚠️ Важные условия</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>• Бонус действует только один раз на аккаунт</li>
                <li>• Требуется подтверждение email и телефона</li>
                <li>• Минимальная ставка: $1</li>
                <li>• Максимальная ставка при использовании бонуса: $50</li>
                <li>• Бонус действует 30 дней с момента активации</li>
                <li>• При нарушении правил бонус будет отменён</li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* REFERRAL CONDITIONS SECTION */}
      {section === 'referral' && (
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/support')}
            variant="ghost"
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Программа Рефералов
            </h1>
            <p className="text-zinc-400">Заработок на приглашении друзей – пожизненно</p>
          </div>

          <div className="space-y-4">
            {/* Main Referral Card */}
            <Card className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">ПРОГРАММА РЕФЕРАЛОВ</h2>
                  <p className="text-purple-300 text-sm">30% от преимущества казино</p>
                </div>
              </div>
            </Card>

            {/* How it Works */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Как это работает?
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                  <div>
                    <p className="text-white font-semibold">Поделись своим кодом</p>
                    <p className="text-zinc-400 text-sm">Дай реферальный код друзьям</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p className="text-white font-semibold">Друзья регистрируются</p>
                    <p className="text-zinc-400 text-sm">Они вводят твой код при регистрации</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p className="text-white font-semibold">Твой реферал играет</p>
                    <p className="text-zinc-400 text-sm">Каждая ставка добавляет в твой доход</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">4</div>
                  <div>
                    <p className="text-white font-semibold">Получай комиссию</p>
                    <p className="text-zinc-400 text-sm">Выводи доход в любой момент</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Commission Formula */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Формула расчета комиссии
              </h3>
              <div className="space-y-4 text-zinc-300">
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                  <p className="text-white font-semibold mb-3 text-center text-lg">
                    (Преимущество казино × Оборот реферала ÷ 2) × 30%
                  </p>
                  <div className="space-y-2 text-sm">
                    <p>• <span className="text-cyan-400 font-semibold">Преимущество казино</span> = сумма прибыли, которую система получает от игры</p>
                    <p>• <span className="text-cyan-400 font-semibold">Оборот реферала</span> = общая сумма ставок твоего реферала</p>
                    <p>• <span className="text-cyan-400 font-semibold">30%</span> = твоя комиссия</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Detailed Example */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4">📊 Подробный пример</h3>
              <div className="space-y-4 text-zinc-300">
                <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 p-4 rounded-lg border border-orange-500/20">
                  <p className="text-sm mb-3"><span className="text-white font-semibold">Сценарий:</span> Твой реферал сделал 10 ставок по $100</p>
                  
                  <div className="space-y-2 text-sm bg-zinc-900/50 p-3 rounded mt-3">
                    <p><span className="text-cyan-400">Оборот реферала</span> = $100 × 10 = <span className="text-white font-semibold">$1,000</span></p>
                    <p><span className="text-cyan-400">Преимущество казино</span> (RTP 97%) = <span className="text-white font-semibold">$30</span></p>
                    <p className="text-zinc-400 text-xs mt-2 pt-2 border-t border-zinc-700">
                      (При RTP 97% казино оставляет себе 3% от оборота = $1,000 × 3% = $30)
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-orange-500/20">
                    <p className="text-white font-semibold mb-2">Расчет твоей комиссии:</p>
                    <p className="text-sm">($30 × $1,000 ÷ 2) × 30% = <span className="text-yellow-300 font-bold">$450</span></p>
                    <p className="text-xs text-zinc-400 mt-2">($15,000 ÷ 2) × 30% = $7,500 × 30% = $450</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4 rounded-lg border border-blue-500/20">
                  <p className="text-sm"><span className="text-white font-semibold">Ещё пример:</span> Реферал проиграл $500</p>
                  
                  <div className="space-y-2 text-sm bg-zinc-900/50 p-3 rounded mt-3">
                    <p><span className="text-cyan-400">Оборот</span> = <span className="text-white font-semibold">$500</span></p>
                    <p><span className="text-cyan-400">Преимущество казино</span> = $500 × 3% = <span className="text-white font-semibold">$15</span></p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-500/20">
                    <p className="text-white font-semibold mb-2">Твоя комиссия:</p>
                    <p className="text-sm">($15 × $500 ÷ 2) × 30% = <span className="text-yellow-300 font-bold">$112.50</span></p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Key Points */}
            <Card className="p-6 bg-green-500/10 border-green-500/20">
              <h3 className="font-bold text-lg text-white mb-3">✅ Важные моменты</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>• Комиссия зависит от <span className="text-green-300 font-semibold">реального заработка казино</span></li>
                <li>• Чем больше оборот реферала, тем больше твой доход</li>
                <li>• Выплачивается на все ставки реферала автоматически</li>
                <li>• Нет ограничений по количеству рефералов</li>
                <li>• Комиссия начисляется <span className="text-green-300 font-semibold">пожизненно</span></li>
                <li>• Минимум для вывода: зависит от баланса</li>
              </ul>
            </Card>

            {/* RTP Explanation */}
            <Card className="p-6 bg-blue-500/10 border-blue-500/20">
              <h3 className="font-bold text-lg text-white mb-3">🎮 Что такое RTP и преимущество казино?</h3>
              <p className="text-zinc-300 text-sm mb-3">
                <span className="text-blue-300 font-semibold">RTP (Return to Player)</span> – это процент денег, который игра возвращает игроку в долгосрочной перспективе.
              </p>
              <div className="bg-zinc-900/50 p-3 rounded text-sm text-zinc-300 space-y-2">
                <p><span className="text-white font-semibold">Например:</span> RTP 97% означает:</p>
                <p>• Игроки возвращают 97% от всех ставок</p>
                <p>• Казино оставляет себе 3% (преимущество казино)</p>
                <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-700">
                  При $1,000 оборота: казино получает $30 прибыли, это становится базой для твоей комиссии
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* DEFAULT SUPPORT PAGE - FAQ ONLY */}
      {!section && (
        <>
          <div className="mb-6">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
              Центр поддержки
            </h1>
            <p className="text-zinc-400 text-sm mt-2">Ответы на все твои вопросы</p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/20 cursor-pointer hover:border-yellow-500/40 transition-all"
              onClick={() => navigate('/support?section=bonus')}>
              <div className="flex flex-col items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <p className="text-xs font-semibold text-center text-white">Бонус</p>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/20 cursor-pointer hover:border-purple-500/40 transition-all"
              onClick={() => navigate('/support?section=referral')}>
              <div className="flex flex-col items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <p className="text-xs font-semibold text-center text-white">Рефералы</p>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border-cyan-500/20">
              <div className="flex flex-col items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <p className="text-xs font-semibold text-center text-white">FAQ</p>
              </div>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card className="p-6">
            <h2 className="font-bold text-xl mb-4 text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Часто задаваемые вопросы
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-zinc-700/50">
                  <AccordionTrigger className="text-left font-semibold hover:text-cyan-400 transition-colors text-white">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-zinc-300 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>

          {/* Help Card */}
          <Card className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20 mt-6">
            <div className="flex gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-sm">
                <p className="text-white font-semibold mb-1">Не нашёл ответ?</p>
                <p className="text-zinc-400 text-xs">Если твой вопрос не освещён в FAQ, напиши нам через чат в приложении</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}