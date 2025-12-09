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
  ArrowRight
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
      
      // Успех! Показываем модалку и обновляем данные
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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black italic bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent uppercase tracking-tighter">
          Партнёрская
          <br />
          <span className="text-white text-2xl not-italic font-bold tracking-normal">Панель</span>
        </h1>
      </motion.div>

      {/* 1. БЛОК ВВОДА КОДА (ВВЕРХУ, КАК ПРОСИЛИ) */}
      {!stats?.referredByCode ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative p-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 border-0 rounded-2xl shadow-2xl shadow-pink-500/20">
            <div className="absolute -top-3 -right-3">
              <span className="relative flex h-8 w-8">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-8 w-8 bg-yellow-500 items-center justify-center">
                  <Gift className="w-4 h-4 text-white" />
                </span>
              </span>
            </div>
            
            <div className="bg-zinc-950 rounded-xl p-5">
              <div className="mb-4">
                <h3 className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  ПОЛУЧИТЬ БОНУС
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Введи реферальный код пригласившего, чтобы активировать <span className="text-white font-bold">Starter Pack</span> и бонусы.
                </p>
              </div>

              <form onSubmit={handleLinkReferrer} className="flex gap-2">
                <Input
                  placeholder="ВВЕДИ КОД..."
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  disabled={linking}
                  className="bg-zinc-900/50 border-zinc-700 focus:border-pink-500 text-lg font-mono tracking-widest uppercase h-12 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={linking || !inputCode}
                  className="h-12 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold shadow-lg shadow-orange-500/20"
                >
                  {linking ? <Loader className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                </Button>
              </form>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/30 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
             </div>
             <div>
               <p className="text-xs text-green-400 uppercase font-bold tracking-wider">Ваш наставник</p>
               <p className="text-white font-bold text-sm">{stats.referrerUsername || stats.referredByCode}</p>
             </div>
          </div>
          <div className="px-3 py-1 bg-green-500/10 rounded-lg border border-green-500/20 text-[10px] text-green-300">
            АКТИВИРОВАНО
          </div>
        </motion.div>
      )}

      {/* 2. СТАТИСТИКА (СЕТКА) */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* 3. КАРТОЧКА С МОИМ КОДОМ (ВНИЗУ) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
         <div className="flex items-center gap-2 mb-3 px-1">
            <Crown className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Для друзей</h2>
         </div>

        <Card className="relative overflow-hidden border-0 rounded-3xl group">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black z-0" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />
          
          <div className="relative z-10 p-6 flex flex-col items-center text-center">
            <p className="text-indigo-200 text-xs font-bold tracking-[0.2em] uppercase mb-4">
              Твой личный код
            </p>

            <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-5 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:animate-shine transition-all duration-1000" />
               <p className="font-mono text-4xl font-black text-white tracking-widest drop-shadow-lg">
                 {stats?.myReferralCode || '...'}
               </p>
            </div>

            <Button
              onClick={copyCode}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl py-6 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
            >
              <Copy className="w-5 h-5" />
              СКОПИРОВАТЬ И ПРИГЛАСИТЬ
            </Button>
            
            <p className="text-indigo-300/60 text-[10px] mt-4 max-w-[80%] mx-auto">
              Ты получаешь {commissionRate}% от прибыли системы с каждого приведенного друга. Навсегда.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* 4. ИНФОБЛОК */}
      <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800">
         <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> Как это работает?
         </h3>
         <p className="text-zinc-400 text-sm leading-relaxed">
            Система автоматически начисляет проценты с каждого оборота твоих рефералов. Чем больше сеть — тем выше уровень и процент выплат.
         </p>
      </div>

      {/* === MODAL: BONUS ACTIVATED === */}
      <AnimatePresence>
        {showBonusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
               initial={{ scale: 0.5, opacity: 0, rotateX: 20 }}
               animate={{ scale: 1, opacity: 1, rotateX: 0 }}
               exit={{ scale: 0.5, opacity: 0, rotateX: -20 }}
               transition={{ type: "spring", damping: 25, stiffness: 300 }}
               className="relative w-full max-w-sm bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl shadow-purple-500/20"
             >
                {/* Confetti/Rays Effect Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-purple-500/20 to-transparent blur-3xl" />
                
                <div className="relative p-8 text-center flex flex-col items-center">
                   <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 animate-bounce-slow">
                      <Gift className="w-10 h-10 text-white" />
                   </div>

                   <h2 className="text-2xl font-black text-white mb-2 uppercase italic transform -skew-x-6">
                      Код Активирован!
                   </h2>
                   
                   <p className="text-zinc-300 text-sm mb-6">
                      Поздравляем! Ты присоединился к команде. Твой стартовый бонус готов к выдаче.
                   </p>

                   <div className="w-full bg-zinc-800/50 rounded-xl p-4 mb-6 border border-zinc-700/50">
                      <div className="flex items-center gap-3 mb-2">
                         <CheckCircle className="w-5 h-5 text-green-500" />
                         <span className="text-white font-bold text-sm">+100% к депозиту</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <CheckCircle className="w-5 h-5 text-green-500" />
                         <span className="text-white font-bold text-sm">Доступ к турнирам</span>
                      </div>
                   </div>

                   <Button 
                      onClick={() => setShowBonusModal(false)}
                      className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25"
                   >
                      ЗАБРАТЬ БОНУС
                   </Button>
                </div>
                
                {/* Close Button */}
                <button 
                  onClick={() => setShowBonusModal(false)}
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
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
    <Card className={`p-4 bg-gradient-to-br ${gradient} ${border} border backdrop-blur-sm`}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
           <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
             {title}
           </p>
           <div className="opacity-80">{icon}</div>
        </div>
        <p className="text-xl font-black text-white tracking-tight">
          {value}
        </p>
      </div>
    </Card>
  )
}