import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ArrowLeft, Zap, Gift, Users, HelpCircle, TrendingUp, Zap as ZapIcon, MessageSquare, Plus, Send, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const faqData = [
  {
    question: "Как играть в Сапёр?",
    answer: "Цель игры - найти все мины на игровом поле, не наступив на них. Нажимайте на клетки, чтобы открыть их. Чем больше клеток откроете без мин, тем выше выигрыш!"
  },
  {
    question: "Что такое игра Краш?",
    answer: "Краш - это игра на удачу, где нужно вовремя забрать выигрыш до того, как график 'упадёт'. Чем дольше ждёте, тем больше множитель, но и больше риск проигрыша."
  },
  {
    question: "Как работает Плинко?",
    answer: "Шарик падает сверху через поле с препятствиями и попадает в одну из ячеек внизу. Каждая ячейка имеет свой множитель выигрыша. Выбирайте уровень риска для разных выплат!"
  },
  {
    question: "Какой минимальный депозит?",
    answer: "Минимальный депозит составляет 1 USDT. Пополнение доступно в криптовалютах: USDT (TRC-20), BTC, ETH, TON и других."
  },
  {
    question: "Какой минимальный вывод?",
    answer: "Минимальный вывод составляет 5 USDT. Выводы обрабатываются автоматически и приходят на ваш кошелёк в течение нескольких минут."
  },
  {
    question: "Как получить бонус +100%?",
    answer: "Бонус +100% начисляется автоматически на первый депозит, если вы зарегистрировались по реферальной ссылке или ввели код реферала. Максимальный бонус - 1500 USDT."
  },
  {
    question: "Как отыграть бонус?",
    answer: "Для вывода бонусных средств необходимо отыграть сумму в 10 раз (10x вейджер). Например, при депозите 100 USDT + бонусе 100 USDT нужно сделать ставок на 2000 USDT."
  },
  {
    question: "Как вывести деньги?",
    answer: "Перейдите в Аккаунт → Вывести, выберите криптовалюту, введите адрес кошелька и сумму. Вывод обрабатывается автоматически в течение нескольких минут."
  },
  {
    question: "Что такое Provably Fair?",
    answer: "Provably Fair - это система доказуемой честности. Вы можете проверить результат каждой игры, используя server seed и client seed. Это гарантирует, что казино не может повлиять на исход."
  },
  {
    question: "Как работает реферальная программа?",
    answer: "Приглашайте друзей и получайте 30% от прибыли казино с их игр - пожизненно! Комиссия начисляется автоматически на ваш баланс."
  },
];

// 🎨 CSS переменные для темы
const getThemeColors = () => ({
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  border: 'var(--border)',
});

