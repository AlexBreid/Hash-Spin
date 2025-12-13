import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ArrowLeft, Zap, Gift, Users, HelpCircle, TrendingUp, Zap as ZapIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const faqData = [
  {
    question: "Как играть в Сапёр?",
    answer: "Цель игры - найти все мины на игровом поле, не наступив на них. Нажимайте на клетки, чтобы открыть их."
  },
  {
    question: "Что такое игра Краш?",
    answer: "Краш - это игра на удачу, где нужно вовремя забрать выигрыш до того, как график 'упадёт'. Чем дольше ждёте, тем больше множитель, но и больше риск."
  },
  {
    question: "Как вывести деньги?",
    answer: "Перейди в бота, нажми 'Вывести', выбери сумму и выводи ."
  },
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
            <p className="text-zinc-400">Получите 100% бонус на первый депозит</p>
          </div>

          <div className="space-y-4">
            {/* Main Bonus Card */}
            <Card className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-1">+100% БОНУС К ПЕРВОМУ ДЕПОЗИТУ</h2>
                  <p className="text-yellow-300 text-sm">Максимум 1500 USDT</p>
                </div>
              </div>
            </Card>

            {/* Bonus Details Card */}
            <Card className="p-6 border-zinc-700 bg-zinc-900/50">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <ZapIcon className="w-5 h-5 text-yellow-400" />
                Размер Бонуса
              </h3>
              <div className="space-y-3 text-zinc-300">
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-xl border border-yellow-500/30">
                  <p className="text-white font-semibold mb-2">Пример расчёта:</p>
                  <div className="space-y-1 text-sm">
                    <p>💙 Депозит: 100 USDT</p>
                    <p>💛 Бонус: +100% = 100 USDT</p>
                    <p className="text-yellow-300 font-semibold">📈 На счёте: 200 USDT</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 rounded-xl border border-yellow-500/30">
                  <p className="text-white font-semibold mb-2">Максимальный бонус:</p>
                  <div className="space-y-1 text-sm">
                    <p>Если депозит ≥ 1500 USDT:</p>
                    <p>💙 Депозит: 1500 USDT</p>
                    <p>💛 Бонус: +1500 USDT (максимум)</p>
                    <p className="text-yellow-300 font-semibold">📈 На счёте: 3000 USDT</p>
                  </div>
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
                    <p className="text-white font-semibold">Зарегистрируйся или введи реферальный код</p>
                    <p className="text-zinc-400 text-sm">При регистрации через реф. ссылку или в профиле</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p className="text-white font-semibold">Пополни баланс</p>
                    <p className="text-zinc-400 text-sm">Отправь USDT (или другую криптовалюту) на адрес кошелька</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p className="text-white font-semibold">Получи бонус автоматически</p>
                    <p className="text-zinc-400 text-sm">Сразу после пополнения счёта (если это первый депозит)</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Wagering Requirements */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Требования к Отыгрышу
              </h3>
              <div className="space-y-3 text-zinc-300">
                <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                  <p className="text-white font-semibold mb-2">🎲 Коэффициент отыгрыша: 10x</p>
                  <p className="text-sm">Нужно отыграть бонус в 10 раз от суммы пополнения + бонуса</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm"><span className="text-white font-semibold">📊 Пример отыгрыша:</span></p>
                  <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 p-4 rounded-lg border border-orange-500/20 space-y-2">
                    <p className="text-sm">💙 Депозит: 1000 USDT</p>
                    <p className="text-sm">💛 Бонус: +1000 USDT</p>
                    <p className="text-white font-semibold text-sm">📈 Всего на счёте: 2000 USDT</p>
                    <p className="text-yellow-300 font-semibold text-sm">⚡ Нужно отыграть: 2000 × 10 = 20,000 USDT</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-white font-semibold">✅ Что учитывается при отыгрыше?</p>
                  <ul className="space-y-1 text-sm">
                    <li>✓ Все ставки в Сапёре (Мinesweeper)</li>
                    <li>✓ Все ставки в Краш (Crash)</li>
                    <li>✓ Выигрыши и проигрыши учитываются одинаково</li>
                    <li>✓ Множители в краш игре не влияют на скорость отыгрыша</li>
                    <li>✗ Вывод средств НЕ сбрасывает прогресс</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Payout Details */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                После Отыгрыша
              </h3>
              <div className="space-y-3 text-zinc-300">
                <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
                  <p className="text-white font-semibold mb-2">💰 Что происходит?</p>
                  <ul className="space-y-1 text-sm">
                    <li>✓ Бонус конвертируется в обычный баланс</li>
                    <li>✓ Деньги становятся доступны для вывода</li>
                    <li>✓ Максимальный выигрыш: 3x от суммы (депо + бонус)</li>
                    <li>✓ Вывод на криптокошелёк – мгновенно</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Important Notes */}
            <Card className="p-6 bg-red-500/10 border-red-500/20">
              <h3 className="font-bold text-lg text-white mb-3">⚠️ Важные условия</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>• Бонус действует только один раз на аккаунт</li>
                <li>• Бонус действует 7 дней с момента активации</li>
                <li>• После 7 дней неиспользованный бонус сгорает</li>
                <li>• При нарушении правил бонус будет отменён</li>
                <li>• Максимальный бонус никогда не превышает 1500 USDT</li>
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
            <p className="text-zinc-400">Зарабатывай комиссию со всех ставок твоих рефералов – пожизненно</p>
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
                  <p className="text-purple-300 text-sm">Комиссия со всех ставок твоих рефералов</p>
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
                    <p className="text-white font-semibold">Поделись своей реф. ссылкой</p>
                    <p className="text-zinc-400 text-sm">Отправь партнёрскую ссылку друзьям и в соцсети</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p className="text-white font-semibold">Друзья регистрируются</p>
                    <p className="text-zinc-400 text-sm">Они переходят по твоей ссылке и создают аккаунт</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p className="text-white font-semibold">Они пополняют счёт и играют</p>
                    <p className="text-zinc-400 text-sm">Каждая ставка в любой игре генерирует тебе доход</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">4</div>
                  <div>
                    <p className="text-white font-semibold">Получай комиссию мгновенно</p>
                    <p className="text-zinc-400 text-sm">Прибыль зачисляется на счёт сразу, без ограничений</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Commission Structure */}
            <Card className="p-6 border-zinc-700">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Структура Комиссии
              </h3>
              <div className="space-y-4 text-zinc-300">
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-xl border border-green-500/30">
                  <p className="text-white font-semibold mb-2">📊 Как считается комиссия?</p>
                  <p className="text-sm mb-3">Формула расчёта: <span className="text-green-400 font-mono">(House Edge × Turnover / 2) × Commission Rate</span></p>
                  <div className="space-y-1 text-sm">
                    <p>• <span className="text-white font-semibold">House Edge (HE)</span> - преимущество казино по игре</p>
                    <p>• <span className="text-white font-semibold">Turnover</span> - общий оборот ставок реферала</p>
                    <p>• <span className="text-white font-semibold">Commission Rate</span> - твой комиссионный процент</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-purple-500/30">
                  <p className="text-white font-semibold mb-2">💜 Пример расчёта:</p>
                  <div className="space-y-1 text-sm">
                    <p>Реферал сделал ставок на 1000 USDT</p>
                    <p>House Edge игры: 2%</p>
                    <p className="text-purple-300 font-semibold">Твоя комиссия: (0.02 × 1000 / 2) × твой % = доход</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Key Points */}
            <Card className="p-6 bg-green-500/10 border-green-500/20">
              <h3 className="font-bold text-lg text-white mb-3">✅ Преимущества программы</h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>✓ Мгновенные выплаты на счёт (без ожидания)</li>
                <li>✓ Неограниченная комиссия со всех ставок</li>
                <li>✓ Комиссия начисляется пожизненно</li>
                <li>✓ Нет лимита на количество рефералов</li>
                <li>✓ Индивидуальные комиссионные планы</li>
                <li>✓ Вывод в криптовалютах и стандартных валютах</li>
              </ul>
            </Card>

            {/* Support Card */}
            <Card className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
              <div className="flex gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-sm">
                  <p className="text-white font-semibold mb-1">Нужна помощь?</p>
                  <p className="text-zinc-400 text-xs">Наша команда поддержки работает 24/7 на всех языках</p>
                </div>
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
                <p className="text-zinc-400 text-xs">Если твой вопрос не освещён в FAQ, оставляй заявку в чате</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}