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
  Rocket,
  Send,
  ExternalLink
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

interface Referral {
  id: number
  username: string
  firstName: string | null
  joinedAt: string
  totalTurnover: number
  commissionEarned: number
  totalLosses: number
  referralsCount: number
}

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const num = parseFloat(String(value))
  return isNaN(num) ? 0 : num
}

// 🎨 CSS переменные для темы
const getThemeColors = () => ({
  background: 'var(--background)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  success: 'var(--success)',
  border: 'var(--border)',
})

export function ReferralsPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [inputCode, setInputCode] = useState('')
  const [linking, setLinking] = useState(false)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loadingReferrals, setLoadingReferrals] = useState(false)
  const hasLoadedRef = useRef(false)

  const { execute: loadStats } = useFetch('REFERRAL_GET_referral_stats', 'GET')
  const { execute: linkReferrer } = useFetch('REFERRAL_POST_referral_link-referrer', 'POST')
  const { execute: loadReferrals } = useFetch('REFERRAL_GET_referral_my-referrals', 'GET')

  const colors = getThemeColors()

  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadStatsData()
      loadReferralsData()
    }
  }, [isAuthenticated])

  // Обновляем статистику каждые 30 секунд
  useEffect(() => {
    if (!isAuthenticated) return
    
    const interval = setInterval(() => {
      loadStatsData()
      loadReferralsData()
    }, 30000) // 30 секунд

    return () => clearInterval(interval)
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

  const loadReferralsData = async () => {
    try {
      setLoadingReferrals(true)
      const result = await loadReferrals()
      if (result?.data?.referrals) {
        setReferrals(result.data.referrals)
      }
    } catch (err) {
      console.error('Ошибка загрузки рефералов:', err)
    } finally {
      setLoadingReferrals(false)
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
      await loadReferralsData()
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

  const copyTelegramLink = async () => {
    if (!stats?.myReferralCode) return
    
    const telegramLink = `https://t.me/SafariUpbot?start=ref_${stats.myReferralCode}`
    
    try {
      // Пробуем использовать современный API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(telegramLink)
        toast.success('✅ Ссылка на Telegram бота скопирована')
      } else {
        // Fallback для старых браузеров и мобильных устройств
        const textArea = document.createElement('textarea')
        textArea.value = telegramLink
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          const successful = document.execCommand('copy')
          if (successful) {
            toast.success('✅ Ссылка на Telegram бота скопирована')
          } else {
            throw new Error('Copy command failed')
          }
        } catch (err) {
          // Если и это не сработало, показываем ссылку для ручного копирования
          toast.error('Не удалось скопировать. Ссылка: ' + telegramLink)
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (err) {
      // Если ничего не сработало, показываем ссылку
      toast.error('Не удалось скопировать. Ссылка: ' + telegramLink)
    }
  }

  const openTelegramLink = () => {
    if (stats?.myReferralCode) {
      const telegramLink = `https://t.me/SafariUpbot?start=ref_${stats.myReferralCode}`
      window.open(telegramLink, '_blank')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="pb-24 pt-6 px-4">
        <Card className="p-5 border transition-colors" style={{ backgroundColor: colors.card, color: colors.foreground }}>
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
    <div className="pb-32 pt-6 px-4 space-y-6 relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: colors.background }}>
      
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
            <span style={{ color: colors.foreground }} className="text-xl md:text-2xl not-italic font-bold tracking-normal">Программа</span>
          </h1>
        </motion.div>
      </div>

      {/* ✅ ВВОД КОДА - показывается только если НЕТ реферера */}
      {!stats?.referredByCode && (
        <div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div className="relative">
              {/* Пульсирующий фон */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 animate-pulse" />
              
              <Card className="relative bg-gradient-to-br border-0 rounded-2xl overflow-hidden shadow-2xl transition-colors" style={{ backgroundColor: colors.card }}>
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
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2" style={{ color: colors.foreground }}>
                      ВВЕДИ ПРОМОКОД
                    </h2>
                    <p style={{ color: colors.mutedForeground }} className="text-sm md:text-base">
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
                        className="border-2 focus:border-yellow-400 text-center text-xl md:text-2xl font-black tracking-widest uppercase h-14 md:h-16 rounded-xl transition-all"
                        style={{ 
                          color: colors.foreground,
                          backgroundColor: colors.background,
                          borderColor: colors.border
                        }}
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
            transition={{ delay: 0.05 }}
          >
            <div className="p-4 md:p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-900/20 border border-green-500/30 flex items-center justify-between transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-green-400 uppercase font-bold tracking-wider">Ваш наставник</p>
                  <p style={{ color: colors.foreground }} className="font-bold">{stats.referrerUsername || stats.referredByCode}</p>
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
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <StatCard
              title="МОЯ КОМАНДА"
              value={referralsCount}
              icon={<Users className="w-5 h-5 text-cyan-400" />}
              gradient="from-cyan-500/10 to-blue-500/10"
              border="border-cyan-500/20"
              colors={colors}
            />
            <StatCard
              title="МОЙ ДОХОД"
              value={`$${totalCommissionPaid.toFixed(0)}`}
              icon={<Award className="w-5 h-5 text-yellow-400" />}
              gradient="from-yellow-500/10 to-orange-500/10"
              border="border-yellow-500/20"
              colors={colors}
            />
            <StatCard
              title="ОБОРОТ СЕТИ"
              value={`$${totalTurnover.toFixed(0)}`}
              icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
              gradient="from-purple-500/10 to-pink-500/10"
              border="border-purple-500/20"
              colors={colors}
            />
            <StatCard
              title="СТАВКА"
              value={`${commissionRate}%`}
              icon={<Flame className="w-5 h-5 text-red-400" />}
              gradient="from-red-500/10 to-rose-500/10"
              border="border-red-500/20"
              colors={colors}
            />
          </div>
        </motion.div>
      </div>

      {/* ✅ МОЙ КОД - показывается ВСЕГДА */}
      <div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-4 px-1">
            <Crown className="w-6 h-6 text-indigo-400" />
            <h2 style={{ color: colors.foreground }} className="text-lg md:text-xl font-bold">Твой реферальный код</h2>
          </div>

          <Card className="relative overflow-hidden border-0 rounded-3xl group transition-colors" style={{ backgroundColor: colors.card }}>
            {/* Динамический фон в зависимости от темы */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black dark:from-indigo-900 dark:via-purple-900 dark:to-black from-indigo-100 via-purple-100 to-white z-0" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 mix-blend-overlay" />
            
            <div className="relative z-10 p-6 md:p-8 flex flex-col items-center text-center">
              <p style={{ color: colors.mutedForeground }} className="text-xs font-bold tracking-[0.2em] uppercase mb-4">
                Поделись с друзьями
              </p>

              <div style={{ 
                backgroundColor: colors.background,
                borderColor: colors.border
              }} className="w-full backdrop-blur-md border rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-100%] group-hover:animate-pulse transition-all duration-1000" />
                <p style={{ color: colors.foreground }} className="font-mono text-3xl md:text-4xl font-black tracking-widest drop-shadow-lg select-all mb-4">
                  {stats?.myReferralCode || '...'}
                </p>
                
                {/* Telegram ссылка */}
                {stats?.myReferralCode && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
                    <p style={{ color: colors.mutedForeground }} className="text-xs mb-2">
                      Ссылка на Telegram бота:
                    </p>
                    <div 
                      className="flex items-center gap-2 p-3 rounded-lg cursor-pointer active:opacity-80 transition-opacity touch-manipulation"
                      style={{ backgroundColor: colors.card, WebkitTapHighlightColor: 'transparent' }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        copyTelegramLink()
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation()
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        copyTelegramLink()
                      }}
                      title="Нажмите чтобы скопировать ссылку"
                    >
                      <Send className="w-4 h-4 flex-shrink-0" style={{ color: colors.foreground }} />
                      <div
                        className="text-sm font-mono flex-1 truncate select-all pointer-events-none"
                        style={{ color: '#0088cc', userSelect: 'all', WebkitUserSelect: 'all' }}
                      >
                        t.me/SafariUpbot?start=ref_{stats.myReferralCode}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copyTelegramLink()
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          copyTelegramLink()
                        }}
                        className="p-2 rounded hover:opacity-80 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
                        style={{ backgroundColor: colors.background }}
                        title="Скопировать ссылку"
                      >
                        <Copy className="w-4 h-4" style={{ color: colors.foreground }} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openTelegramLink()
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openTelegramLink()
                        }}
                        className="p-2 rounded hover:opacity-80 active:scale-95 transition-all flex-shrink-0 touch-manipulation"
                        style={{ backgroundColor: colors.background }}
                        title="Открыть в Telegram"
                      >
                        <ExternalLink className="w-4 h-4" style={{ color: colors.foreground }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={copyCode}
                className="w-full text-white font-bold rounded-xl py-6 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                  color: 'white'
                }}
              >
                <Copy className="w-5 h-5" />
                КОПИРОВАТЬ КОД И ПРИГЛАСИТЬ
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
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 transition-colors" style={{ color: colors.foreground }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">Зарабатывай на рефералах</h3>
                <p style={{ color: colors.mutedForeground }} className="text-sm mb-4">30% от преимущества казино каждого реферала, пожизненно</p>
                <Button 
                  onClick={() => navigate('/support?section=referral')}
                  className="w-full text-white font-bold rounded-lg text-sm"
                  style={{
                    background: 'linear-gradient(to right, #7c3aed, #8b5cf6)',
                    color: 'white'
                  }}
                >
                  Подробнее о расчётах
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ✅ СПИСОК РЕФЕРАЛОВ - показывается если есть рефералы */}
      {referrals.length > 0 && (
        <div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-4 px-1">
              <Users className="w-6 h-6 text-cyan-400" />
              <h2 style={{ color: colors.foreground }} className="text-lg md:text-xl font-bold">Мои рефералы</h2>
              <span style={{ color: colors.mutedForeground }} className="text-sm">({referrals.length})</span>
            </div>

            <div className="space-y-3">
              {loadingReferrals ? (
                <Card className="p-6 flex items-center justify-center" style={{ backgroundColor: colors.card }}>
                  <Loader className="w-6 h-6 animate-spin text-cyan-500" />
                </Card>
              ) : (
                referrals.map((referral) => (
                  <Card 
                    key={referral.id} 
                    className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20 transition-colors hover:border-cyan-500/40"
                    style={{ backgroundColor: colors.card }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p style={{ color: colors.foreground }} className="font-bold text-base">
                            {referral.username || referral.firstName || `User #${referral.id}`}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span style={{ color: colors.mutedForeground }}>Оборот: </span>
                            <span style={{ color: colors.foreground }} className="font-semibold">
                              ${referral.totalTurnover.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: colors.mutedForeground }}>Комиссия: </span>
                            <span style={{ color: colors.foreground }} className="font-semibold">
                              ${referral.commissionEarned.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1">
                        <div className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span style={{ color: colors.foreground }} className="font-bold text-sm">
                              {referral.referralsCount || 0}
                            </span>
                          </div>
                          <p style={{ color: colors.mutedForeground }} className="text-[10px] uppercase tracking-wider mt-0.5">
                            Рефералов
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}

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
              <div className="relative w-full max-w-sm bg-gradient-to-br from-zinc-900 via-zinc-900 to-black rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl shadow-purple-500/50 md:rounded-3xl transition-colors" style={{ backgroundColor: colors.card }}>
                {/* Confetti/Rays Effect Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-72 bg-gradient-to-b from-purple-500/30 via-purple-500/10 to-transparent blur-3xl" />
                
                {/* Close Button - Top Right */}
                <button 
                  onClick={() => setShowBonusModal(false)}
                  className="absolute top-4 right-4 z-20 p-2 hover:bg-zinc-800 rounded-full transition-colors"
                  style={{ color: colors.mutedForeground }}
                >
                  <X className="w-6 h-6" />
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
                  <div className="text-3xl md:text-4xl font-black uppercase tracking-tight drop-shadow-lg" style={{ color: colors.foreground }}>
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
                    style={{ color: colors.mutedForeground }}
                    className="text-base mb-8"
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
                        <span style={{ color: colors.foreground }} className="font-bold">Стартовый бонус</span>
                      </div>
                      <p style={{ color: colors.mutedForeground }} className="text-xs">Узнай подробнее в условиях</p>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <Unlock className="w-5 h-5 text-purple-400" />
                        <span style={{ color: colors.foreground }} className="font-bold">Комиссия реферала</span>
                      </div>
                      <p style={{ color: colors.mutedForeground }} className="text-xs">От преимущества казино</p>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-1">
                        <Rocket className="w-5 h-5 text-green-400" />
                        <span style={{ color: colors.foreground }} className="font-bold">Пожизненно</span>
                      </div>
                      <p style={{ color: colors.mutedForeground }} className="text-xs">Без ограничений</p>
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
                      className="w-full py-5 text-sm rounded-2xl transition-all font-bold"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: '#3b82f6',
                        color: '#3b82f6',
                        border: '2px solid'
                      }}
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
  border,
  colors
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  gradient: string
  border: string
  colors: ReturnType<typeof getThemeColors>
}) {
  return (
    <Card className={`p-4 bg-gradient-to-br ${gradient} ${border} border backdrop-blur-sm transition-all hover:border-opacity-100`} style={{ color: colors.foreground }}>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <p style={{ color: colors.mutedForeground }} className="text-[10px] md:text-xs font-bold uppercase tracking-wider">
            {title}
          </p>
          <div className="opacity-80">{icon}</div>
        </div>
        <p className="text-lg md:text-2xl font-black tracking-tight" style={{ color: colors.foreground }}>
          {value}
        </p>
      </div>
    </Card>
  )
}