export function SupportPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const colors = getThemeColors();
  const searchParams = new URLSearchParams(window.location.search);
  const section = searchParams.get('section');
  const viewParam = searchParams.get('view');
  
  const [view, setView] = useState<'faq' | 'list' | 'create' | 'detail'>(
    (viewParam === 'list' || viewParam === 'create') ? (viewParam as any) : 'faq'
  );
  const [tickets, setTickets] = useState<any[]>([]);
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    if (view === 'list' && isAuthenticated) {
      fetchTickets();
    }
  }, [view, isAuthenticated]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('casino_jwt_token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/my-tickets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Failed to fetch tickets', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('casino_jwt_token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check for new messages if we already have data
        if (currentTicket && data.messages.length > currentTicket.messages.length) {
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg.sender === 'ADMIN') {
                toast.success('Новое сообщение от поддержки!', {
                    description: lastMsg.text.substring(0, 50) + (lastMsg.text.length > 50 ? '...' : '')
                });
            }
        }

        setCurrentTicket(data);
        if (!silent) setView('detail');
      }
    } catch (error) {
      if (!silent) toast.error('Не удалось загрузить тикет');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Polling for updates when in detail view
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (view === 'detail' && currentTicket) {
        interval = setInterval(() => {
            fetchTicketDetails(currentTicket.id, true);
        }, 5000);
    }
    return () => clearInterval(interval);
  }, [view, currentTicket?.id]);

  const createTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Заполните тему и сообщение');
      return;
    }

    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('casino_jwt_token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/create`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subject, message })
      });
      
      if (response.ok) {
        toast.success('Заявка создана');
        setSubject('');
        setMessage('');
        setView('list');
      } else {
        toast.error('Ошибка при создании заявки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !currentTicket) return;

    if (currentTicket.status === 'CLOSED') {
      toast.error('Этот тикет закрыт. Создайте новый.');
      return;
    }

    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('casino_jwt_token');
      
      const response = await fetch(`${API_BASE_URL}/api/support/${currentTicket.id}/reply`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: replyMessage })
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        setCurrentTicket((prev: any) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
          status: 'OPEN'
        }));
        setReplyMessage('');
      } else {
        toast.error('Ошибка отправки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  // RENDER HELPERS
  const renderStatus = (status: string) => {
    switch(status) {
      case 'OPEN': return <span className="text-yellow-400 text-xs font-bold px-2 py-1 bg-yellow-400/10 rounded-full">Открыт</span>;
      case 'ANSWERED': return <span className="text-green-400 text-xs font-bold px-2 py-1 bg-green-400/10 rounded-full">Ответ получен</span>;
      case 'CLOSED': return <span className="text-gray-400 text-xs font-bold px-2 py-1 bg-gray-400/10 rounded-full">Закрыт</span>;
      default: return null;
    }
  };

  // MAIN RENDER
  return (
    <div className="pb-24 pt-6 px-4 transition-colors duration-300 min-h-screen" style={{ backgroundColor: colors.background, color: colors.foreground }}>
      
      {/* HEADER & NAVIGATION */}
      <div className="mb-6 flex items-center justify-between">
        {view === 'faq' && !section ? (
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
              Поддержка
            </h1>
            <p style={{ color: colors.mutedForeground }} className="text-sm mt-1">Мы всегда готовы помочь</p>
          </div>
        ) : (
          <Button 
            onClick={() => {
              if (view === 'detail') setView('list');
              else if (view === 'create') setView('list');
              else if (view === 'list') setView('faq');
              else navigate('/support');
            }}
            variant="ghost"
            className="-ml-2"
            style={{ color: colors.foreground }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        )}

        {view === 'faq' && !section && isAuthenticated && (
          <Button 
            onClick={() => setView('list')}
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Мои заявки
          </Button>
        )}
      </div>

      {/* VIEW: FAQ (DEFAULT) */}
      {view === 'faq' && !section && (
        <>
          {/* Quick Links */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <Card className="p-4 border cursor-pointer transition-all hover:scale-105" style={{
              backgroundColor: colors.card,
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(249, 115, 22, 0.1))',
              borderColor: 'rgba(234, 179, 8, 0.3)'
            }}
              onClick={() => navigate('/support?section=bonus')}>
              <div className="flex flex-col items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <p className="text-xs font-semibold text-center" style={{ color: colors.foreground }}>Бонусы</p>
              </div>
            </Card>

            <Card className="p-4 border cursor-pointer transition-all hover:scale-105" style={{
              backgroundColor: colors.card,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1))',
              borderColor: 'rgba(168, 85, 247, 0.3)'
            }}
              onClick={() => navigate('/support?section=referral')}>
              <div className="flex flex-col items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <p className="text-xs font-semibold text-center" style={{ color: colors.foreground }}>Рефералы</p>
              </div>
            </Card>

            <Card className="p-4 border cursor-pointer transition-all hover:scale-105" style={{
              backgroundColor: colors.card,
              background: 'linear-gradient(135deg, rgba(34, 197, 238, 0.2), rgba(59, 130, 246, 0.1))',
              borderColor: 'rgba(34, 197, 238, 0.3)'
            }}
              onClick={() => {
                if (isAuthenticated) setView('create');
                else toast.error('Войдите, чтобы создать заявку');
              }}>
              <div className="flex flex-col items-center gap-2">
                <ZapIcon className="w-5 h-5 text-cyan-400" />
                <p className="text-xs font-semibold text-center" style={{ color: colors.foreground }}>Создать тикет</p>
              </div>
            </Card>
          </div>

          {/* FAQ Section */}
          <Card className="p-6 border transition-colors" style={{
            backgroundColor: colors.card,
            borderColor: colors.border
          }}>
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              Часто задаваемые вопросы
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} style={{ borderColor: colors.border }}>
                  <AccordionTrigger style={{ color: colors.foreground }} className="font-semibold hover:text-cyan-400 transition-colors text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent style={{ color: colors.mutedForeground }} className="leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </>
      )}

      {/* VIEW: TICKET LIST */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Мои заявки</h2>
            <Button onClick={() => setView('create')} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="w-4 h-4 mr-1" /> Создать
            </Button>
          </div>

          {loading && tickets.length === 0 ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground bg-secondary/20 rounded-xl">
              <p>У вас пока нет заявок</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <Card 
                key={ticket.id} 
                className="p-4 cursor-pointer hover:bg-secondary/10 transition-colors border-l-4"
                style={{ borderLeftColor: ticket.status === 'ANSWERED' ? '#4ade80' : ticket.status === 'CLOSED' ? '#9ca3af' : '#facc15' }}
                onClick={() => fetchTicketDetails(ticket.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs text-muted-foreground">#{ticket.id}</span>
                  {renderStatus(ticket.status)}
                </div>
                <h3 className="font-bold mb-1">{ticket.subject}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {ticket.messages[0]?.text || 'Без сообщений'}
                </p>
                <div className="mt-2 text-xs text-muted-foreground text-right">
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* VIEW: CREATE TICKET */}
      {view === 'create' && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Новая заявка</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Тема</label>
              <Input 
                placeholder="Например: Проблема с депозитом" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Сообщение</label>
              <Textarea 
                placeholder="Опишите вашу проблему подробно..." 
                className="min-h-[150px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button 
              className="w-full bg-cyan-500 hover:bg-cyan-600" 
              onClick={createTicket}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Отправить заявку'}
            </Button>
          </div>
        </Card>
      )}

      {/* VIEW: TICKET DETAIL */}
      {view === 'detail' && currentTicket && (
        <div className="flex flex-col h-[calc(100vh-140px)]">
          <Card className="p-4 mb-4 flex-shrink-0">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-lg font-bold">#{currentTicket.id} {currentTicket.subject}</h2>
              {renderStatus(currentTicket.status)}
            </div>
          </Card>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {currentTicket.messages.map((msg: any) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    msg.sender === 'USER' 
                      ? 'bg-cyan-500/20 rounded-tr-none' 
                      : 'bg-secondary rounded-tl-none'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <div className="text-[10px] opacity-50 mt-1 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-auto">
            {currentTicket.status === 'CLOSED' ? (
              <div className="w-full p-3 text-center text-sm text-muted-foreground bg-secondary/20 rounded-xl border border-dashed">
                🔒 Тикет закрыт. Вы не можете отправлять сообщения.
              </div>
            ) : (
              <>
                <Input 
                  placeholder="Напишите ответ..." 
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                />
                <Button size="icon" onClick={sendReply} disabled={loading || !replyMessage.trim()}>
                  {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* BONUS & REFERRAL SECTIONS (Keep existing code) */}
      {section === 'bonus' && (
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/support')}
            variant="ghost"
            className="mb-4 -ml-2"
            style={{ color: colors.foreground }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Бонус для рефералов
            </h1>
            <p style={{ color: colors.mutedForeground }}>Бонус +100% на первый депозит доступен только при регистрации по реферальной ссылке</p>
          </div>

          <div className="space-y-4">
            {/* Main Bonus Card */}
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: 'rgba(234, 179, 8, 0.3)',
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(249, 115, 22, 0.2))'
            }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black mb-1" style={{ color: colors.foreground }}>+100% БОНУС К ПЕРВОМУ ДЕПОЗИТУ</h2>
                  <p className="text-yellow-300 text-sm">Максимум 1500 USDT</p>
                </div>
              </div>
            </Card>

            {/* Bonus Details Card */}
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
                <ZapIcon className="w-5 h-5 text-yellow-400" />
                Размер Бонуса
              </h3>
              <div className="space-y-3" style={{ color: colors.mutedForeground }}>
                <div className="p-4 rounded-xl border transition-colors" style={{
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(249, 115, 22, 0.1))',
                  borderColor: 'rgba(234, 179, 8, 0.3)'
                }}>
                  <p style={{ color: colors.foreground }} className="font-semibold mb-2">Пример расчёта:</p>
                  <div className="space-y-1 text-sm">
                    <p>💙 Депозит: 100 USDT</p>
                    <p>💛 Бонус: +100% = 100 USDT</p>
                    <p className="text-yellow-300 font-semibold">📈 На счёте: 200 USDT</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border transition-colors" style={{
                  background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(249, 115, 22, 0.1))',
                  borderColor: 'rgba(234, 179, 8, 0.3)'
                }}>
                  <p style={{ color: colors.foreground }} className="font-semibold mb-2">Максимальный бонус:</p>
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
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
                <Zap className="w-5 h-5 text-cyan-400" />
                Как получить бонус?
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Зарегистрируйся или введи реферальный код</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">При регистрации через реф. ссылку или в профиле</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Пополни баланс</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">Отправь USDT (или другую криптовалюту) на адрес кошелька</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Получи бонус автоматически</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">Сразу после пополнения счёта (если это первый депозит и вы зарегистрировались по реферальной ссылке)</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Wagering Requirements */}
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
                <Zap className="w-5 h-5 text-orange-400" />
                Требования к Отыгрышу
              </h3>
              <div className="space-y-3" style={{ color: colors.mutedForeground }}>
                <div className="p-4 rounded-xl border transition-colors" style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border
                }}>
                  <p style={{ color: colors.foreground }} className="font-semibold mb-2">🎲 Коэффициент отыгрыша: 10x</p>
                  <p className="text-sm">Нужно отыграть бонус в 10 раз от суммы пополнения + бонуса</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm"><span style={{ color: colors.foreground }} className="font-semibold">📊 Пример отыгрыша:</span></p>
                  <div className="p-4 rounded-lg border transition-colors" style={{
                    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 179, 8, 0.1))',
                    borderColor: 'rgba(249, 115, 22, 0.2)'
                  }}>
                    <div className="space-y-2">
                      <p className="text-sm">💙 Депозит: 1000 USDT</p>
                      <p className="text-sm">💛 Бонус: +1000 USDT</p>
                      <p style={{ color: colors.foreground }} className="font-semibold text-sm">📈 Всего на счёте: 2000 USDT</p>
                      <p className="text-yellow-300 font-semibold text-sm">⚡ Нужно отыграть: 2000 × 10 = 20,000 USDT</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p style={{ color: colors.foreground }} className="font-semibold">✅ Что учитывается при отыгрыше?</p>
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
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
                <TrendingUp className="w-5 h-5 text-green-400" />
                После Отыгрыша
              </h3>
              <div className="space-y-3" style={{ color: colors.mutedForeground }}>
                <div className="p-4 rounded-xl border transition-colors" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                  borderColor: 'rgba(16, 185, 129, 0.3)'
                }}>
                  <p style={{ color: colors.foreground }} className="font-semibold mb-2">💰 Что происходит?</p>
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
            <Card className="p-6 border transition-colors" style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: colors.foreground
            }}>
              <h3 className="font-bold text-lg mb-3">⚠️ Важные условия</h3>
              <ul className="space-y-2 text-sm" style={{ color: colors.mutedForeground }}>
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
            style={{ color: colors.foreground }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>

          <div className="mb-6">
            <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Программа Рефералов
            </h1>
            <p style={{ color: colors.mutedForeground }}>Зарабатывай комиссию со всех ставок твоих рефералов – пожизненно</p>
          </div>

          <div className="space-y-4">
            {/* Main Referral Card */}
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: 'rgba(168, 85, 247, 0.3)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))'
            }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black mb-1" style={{ color: colors.foreground }}>ПРОГРАММА РЕФЕРАЛОВ</h2>
                  <p className="text-purple-300 text-sm">Комиссия со всех ставок твоих рефералов</p>
                </div>
              </div>
            </Card>

            {/* How it Works */}
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
                <Zap className="w-5 h-5 text-cyan-400" />
                Как это работает?
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">1</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Поделись своей реф. ссылкой</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">Отправь партнёрскую ссылку друзьям и в соцсети</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">2</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Друзья регистрируются</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">Они переходят по твоей ссылке и создают аккаунт</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">3</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Они пополняют счёт и играют</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">Каждая ставка в любой игре генерирует тебе доход</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">4</div>
                  <div>
                    <p style={{ color: colors.foreground }} className="font-semibold">Получай комиссию мгновенно</p>
                    <p style={{ color: colors.mutedForeground }} className="text-sm">Прибыль зачисляется на счёт сразу, без ограничений</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Commission Structure */}
            <Card className="p-6 border transition-colors" style={{
              backgroundColor: colors.card,
              borderColor: colors.border
            }}>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: colors.foreground }}>
                <TrendingUp className="w-5 h-5 text-green-400" />
                Структура Комиссии
              </h3>
              <div className="space-y-4" style={{ color: colors.mutedForeground }}>
                <div className="p-4 rounded-xl border transition-colors" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
                  borderColor: 'rgba(16, 185, 129, 0.3)'
                }}>
                  <p style={{ color: colors.foreground }} className="font-semibold mb-2">📊 Как считается комиссия?</p>
                  <p className="text-sm mb-3">Формула расчёта: <span className="text-green-400 font-mono">(House Edge × Turnover / 2) × Commission Rate</span></p>
                  <div className="space-y-1 text-sm">
                    <p>• <span style={{ color: colors.foreground }} className="font-semibold">House Edge (HE)</span> - преимущество казино по игре</p>
                    <p>• <span style={{ color: colors.foreground }} className="font-semibold">Turnover</span> - общий оборот ставок реферала</p>
                    <p>• <span style={{ color: colors.foreground }} className="font-semibold">Commission Rate</span> - твой комиссионный процент</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border transition-colors" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
                  borderColor: 'rgba(168, 85, 247, 0.3)'
                }}>
                  <p style={{ color: colors.foreground }} className="font-semibold mb-2">💜 Пример расчёта:</p>
                  <div className="space-y-1 text-sm">
                    <p>Реферал сделал ставок на 1000 USDT</p>
                    <p>House Edge игры: 2%</p>
                    <p className="text-purple-300 font-semibold">Твоя комиссия: (0.02 × 1000 / 2) × твой % = доход</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Key Points */}
            <Card className="p-6 border transition-colors" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))',
              borderColor: 'rgba(16, 185, 129, 0.3)'
            }}>
              <h3 style={{ color: colors.foreground }} className="font-bold text-lg mb-3">✅ Преимущества программы</h3>
              <ul className="space-y-2 text-sm" style={{ color: colors.mutedForeground }}>
                <li>✓ Мгновенные выплаты на счёт (без ожидания)</li>
                <li>✓ Неограниченная комиссия со всех ставок</li>
                <li>✓ Комиссия начисляется пожизненно</li>
                <li>✓ Нет лимита на количество рефералов</li>
                <li>✓ Индивидуальные комиссионные планы</li>
                <li>✓ Вывод в криптовалютах и стандартных валютах</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
