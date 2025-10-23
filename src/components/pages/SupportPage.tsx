import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { MessageCircle, Mail, Phone, Clock, Headphones } from 'lucide-react';

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
  return (
    <div className="pb-24 pt-6 px-4">
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
    </div>
  );
}