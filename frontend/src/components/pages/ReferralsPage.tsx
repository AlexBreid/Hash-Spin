import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import {
  Users,
  Crown,
  Copy,
  CheckCircle,
  Loader,
  TrendingUp,
  Award,
  Zap,
  Sparkles,
  Flame,
  Gift,
  X,
  ArrowRight,
  ChevronDown,
  Star,
  Unlock,
  Rocket
} from 'lucide-react'
import { toast } from 'sonner'
import { useFetch } from '../../hooks/useDynamicApi'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ReferralStats {
  myReferralCode: string
  myReferralsCount?: number
  myRefeersCount?: number
  referredByCode?: string
  referrerUsername?: string
  commissionRate?: number
  totalTurnover?: number | string
  totalCommissionPaid?: number | string
}

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const num = parseFloat(String(value))
  return isNaN(num) ? 0 : num
}

export function ReferralsPage() {
  const { isAuthenticated } = useAuth()
  const [inputCode, setInputCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [expandedCondition, setExpandedCondition] = useState<number | null>(null)
  const hasLoadedRef = useRef(false)

  const { execute: loadStats } = useFetch('REFERRAL_GET_referral_stats', 'GET')
  const { execute: linkReferrer } = useFetch('REFERRAL_POST_referral_link-referrer', 'POST')

  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadStatsData()
    }
  }, [isAuthenticated])

  const loadStatsData = async () => {
    try {
      setLoading(true)
      const result = await loadStats()
      if (result?.data) setStats(result.data)
      else if (result) setStats(result)
    } catch (err) {
      // Silent error or toast
    } finally {
      setLoading(false)
    }
  }

  const handleLinkReferrer = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputCode.trim()) {
      toast.error('Введите код')
      return
    }

    try {
      setLinking(true)
      await linkReferrer({ referralCode: inputCode.trim() })
      
      setShowBonusModal(true)
      setInputCode('')
      await loadStatsData()
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка привязки')
    } finally {
      setLinking(false)
    }
  }

  const copyCode = () => {
    if (stats?.myReferralCode) {
      navigator.clipboard.writeText(stats.myReferralCode)
      toast.success('✅ Код скопирован')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="pb-24 pt-6 px-4">
        <Card className="p-5 bg-zinc-900 border-zinc-800 text-white">
          <p>Войдите в аккаунт</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex justify-center items-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  const totalTurnover = toNumber(stats?.totalTurnover)
  const totalCommissionPaid = toNumber(stats?.totalCommissionPaid)
  const commissionRate = stats?.commissionRate || 30
  const referralsCount = stats?.myReferralsCount || stats?.myRefeersCount || 0

  const conditions = [
    {
      id: 1,
      title: '🎁 Стартовый бонус +100%',
      description: 'Первое пополнение',
      details: [
        'Получи 100% бонус к первому депозиту при вводе реферального кода',
        'Минимальное пополнение: $10',
        'Максимальный бонус: $500',
        'Бонус активируется автоматически после пополнения',
        'Действует только один раз на аккаунт'
      ]
    },
    {
      id: 2,
      title: '💰 Комиссия рефералов',
      description: `${commissionRate}% от прибыли`,
      details: [
        `Ты получаешь ${commissionRate}% комиссии от всех профитов твоих рефералов`,
        'Выплаты начисляются автоматически каждый день',
        'Нет ограничений по количеству рефералов',
        'Комиссия начисляется пожизненно',
        'Минимум для вывода: $1'
      ]
    },
    {
      id: 3,
      title: '📈 Уровни партнёров',
      description: 'Увеличивай проценты',
      details: [
        '1-10 рефералов: 30% комиссия',
        '11-50 рефералов: 35% комиссия',
        '51-100 рефералов: 40% комиссия',
        '100+ рефералов: 50% комиссия',
        'Повышение уровня автоматическое'
      ]
    },
    {
      id: 4,
      title: '🔒 Безопасность и вывод',
      description: 'Как вывести деньги',
      details: [
        'Выводи заработанные средства в любое время',
        'Выплаты обрабатываются за 24 часа',
        'Поддержка нескольких способов вывода',
        'Все операции защищены и зашифрованы',
        'Комиссия платформы: 0% на вывод'
      ]
    }
  ]

  return (
    <div className="pb-32 pt-6 px-4 space-y-6 relative overflow-hidden">
      
      {/* BACKGROUND GLOWS */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[100px] rounded-full" />
      </div>

      {/* HEADER */}
      <div>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-black italic bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent uppercase tracking-tighter">
            Партнёрская
            <br />
            <span className="text-white text-xl md:text-2xl not-italic font-bold tracking-normal">Программа</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-2">Зарабатывай на рефералах – пожизненно</p>
        </motion.div>
      </div>

      {/* 1. ГЛАВНЫЙ БЛОК - ВВОД КОДА (ВВЕРХУ) */}
      {!stats?.referredByCode ? (
        <div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative">
              {/* Пульсирующий фон */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 animate-pulse" />
              
              <Card className="relative bg-gradient-to-br from-slate-900 via-zinc-900 to-black border-0 rounded-2xl overflow-hidden shadow-2xl">
                {/* Шумовой оверлей */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 z-0" />
                
                <div className="relative z-10 p-6 md:p-8">
                  {/* Иконка сверху */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex justify-center mb-6"
                  >
                    <div className="relative">
                      <div className="absolute -inset-3 bg-yellow-400/30 blur-2xl rounded-full" />
                      <div className="relative w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Gift className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Заголовок */}
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase tracking-tight">
                      ВВЕДИ ПРОМОКОД
                    </h2>
                    <p className="text-zinc-300 text-sm md:text-base">
                      Получи <span className="font-bold text-yellow-400">+100% бонус</span> к первому пополнению и присоединись к нашей программе
                    </p>
                  </div>

                  {/* Форма */}
                  <form onSubmit={handleLinkReferrer} className="space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="ВВЕДИ КОД ПРИГЛАШЕНИЯ..."
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        disabled={linking}
                        className="bg-zinc-800/50 border-zinc-700 border-2 focus:border-yellow-400 text-center text-xl md:text-2xl font-black tracking-widest uppercase h-14 md:h-16 rounded-xl transition-all"
                      />
                      <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400 pointer-events-none" />
                    </div>

                    <Button
                      type="submit"
                      disabled={linking || !inputCode}
                      className="w-full h-14 md:h-16 rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 hover:from-yellow-500 hover:via-orange-600 hover:to-pink-700 text-white font-black text-lg md:text-xl shadow-2xl shadow-orange-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linking ? (
                        <>
                          <Loader className="w-6 h-6 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" />
                          АКТИВИРОВАТЬ БОНУС
                        </>
                      )}
                    </Button>

                    <p className="text-center text-zinc-500 text-xs">
                      ✓ Безопасно • ✓ Анонимно • ✓ Мгновенно
                    </p>
                  </form>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      ) : (
        <div>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
          >
            <div className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-green-400 uppercase font-bold tracking-wider">Ваш наставник</p>
                  <p className="text-white font-bold">{stats.referrerUsername || stats.referredByCode}</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20 text-[10px] text-green-300 whitespace-nowrap">
                ✓ АКТИВИРОВАНО
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. СТАТИСТИКА (СЕТКА) */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <StatCard
              title="МОЯ КОМАНДА"
              value={referralsCount}
              icon={<Users className="w-5 h-5 text-cyan-400" />}
              gradient="from-cyan-500/10 to-blue-500/10"
              border="border-cyan-500/20"
            />
            <StatCard
              title="МОЙ ДОХОД"
              value={`$${totalCommissionPaid.toFixed(0)}`}
              icon={<Award className="w-5 h-5 text-yellow-400" />}
              gradient="from-yellow-500/10 to-orange-500/10"
              border="border-yellow-500/20"
            />
            <StatCard
              title="ОБОРОТ СЕТИ"
              value={`$${totalTurnover.toFixed(0)}`}
              icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
              gradient="from-purple-500/10 to-pink-500/10"
              border="border-purple-500/20"
            />
            <StatCard
              title="ТЕКУЩАЯ СТАВКА"
              value={`${commissionRate}%`}
              icon={<Flame className="w-5 h-5 text-red-400" />}
              gradient="from-red-500/10 to-rose-500/10"
              border="border-red-500/20"
            />
          </div>
        </motion.div>
      </div>

      {/* 3. КАРТОЧКА С МОИМ КОДОМ */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4 px-1">
            <Crown className="w-6 h-6 text-indigo-400" />
            <h2 className="text-lg md:text-xl font-bold text-white">Твой реферальный код</h2>
          </div>

          <Card className="relative overflow-hidden border-0 rounded-3xl group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black z-0" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />
            
            <div className="relative z-10 p-6 md:p-8 flex flex-col items-center text-center">
              <p className="text-indigo-200 text-xs font-bold tracking-[0.2em] uppercase mb-4">
                Поделись с друзьями
              </p>

              <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:animate-pulse transition-all duration-1000" />
                <p className="font-mono text-3xl md:text-4xl font-black text-white tracking-widest drop-shadow-lg select-all">
                  {stats?.myReferralCode || '...'}
                </p>
              </div>

              <Button
                onClick={copyCode}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl py-6 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
              >
                <Copy className="w-5 h-5" />
                КОПИРОВАТЬ И ПРИГЛАСИТЬ
              </Button>
              
              <p className="text-indigo-300/70 text-xs md:text-sm mt-4 max-w-[85%] mx-auto leading-relaxed">
                Друзья получат +100% бонус, а ты будешь зарабатывать <span className="text-indigo-300 font-bold">{commissionRate}%</span> с их профитов навсегда
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 4. УСЛОВИЯ ПРОГРАММЫ */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h2 className="text-lg md:text-xl font-bold text-white">Условия программы</h2>
            </div>

            {conditions.map((condition) => (
              <div key={condition.id}>
                <motion.div>
                  <button
                    onClick={() => setExpandedCondition(expandedCondition === condition.id ? null : condition.id)}
                    className="w-full text-left"
                  >
                    <Card className="p-4 md:p-5 bg-gradient-to-r from-zinc-800 to-zinc-900 border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="text-2xl mt-1">{condition.title.split(' ')[0]}</div>
                          <div className="flex-1">
                            <h3 className="font-bold text-white text-sm md:text-base">
                              {condition.title.replace(/^[^ ]+ /, '')}
                            </h3>
                            <p className="text-zinc-400 text-xs md:text-sm mt-1">{condition.description}</p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`w-5 h-5 text-zinc-400 transition-transform flex-shrink-0 ${
                            expandedCondition === condition.id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </Card>
                  </button>
                </motion.div>

                <AnimatePresence>
                  {expandedCondition === condition.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="overflow-hidden">
                        <Card className="mt-2 p-4 md:p-5 bg-zinc-900/50 border-zinc-700 border-t-0 rounded-t-none">
                          <div className="space-y-3">
                            {condition.details.map((detail, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-start gap-3"
                              >
                                <CheckCircle className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                                <span className="text-zinc-300 text-xs md:text-sm">{detail}</span>
                              </motion.div>
                            ))}
                          </div>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 5. КАК ЭТО РАБОТАЕТ */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 md:p-8 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20 border border-blue-500/20">
            <div className="flex items-start gap-3 mb-4">
              <Rocket className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <h3 className="text-lg font-bold text-white">Как начать зарабатывать?</h3>
            </div>
            
            <div className="space-y-3 text-sm md:text-base">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 text-white font-bold flex-shrink-0 text-sm">1</div>
                <p className="text-zinc-300 pt-1">Скопируй свой реферальный код и поделись с друзьями</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 text-white font-bold flex-shrink-0 text-sm">2</div>
                <p className="text-zinc-300 pt-1">Друзья вводят твой код и получают бонус +100%</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 text-white font-bold flex-shrink-0 text-sm">3</div>
                <p className="text-zinc-300 pt-1">Ты получаешь {commissionRate}% от их профитов автоматически</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500 text-white font-bold flex-shrink-0 text-sm">4</div>
                <p className="text-zinc-300 pt-1">Выводи свой доход в любой момент без комиссии</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* === MODAL: BONUS ACTIVATED === */}
      <AnimatePresence>
        {showBonusModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowBonusModal(false)}
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="relative w-full max-w-sm bg-gradient-to-br from-zinc-900 via-zinc-900 to-black rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl shadow-purple-500/50 md:rounded-3xl">
                {/* Confetti/Rays Effect Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-72 bg-gradient-to-b from-purple-500/30 via-purple-500/10 to-transparent blur-3xl" />
                
                {/* Close Button - Top Right */}
                <button 
                  onClick={() => setShowBonusModal(false)}
                  className="absolute top-4 right-4 z-20 p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-400 hover:text-white" />
                </button>

                <div className="relative p-8 text-center flex flex-col items-center pt-12">
                  
                  {/* Animated Gift Icon */}
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="relative mb-8"
                  >
                    <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 rounded-full blur-2xl opacity-50" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/50">
                      <Gift className="w-12 h-12 text-white" />
                    </div>
                  </motion.div>

                  {/* Heading */}
                  <div className="text-3xl md:text-4xl font-black text-white mb-3 uppercase tracking-tight drop-shadow-lg">
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="block"
                    >
                      БОНУС
                    </motion.span>
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="block text-yellow-400"
                    >
                      АКТИВИРОВАН!
                    </motion.span>
                  </div>
                  
                  {/* Subheading */}
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-zinc-300 text-base mb-8"
                  >
                    Поздравляем! Ты присоединился к нашей партнёрской программе
                  </motion.p>

                  {/* Bonus Details */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full space-y-3 mb-8"
                  >
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <Star className="w-6 h-6 text-yellow-400" />
                        <span className="text-white font-bold text-lg">+100% к депозиту</span>
                      </div>
                      <p className="text-zinc-400 text-sm">На первое пополнение счёта</p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <Unlock className="w-6 h-6 text-purple-400" />
                        <span className="text-white font-bold text-lg">{commissionRate}% комиссия</span>
                      </div>
                      <p className="text-zinc-400 text-sm">От прибыли всех твоих рефералов</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <Rocket className="w-6 h-6 text-green-400" />
                        <span className="text-white font-bold text-lg">Пожизненные выплаты</span>
                      </div>
                      <p className="text-zinc-400 text-sm">Зарабатывай столько, сколько захочешь</p>
                    </div>
                  </motion.div>

                  {/* Buttons */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="w-full space-y-3"
                  >
                    <Button 
                      onClick={() => setShowBonusModal(false)}
                      className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white font-black rounded-2xl shadow-lg shadow-pink-500/30 transition-all active:scale-95 uppercase"
                    >
                      <Sparkles className="w-5 h-5" />
                      ЗАБЕРУ БОНУС!
                    </Button>
                    
                    <Button 
                      onClick={() => setShowBonusModal(false)}
                      variant="outline"
                      className="w-full py-5 text-sm bg-transparent border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-2xl transition-all"
                    >
                      УЗНАТЬ УСЛОВИЯ
                    </Button>
                  </motion.div>

                  <p className="text-zinc-500 text-xs mt-6 px-4">
                    * Бонус подлежит отыгрышу в соответствии с условиями программы
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  border
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  border: string
}) {
  return (
    <Card className={`p-4 bg-gradient-to-br ${gradient} ${border} border backdrop-blur-sm transition-all hover:border-opacity-100`}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <p className="text-[10px] md:text-xs text-zinc-400 font-bold uppercase tracking-wider">
            {title}
          </p>
          <div className="opacity-80">{icon}</div>
        </div>
        <p className="text-lg md:text-2xl font-black text-white tracking-tight">
          {value}
        </p>
      </div>
    </Card>
  )
}