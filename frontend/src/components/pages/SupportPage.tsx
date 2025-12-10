import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { MessageCircle, Mail, Phone, Clock, Headphones, ArrowLeft, Zap, Gift, Users } from 'lucide-react';
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
                  <p className="text-sm">Тебе нужно отыграть сумму бонуса в размере x10 от суммы пополнения вместе с бонусом</p>
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

            {/* Support */}
            <Card className="p-6 bg-blue-500/10 border-blue-500/20">
              <h3 className="font-bold text-lg text-white mb-3">Остались вопросы?</h3>
              <p className="text-zinc-400 text-sm mb-4">Наша команда поддержки доступна 24/7 и с удовольствием ответит на все твои вопросы</p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Связаться с поддержкой
              </Button>
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
                  <h2 className="text-2xl font-black text-white mb-1">30% КОМИССИЯ</h2>
                  <p className="text-purple-300 text-sm">От оборота каждого реферала</p>
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
                    <p className="text-white font-semibold">Ты получаешь комиссию</p>
                    <p className="text-zinc-400 text-sm">30% от их прибыли автоматически</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">4</div>
                  <div>
                    <p className="text-white font-semibold">Выводи доход</p>
                    <p className="text-zinc-400 text-sm">В любое время без комиссии</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Commission Structure */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Структура Комиссий
              </h3>
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4 rounded-lg border border-cyan-500/20">
                  <p className="text-white font-semibold mb-2">🎯 Базовая ставка: 30%</p>
                  <p className="text-zinc-400 text-sm">1-10 рефералов</p>
                </div>

                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-lg border border-purple-500/20">
                  <p className="text-white font-semibold mb-2">⭐ 35% при 11-50 рефералов</p>
                  <p className="text-zinc-400 text-sm">Увеличение на 5%</p>
                </div>

                <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 p-4 rounded-lg border border-orange-500/20">
                  <p className="text-white font-semibold mb-2">🚀 40% при 51-100 рефералов</p>
                  <p className="text-zinc-400 text-sm">Ещё +5%</p>
                </div>

                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 p-4 rounded-lg border border-red-500/20">
                  <p className="text-white font-semibold mb-2">👑 50% при 100+ рефералов</p>
                  <p className="text-zinc-400 text-sm">Максимальная комиссия</p>
                </div>
              </div>
            </Card>

            {/* Commission Calculation */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4">💰 Пример расчёта</h3>
              <div className="space-y-3 text-zinc-300">
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                  <p className="text-sm"><span className="text-white font-semibold">Твой реферал:</span> Сделал ставку $100 в Краше и выиграл $300</p>
                  <p className="text-sm mt-2"><span className="text-white font-semibold">Его профит:</span> $200 (выигрыш - ставка)</p>
                  <p className="text-yellow-300 font-semibold text-sm mt-3">Твоя комиссия: $200 × 30% = $60</p>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-white font-semibold">Ежедневные выплаты:</p>
                  <p className="text-sm">✓ Комиссия начисляется каждый день</p>
                  <p className="text-sm">✓ Выплаты автоматические</p>
                  <p className="text-sm">✓ Минимум для вывода: $1</p>
                </div>
              </div>
            </Card>

            {/* Important Notes */}
            <Card className="p-6 bg-green-500/10 border-green-500/20">
              <h3 className="font-bold text-lg text-white mb-3">✅ Преимущества программы</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>• Без ограничений по количеству рефералов</li>
                <li>• Комиссия начисляется пожизненно</li>
                <li>• Повышение уровня автоматическое</li>
                <li>• Вывод в любой момент</li>
                <li>• Комиссия платформы на вывод: 0%</li>
                <li>• Отслеживание статистики в реальном времени</li>
              </ul>
            </Card>

            {/* Support */}
            <Card className="p-6 bg-blue-500/10 border-blue-500/20">
              <h3 className="font-bold text-lg text-white mb-3">Нужна помощь?</h3>
              <p className="text-zinc-400 text-sm mb-4">Если у тебя есть вопросы о программе рефералов, наша команда поддержки всегда готова помочь</p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Связаться с поддержкой
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* DEFAULT SUPPORT PAGE */}
      {!section && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Помощь и поддержка</h1>
            <p className="text-muted-foreground">Мы здесь, чтобы помочь вам 24/7</p>
          </div>

          {/* Contact Options */}
          <Card className="p-5 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Headphones className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Связаться с нами</h3>
            </div>
            <div className="space-y-4">
              <Button className="w-full justify-start h-auto p-4 rounded-2xl border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300" variant="outline">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Онлайн-чат</p>
                    <p className="text-sm text-muted-foreground">Мгновенная помощь от команды поддержки</p>
                  </div>
                </div>
              </Button>

              <Button className="w-full justify-start h-auto p-4 rounded-2xl border-primary/30 hover:bg-secondary hover:text-secondary-foreground transition-all duration-300" variant="outline">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Email поддержка</p>
                    <p className="text-sm text-muted-foreground">support@game-portal.com</p>
                  </div>
                </div>
              </Button>

              <Button className="w-full justify-start h-auto p-4 rounded-2xl border-primary/30 hover:bg-accent hover:text-accent-foreground transition-all duration-300" variant="outline">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Телефон поддержки</p>
                    <p className="text-sm text-muted-foreground">+7 (800) 123-45-67</p>
                  </div>
                </div>
              </Button>
            </div>
          </Card>

          {/* Support Hours */}
          <Card className="p-5 mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <div className="flex items-center space-x-4">
              <Clock className="w-6 h-6 text-primary" />
              <div>
                <p className="font-semibold text-lg">Часы работы поддержки</p>
                <p className="text-muted-foreground">Доступны 24/7 - мы никогда не закрываемся!</p>
              </div>
            </div>
          </Card>

          {/* FAQ Section */}
          <Card className="p-5">
            <h3 className="font-bold text-lg mb-4">Часто задаваемые вопросы</h3>
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-border/50">
                  <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </>
      )}
    </div>
  );
}