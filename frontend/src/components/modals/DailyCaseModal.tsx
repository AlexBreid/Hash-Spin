import React, { useState, useEffect } from 'react';
import { X, Gift, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface DailyCaseModalProps {
  onClose: () => void;
  token: string | null;
  onClaimed?: () => void;
}

interface StatusData {
  canClaim: boolean;
  nextAt: string | null;
  hasRewards: boolean;
}

interface RewardData {
  id: number;
  rewardType: string;
  label: string;
  amount: number | null;
  symbol?: string;
  bonus?: { code: string; name: string; percentage?: number; isFreebet?: boolean; freebetAmount?: number | null };
}

export function DailyCaseModal({ onClose, token, onClaimed }: DailyCaseModalProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<RewardData | null>(null);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-case/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) setStatus(json.data);
      }
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [token]);

  const handleOpen = async () => {
    if (!token || !status?.canClaim || opening) return;
    setOpening(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/daily-case/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (res.ok && json.success && json.data?.reward) {
        setReward(json.data.reward);
        setStatus((s) => s ? { ...s, canClaim: false, nextAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() } : null);
        onClaimed?.();
      } else {
        toast.error(json.error || 'Не удалось открыть кейс');
      }
    } catch {
      toast.error('Ошибка открытия кейса');
    } finally {
      setOpening(false);
    }
  };

  const nextAtFormatted = status?.nextAt
    ? new Date(status.nextAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-b from-[#1a1f35] to-[#0f1419] rounded-3xl border border-purple-500/30 shadow-2xl max-w-[340px] w-full overflow-hidden">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-400" />
              Ежедневный кейс
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : reward ? (
            <div className="py-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center mb-3">
                  <span className="text-3xl">🎁</span>
                </div>
                <p className="text-green-400 font-bold text-lg">Поздравляем!</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white font-semibold">{reward.label}</p>
                {reward.rewardType === 'BALANCE_TOPUP' && reward.amount != null && (
                  <p className="text-green-400 mt-1">
                    +{reward.amount} {reward.symbol || 'USDT'} на основной счёт
                  </p>
                )}
                {reward.rewardType === 'DEPOSIT_BONUS' && reward.bonus && (
                  <p className="text-purple-400 mt-1">
                    {reward.bonus.freebetAmount != null ? `+${reward.bonus.freebetAmount} на бонусный счёт` : `${reward.bonus.name}`}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full mt-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors"
              >
                Закрыть
              </button>
            </div>
          ) : !status?.hasRewards ? (
            <p className="text-gray-400 text-center py-6">Награды пока не настроены.</p>
          ) : status.canClaim ? (
            <>
              <p className="text-gray-300 text-sm text-center mb-4">
                Откройте кейс и получите случайную награду: пополнение на счёт или бонус к пополнению.
              </p>
              <button
                onClick={handleOpen}
                disabled={opening}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all"
              >
                {opening ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Открыть кейс</>}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-400 text-sm text-center mb-4">
                Вы уже открывали кейс сегодня. Следующая возможность:
              </p>
              <p className="text-center text-purple-300 font-semibold mb-4">{nextAtFormatted}</p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
              >
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
