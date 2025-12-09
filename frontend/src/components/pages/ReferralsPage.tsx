import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import {
  Users,
  Copy,
  CheckCircle,
  Loader,
  Share2
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
  const [showBonusModal, setShowBonusModal] = useState(false)
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
    } catch {
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
      toast.success('✅ Скопировано')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050f1e] flex items-center justify-center">
        <Card className="p-6 bg-white/5 text-white">
          Войдите в аккаунт
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050f1e] flex justify-center items-center">
        <Loader className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  const referralsCount =
    stats?.myReferralsCount || stats?.myRefeersCount || 0

  const totalCommissionPaid = toNumber(stats?.totalCommissionPaid)

  return (
    <div className="min-h-screen bg-[#050f1e] pb-24 pt-6 px-4 text-white space-y-4">

      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold">Реферальная программа</h1>
        <p className="text-sm text-slate-400">
          Приглашайте друзей и играйте вместе!
        </p>
      </div>

      {/* Карточки статистики */}
      <div className="flex gap-3">
        <MiniCard title="Приглашено" value={referralsCount} />
        <MiniCard title="Бонусы" value={totalCommissionPaid} color="text-emerald-400" />
      </div>

      {/* Большой блок бонусов */}
      <Card className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-700/10 border border-emerald-500/20 backdrop-blur-xl">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-400 mb-1">Доступно бонусов</p>
            <p className="text-3xl font-bold text-emerald-400">
              {totalCommissionPaid}
            </p>
          </div>

          <button className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold">
            Использовать
          </button>
        </div>
      </Card>

      {/* Ввод кода + описание бонуса наверху */}
      {!stats?.referredByCode && (
        <Card className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <p className="text-sm font-bold mb-2">
            🎁 Введи реферальный код и получи бонус
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Получи +100% к первому пополнению после активации кода
          </p>

          <form onSubmit={handleLinkReferrer} className="space-y-3">
            <Input
              placeholder="Введи код"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              disabled={linking}
              className="rounded-xl bg-white/5 border border-white/10"
            />

            <Button
              type="submit"
              disabled={linking || !inputCode}
              className="w-full rounded-xl bg-emerald-500 text-black font-bold"
            >
              {linking ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Активация...
                </>
              ) : (
                'Активировать код'
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* Если уже привязан */}
      {stats?.referredByCode && (
        <Card className="p-5 rounded-2xl bg-emerald-500/10 border-emerald-500/30 border">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <div>
              <p className="font-bold text-emerald-400">
                Бонус активирован
              </p>
              <p className="text-xs text-emerald-300">
                Пригласил: {stats?.referrerUsername}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Реферальная ссылка */}
      <Card className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <p className="text-sm font-bold mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Ваша реферальная ссылка
        </p>

        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3">
          <span className="text-xs truncate text-slate-300 flex-1">
            https://game-portal.com/ref/{stats?.myReferralCode}
          </span>
          <Copy className="w-4 h-4 text-slate-400 cursor-pointer" onClick={copyCode}/>
        </div>

        <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <span className="text-sm font-mono flex-1 text-white">
            {stats?.myReferralCode}
          </span>
          <Copy className="w-4 h-4 text-slate-400 cursor-pointer" onClick={copyCode}/>
        </div>
      </Card>

      {/* МОДАЛКА С БОНУСОМ */}
      {showBonusModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#050f1e] p-6 rounded-2xl border border-white/10 max-w-sm w-full"
          >
            <h3 className="text-xl font-bold mb-2 text-emerald-400">
              🎉 Бонус активирован
            </h3>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Вам доступен бонус <b>+100% к первому депозиту</b>.
              Пополните баланс и получите удвоенную сумму!
            </p>

            <button
              onClick={() => setShowBonusModal(false)}
              className="w-full py-2 rounded-xl bg-emerald-500 text-black font-bold"
            >
              Понятно
            </button>
          </motion.div>
        </div>
      )}

    </div>
  )
}

function MiniCard({
  title,
  value,
  color = 'text-blue-400'
}: {
  title: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
      <p className="text-xs text-slate-400 mb-1">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
