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
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const [inputCode, setInputCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBonusModal, setShowBonusModal] = useState(false)
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
        </motion.div>
      </div>

      {/* ✅ ВВОД КОДА - показывается только если НЕТ реферера */}
      {!stats?.referredByCode && (
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
                      И получи <span className="font-bold text-yellow-400">эксклюзивный бонус</span>
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
                          АКТИВИРОВАТЬ
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>
      )}

      {/* ✅ АКТИВИРОВАН БЛОК - показывается только если ЕСТЬ реферер */}
      {stats?.referredByCode && (
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

      {/* ✅ СТАТИСТИКА - показывается ВСЕГДА */}
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
              title="СТАВКА"
              value={`${commissionRate}%`}
              icon={<Flame className="w-5 h-5 text-red-400" />}
              gradient="from-red-500/10 to-rose-500/10"
              border="border-red-500/20"
            />
          </div>
        </motion.div>
      </div>

      {/* ✅ МОЙ КОД - показывается ВСЕГДА */}
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
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ✅ КРАТКАЯ ИНФА О РЕФЕРАЛАХ - показывается ВСЕГДА */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-2">Зарабатывай на рефералах</h3>
                <p className="text-zinc-300 text-sm mb-4">30% от преимущества казино каждого реферала, пожизненно</p>
                <Button 
                  onClick={() => navigate('/support?section=referral')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                >
                  Подробнее о расчётах
                </Button>
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
                    Поздравляем! Ты присоединился к нашей программе
                  </motion.p>

                  {/* Bonus Details */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full space-y-3 mb-8"
                  >
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <span className="text-white font-bold">Стартовый бонус</span>
                      </div>
                      <p className="text-zinc-400 text-xs">Узнай подробнее в условиях</p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <Unlock className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-bold">Комиссия реферала</span>
                      </div>
                      <p className="text-zinc-400 text-xs">От преимущества казино</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <Rocket className="w-5 h-5 text-green-400" />
                        <span className="text-white font-bold">Пожизненно</span>
                      </div>
                      <p className="text-zinc-400 text-xs">Без ограничений</p>
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
                      <Sparkles className="w-5 h-5 mr-2" />
                      ОК
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        setShowBonusModal(false)
                        navigate('/support?section=bonus')
                      }}
                      variant="outline"
                      className="w-full py-5 text-sm bg-transparent border-zinc-600 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-2xl transition-all"
                    >
                      УЗНАТЬ УСЛОВИЯ
                    </Button>
                  </motion.div>
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