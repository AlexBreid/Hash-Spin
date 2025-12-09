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
} from 'lucide-react'
import { toast } from 'sonner'
import { useFetch } from '../../hooks/useDynamicApi'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

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
  const [error, setError] = useState('')
  const hasLoadedRef = useRef(false)

  const { execute: loadStats } = useFetch(
    'REFERRAL_GET_referral_stats',
    'GET'
  )

  const { execute: linkReferrer } = useFetch(
    'REFERRAL_POST_referral_link-referrer',
    'POST'
  )

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
      setError('')
    } catch (err) {
      setError('Ошибка загрузки статистики')
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
      toast.success('✅ Код успешно активирован')
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
        <Card className="p-5">
          <p>Войдите в аккаунт</p>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="pb-24 pt-6 px-4 flex justify-center items-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  const totalTurnover = toNumber(stats?.totalTurnover)
  const totalCommissionPaid = toNumber(stats?.totalCommissionPaid)
  const commissionRate = stats?.commissionRate || 30
  const referralsCount = stats?.myReferralsCount || stats?.myRefeersCount || 0

  return (
    <div className="pb-24 pt-6 px-4 space-y-4">

      {/* HERO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-7 h-7 text-amber-500" />
          <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-600 bg-clip-text text-transparent">
            Реферальная Империя
          </h1>
        </div>

        <Card className="relative p-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-white/70 text-sm mb-2 font-bold">
              ТВОЙ ЛИЧНЫЙ КОД
            </p>

            <div className="bg-white/20 rounded-xl p-5 mb-4 text-center">
              <p className="font-mono text-4xl font-black text-white tracking-widest">
                {stats?.myReferralCode || '...'}
              </p>
            </div>

            <Button
              onClick={copyCode}
              className="w-full bg-white text-indigo-700 font-bold rounded-xl py-3 flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              СКОПИРОВАТЬ
            </Button>

            <p className="text-white/70 text-xs mt-3 text-center font-medium">
              Делись кодом и получай {commissionRate}% с оборота друзей
            </p>
          </div>
        </Card>
      </motion.div>

      {/* СТАТИСТИКА */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Рефералов"
          value={referralsCount}
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="Процент"
          value={`${commissionRate}%`}
          icon={<Flame className="w-6 h-6" />}
        />
        <StatCard
          title="Оборот"
          value={`$${totalTurnover.toFixed(0)}`}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title="Заработано"
          value={`$${totalCommissionPaid.toFixed(0)}`}
          icon={<Award className="w-6 h-6" />}
        />
      </div>

      {/* ПРОДАЮЩИЙ БЛОК */}
      <Card className="p-6 bg-gradient-to-br from-black/80 to-zinc-900/80 text-white border-0">
        <h3 className="font-black text-xl mb-3">
          🚀 Одна из самых сильных рефералок на рынке
        </h3>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Ты не просто приглашаешь друзей.  
          Ты создаёшь личный источник дохода.

          Каждый твой реферал — это актив.  
          Каждый его депозит — твоё усиление.  
          Каждый его оборот — твои деньги.

          Это не «акция».  
          Это система.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
          <div className="bg-white/10 p-3 rounded-xl">
            <Sparkles className="w-4 h-4 mb-1" />
            Доход работает 24/7
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <Zap className="w-4 h-4 mb-1" />
            Начисления мгновенные
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <Award className="w-4 h-4 mb-1" />
            Без потолка по доходу
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <Flame className="w-4 h-4 mb-1" />
            Максимальный процент
          </div>
        </div>
      </Card>

      {/* БЛОК ВВОДА КОДА */}
      {!stats?.referredByCode ? (
        <Card className="p-6 bg-gradient-to-br from-rose-500/10 to-red-500/5 border-2 border-rose-500/30">
          <h3 className="font-black text-lg mb-3 text-rose-500">
            Тебя пригласили?
          </h3>

          <form onSubmit={handleLinkReferrer} className="space-y-3">
            <Input
              placeholder="Введи код"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              disabled={linking}
              className="rounded-xl"
            />

            <Button
              type="submit"
              disabled={linking || !inputCode}
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-red-600 font-bold"
            >
              {linking ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Активация...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Активировать код
                </>
              )}
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="p-6 bg-emerald-500/10 border-emerald-500/30 border-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <div>
              <p className="font-bold text-emerald-400">
                Ты уже привязан к пригласившему!
              </p>
              <p className="text-xs text-emerald-300">
                Пользователь: {stats?.referrerUsername}
              </p>
            </div>
          </div>
        </Card>
      )}

    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <Card className="p-5 bg-white/5 border-white/10">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-400 font-bold uppercase mb-1">
            {title}
          </p>
          <p className="text-2xl font-black text-white">
            {value}
          </p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl text-white">
          {icon}
        </div>
      </div>
    </Card>
  )
}
