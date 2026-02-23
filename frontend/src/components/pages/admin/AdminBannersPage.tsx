import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Gift, 
  Save, 
  X,
  ArrowLeft,
  GripVertical,
  Type,
  Upload,
  CheckCircle,
  RefreshCw,
  Tag,
  Clock,
  Users,
  Edit3,
  MessageSquare,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { toast } from 'sonner';

interface Banner {
  id: number;
  imageUrl: string;
  title?: string;
  text?: string;
  buttonText?: string;
  linkUrl?: string;
  actionType: 'LINK' | 'BONUS' | 'NONE';
  bonusId?: number;
  bonus?: {
    id: number;
    code: string;
    name: string;
    percentage: number;
  };
  isActive: boolean;
  priority: number;
}

interface BonusTemplate {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isFreebet?: boolean;
  freebetAmount?: string | null;
  percentage: number;
  wagerMultiplier: number;
  minDeposit: string;
  maxDeposit: string | null;
  maxUsages: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  _count?: { usages: number };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const resolveImg = (url: string) =>
  url?.startsWith('/') ? `${API_URL}${url}` : url;

export function AdminBannersPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bonuses, setBonuses] = useState<BonusTemplate[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<'banners' | 'bonuses'>('banners');

  // Banner form
  const [bannerMode, setBannerMode] = useState<'content' | 'image'>('content');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    imageUrl: '',
    title: '',
    text: '',
    buttonText: '',
    actionType: 'NONE' as 'LINK' | 'BONUS' | 'NONE',
    linkUrl: '',
    bonusId: undefined as number | undefined,
  });

  // Bonus form
  const [isCreatingBonus, setIsCreatingBonus] = useState(false);
  const [editingBonus, setEditingBonus] = useState<BonusTemplate | null>(null);
  const [bonusSaving, setBonusSaving] = useState(false);
  const [bonusForm, setBonusForm] = useState({
    code: '',
    name: '',
    description: '',
    isFreebet: false,
    freebetAmount: '',
    percentage: '100',
    wagerMultiplier: '10',
    minDeposit: '0',
    maxDeposit: '',
    maxUsages: '',
    expiresAt: '',
    isActive: true,
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isCreating || isCreatingBonus) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCreating, isCreatingBonus]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated]);

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const h = headers();
      const [bRes, bonRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/banners`, { headers: h }),
        fetch(`${API_URL}/api/admin/bonuses`, { headers: h })
      ]);
      if (bRes.ok) {
        const r = await bRes.json();
        const d = r.success ? r.data : (Array.isArray(r) ? r : []);
        setBanners(Array.isArray(d) ? d : []);
      }
      if (bonRes.ok) {
        const r = await bonRes.json();
        const d = r.success ? r.data : (Array.isArray(r) ? r : []);
        setBonuses(Array.isArray(d) ? d : []);
      }
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // ── BONUS CRUD ──
  const resetBonusForm = () => {
    setBonusForm({ code: '', name: '', description: '', isFreebet: false, freebetAmount: '', percentage: '100', wagerMultiplier: '10', minDeposit: '0', maxDeposit: '', maxUsages: '', expiresAt: '', isActive: true });
    setEditingBonus(null);
  };

  const openEditBonus = (b: BonusTemplate) => {
    setEditingBonus(b);
    setBonusForm({
      code: b.code,
      name: b.name,
      description: b.description || '',
      isFreebet: b.isFreebet || false,
      freebetAmount: b.freebetAmount ? String(parseFloat(b.freebetAmount)) : '',
      percentage: String(b.percentage),
      wagerMultiplier: String(b.wagerMultiplier),
      minDeposit: String(parseFloat(b.minDeposit || '0')),
      maxDeposit: b.maxDeposit ? String(parseFloat(b.maxDeposit)) : '',
      maxUsages: b.maxUsages !== null ? String(b.maxUsages) : '',
      expiresAt: b.expiresAt ? b.expiresAt.slice(0, 16) : '',
      isActive: b.isActive,
    });
    setIsCreatingBonus(true);
  };

  const saveBonus = async () => {
    if (!bonusForm.code.trim() || !bonusForm.name.trim()) {
      toast.error('Укажите код и название');
      return;
    }
    setBonusSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: bonusForm.code.trim().toUpperCase(),
        name: bonusForm.name.trim(),
        description: bonusForm.description || null,
        isFreebet: bonusForm.isFreebet,
        freebetAmount: bonusForm.isFreebet && bonusForm.freebetAmount ? parseFloat(bonusForm.freebetAmount) : null,
        percentage: bonusForm.isFreebet ? 0 : (parseInt(bonusForm.percentage) || 100),
        wagerMultiplier: parseInt(bonusForm.wagerMultiplier) || 10,
        minDeposit: bonusForm.isFreebet ? 0 : (parseFloat(bonusForm.minDeposit) || 0),
        maxDeposit: bonusForm.isFreebet ? null : (bonusForm.maxDeposit ? parseFloat(bonusForm.maxDeposit) : null),
        maxUsages: bonusForm.maxUsages ? parseInt(bonusForm.maxUsages) : null,
        expiresAt: bonusForm.expiresAt || null,
        isActive: bonusForm.isActive,
      };

      const isEdit = !!editingBonus;
      const url = isEdit
        ? `${API_URL}/api/admin/bonuses/${editingBonus.id}`
        : `${API_URL}/api/admin/bonuses`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || e.message || 'Ошибка');
      }

      toast.success(isEdit ? 'Промокод обновлён' : 'Промокод создан');
      setIsCreatingBonus(false);
      resetBonusForm();
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setBonusSaving(false);
    }
  };

  const deleteBonus = async (id: number) => {
    if (!confirm('Удалить этот промокод?')) return;
    try {
      await fetch(`${API_URL}/api/admin/bonuses/${id}`, { method: 'DELETE', headers: headers() });
      toast.success('Промокод удалён');
      fetchData();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleReorder = async (newOrder: Banner[]) => {
    setBanners(newOrder);
    try {
      await fetch(`${API_URL}/api/admin/banners/reorder`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ bannerIds: newOrder.map(b => b.id) })
      });
    } catch {
      toast.error('Ошибка сохранения порядка');
      fetchData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить этот баннер?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: headers()
      });
      if (res.ok) {
        setBanners(prev => prev.filter(b => b.id !== id));
        toast.success('Баннер удалён');
      } else {
        toast.error('Ошибка при удалении');
      }
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const resetForm = () => {
    setFormData({ imageUrl: '', title: '', text: '', buttonText: '', actionType: 'NONE', linkUrl: '', bonusId: undefined });
    setImagePreview('');
    setBannerMode('content');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Макс. 5 МБ');
      return;
    }
    setUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setImagePreview(localUrl);

      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch(`${API_URL}/api/admin/upload-banner-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        const result = await res.json();
        const imageUrl = result.data?.imageUrl || result.imageUrl;
        setFormData(prev => ({ ...prev, imageUrl }));
        toast.success('Загружено');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Ошибка загрузки');
        setImagePreview('');
      }
    } catch {
      toast.error('Ошибка загрузки');
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (bannerMode === 'image' && !formData.imageUrl) {
      toast.error('Загрузите изображение');
      return;
    }
    if (bannerMode === 'content' && !formData.title && !formData.text) {
      toast.error('Заполните заголовок или текст');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        imageUrl: formData.imageUrl || '',
        title: formData.title || '',
        text: formData.text || '',
        buttonText: formData.buttonText || '',
        actionType: formData.actionType,
        linkUrl: formData.linkUrl || '',
        isActive: true,
        priority: banners.length + 1,
      };
      if (formData.actionType === 'BONUS' && formData.bonusId) {
        body.bonusId = formData.bonusId;
      }

      const res = await fetch(`${API_URL}/api/admin/banners`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const result = await res.json();
        setBanners(prev => [result.success ? result.data : result, ...prev]);
        setIsCreating(false);
        resetForm();
        toast.success('Баннер создан!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Ошибка создания');
      }
    } catch {
      toast.error('Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0b0e14]">
        <Loader2 className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0b0e14] text-white pb-[env(safe-area-inset-bottom)]">

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-30 bg-gradient-to-b from-[#0b0e14] via-[#0b0e14]/98 to-[#0b0e14]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20">
        <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-all duration-200 group"
            >
              <ArrowLeft size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            </button>
            <div>
              <h1 className="text-lg font-bold leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {activeTab === 'banners' ? 'Баннеры' : 'Промокоды'}
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                {activeTab === 'banners' ? `${banners.length} шт.` : `${bonuses.length} шт.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'banners') {
                resetForm(); setIsCreating(true);
              } else {
                resetBonusForm(); setIsCreatingBonus(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-[13px] font-semibold transition-all duration-200 shadow-lg shadow-blue-500/30 touch-manipulation"
          >
            <Plus size={16} strokeWidth={2.5} />
            Создать
          </button>
        </div>
        {/* ── TABS ── */}
        <div className="flex max-w-lg mx-auto px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 touch-manipulation relative overflow-hidden ${
              activeTab === 'banners'
                ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-blue-500/10 border border-blue-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 active:bg-white/10'
            }`}
          >
            <ImageIcon size={14} className="inline mr-1.5 -mt-0.5" />
            Баннеры
            {activeTab === 'banners' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bonuses')}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 touch-manipulation relative overflow-hidden ${
              activeTab === 'bonuses'
                ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white shadow-lg shadow-purple-500/10 border border-purple-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5 active:bg-white/10'
            }`}
          >
            <Tag size={14} className="inline mr-1.5 -mt-0.5" />
            Промокоды
            {activeTab === 'bonuses' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── СПИСОК ПРОМОКОДОВ ── */}
      {activeTab === 'bonuses' && (
        <div className="max-w-lg mx-auto px-4 py-4">
          {bonuses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-gray-500"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-4 border border-purple-500/20">
                <Tag size={32} className="text-purple-400" />
              </div>
              <p className="font-semibold text-gray-300 text-base mb-1">Нет промокодов</p>
              <p className="text-xs text-gray-500">Нажмите «Создать» чтобы добавить</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {bonuses.map((b, index) => {
                const isExpired = b.expiresAt && new Date(b.expiresAt) < new Date();
                const isFull = b.maxUsages !== null && b.usedCount >= b.maxUsages;
                const statusColor = !b.isActive 
                  ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
                  : isExpired 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : isFull 
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                  : 'bg-green-500/20 text-green-400 border-green-500/30';
                const statusText = !b.isActive ? 'Неактивен' : isExpired ? 'Истёк' : isFull ? 'Лимит' : 'Активен';
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-2xl bg-gradient-to-br from-[#12151d] to-[#0f1219] border border-white/[0.08] p-4 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-[13px] font-mono font-bold tracking-wider border border-indigo-500/30 shadow-sm">
                            {b.code}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${statusColor}`}>
                            {statusText}
                          </span>
                          {b.isFreebet && (
                            <span className="px-2 py-1 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-[11px] font-semibold border border-green-500/30">
                              🎁 Фрибет
                            </span>
                          )}
                        </div>
                        <p className="text-[15px] font-bold text-white mb-1 truncate">{b.name}</p>
                        {b.description && (
                          <p className="text-[12px] text-gray-400 mt-1 line-clamp-2">{b.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {b.isFreebet ? (
                            <span className="text-[13px] text-green-400 font-bold flex items-center gap-1">
                              <Gift size={12} /> {b.freebetAmount || 0} USDT
                            </span>
                          ) : (
                            <span className="text-[13px] text-purple-400 font-bold">+{b.percentage}%</span>
                          )}
                          <span className="text-[11px] text-gray-400 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                            <Gift size={11} /> x{b.wagerMultiplier}
                          </span>
                          {b.maxUsages !== null && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                              <Users size={11} /> {b.usedCount}/{b.maxUsages}
                            </span>
                          )}
                          {b.expiresAt && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                              <Clock size={11} /> {new Date(b.expiresAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          {!b.isFreebet && parseFloat(b.minDeposit || '0') > 0 && (
                            <span className="text-[11px] text-gray-400 px-2 py-1 rounded-md bg-white/5">мин. ${parseFloat(b.minDeposit)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditBonus(b)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-400 hover:text-blue-300 transition-all duration-200 group/edit"
                        >
                          <Edit3 size={16} className="group-hover/edit:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => deleteBonus(b.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 hover:text-red-300 transition-all duration-200 group/delete"
                        >
                          <Trash2 size={16} className="group-hover/delete:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── СПИСОК БАННЕРОВ ── */}
      {activeTab === 'banners' && (
        <div className="max-w-lg mx-auto px-4 py-4">
          {banners.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-gray-500"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                <ImageIcon size={32} className="text-blue-400" />
              </div>
              <p className="font-semibold text-gray-300 text-base mb-1">Нет баннеров</p>
              <p className="text-xs text-gray-500">Нажмите «Создать» чтобы добавить</p>
            </motion.div>
          ) : (
            <Reorder.Group axis="y" values={banners} onReorder={handleReorder} className="space-y-3">
              {banners.map((banner, index) => (
                <Reorder.Item key={banner.id} value={banner}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-2xl bg-gradient-to-br from-[#12151d] to-[#0f1219] border border-white/[0.08] overflow-hidden touch-manipulation hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 p-3.5">
                      {/* Drag handle */}
                      <div className="w-10 h-14 flex items-center justify-center text-gray-500 group-hover:text-gray-400 shrink-0 cursor-grab active:cursor-grabbing transition-colors">
                        <GripVertical size={18} />
                      </div>

                      {/* Preview thumbnail */}
                      <div className="w-16 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shadow-lg">
                        {banner.imageUrl ? (
                          <img src={resolveImg(banner.imageUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Type size={18} className="text-gray-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-white truncate leading-tight mb-1.5">
                          {banner.title || (banner.imageUrl ? 'Картинка' : 'Баннер')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {banner.actionType === 'BONUS' && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 font-semibold leading-tight border border-purple-500/30">
                              🎁 {banner.bonus ? `+${banner.bonus.percentage}%` : 'Бонус'}
                            </span>
                          )}
                          {banner.actionType === 'LINK' && (
                            <span className="text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 font-semibold leading-tight border border-blue-500/30">
                              🔗 Ссылка
                            </span>
                          )}
                          {banner.linkUrl && (
                            <span className="text-[10px] text-gray-500 truncate max-w-[100px] leading-tight px-2 py-1 rounded-lg bg-white/5">
                              {banner.linkUrl}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(banner.id); }}
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 hover:text-red-300 transition-all duration-200 shrink-0 touch-manipulation group/delete"
                      >
                        <Trash2 size={16} className="group-hover/delete:scale-110 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      )}

      {/* ── FULLSCREEN MODAL СОЗДАНИЯ ПРОМОКОДА ── */}
      <AnimatePresence>
        {isCreatingBonus && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
              onClick={() => { setIsCreatingBonus(false); resetBonusForm(); }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-50 bg-[#0b0e14] overflow-y-auto overscroll-contain"
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 bg-gradient-to-b from-[#0b0e14] via-[#0b0e14]/98 to-[#0b0e14]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-lg">
                <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
                  <button
                    onClick={() => { setIsCreatingBonus(false); resetBonusForm(); }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all duration-200"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                  <h2 className="text-[16px] font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {editingBonus ? 'Редактировать промокод' : 'Новый промокод'}
                  </h2>
                  <button
                    onClick={saveBonus}
                    disabled={bonusSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-[13px] font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-500/30"
                  >
                    {bonusSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {editingBonus ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-24">
                {/* Код */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Tag size={14} className="text-purple-400" />
                    Промокод <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={bonusForm.code}
                    onChange={e => setBonusForm({...bonusForm, code: e.target.value.toUpperCase()})}
                    placeholder="WELCOME100"
                    className="w-full h-12 rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all duration-200 font-mono tracking-wider shadow-lg"
                  />
                </div>

                {/* Название */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Type size={14} className="text-blue-400" />
                    Название <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={bonusForm.name}
                    onChange={e => setBonusForm({...bonusForm, name: e.target.value})}
                    placeholder="Приветственный бонус"
                    className="w-full h-12 rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
                  />
                </div>

                {/* Описание */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare size={14} className="text-cyan-400" />
                    Описание
                  </label>
                  <textarea
                    value={bonusForm.description}
                    onChange={e => setBonusForm({...bonusForm, description: e.target.value})}
                    placeholder="Описание для пользователей"
                    rows={3}
                    className="w-full rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 py-3 text-[14px] text-white placeholder:text-gray-500 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all duration-200 resize-none shadow-lg"
                  />
                </div>

                {/* Тип бонуса: Фрибет или Обычный */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/10 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Gift size={16} className="text-green-400" />
                        <span className="text-[14px] text-white font-bold">Фрибет (без депозита)</span>
                      </div>
                      <p className="text-[12px] text-gray-400 ml-6">Бесплатные деньги на бонусный баланс</p>
                    </div>
                    <button
                      onClick={() => setBonusForm({...bonusForm, isFreebet: !bonusForm.isFreebet})}
                      className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-lg ${
                        bonusForm.isFreebet 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gray-600/50'
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: bonusForm.isFreebet ? 24 : 4,
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                {/* Фрибет: Сумма фрибета */}
                {bonusForm.isFreebet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <Gift size={14} className="text-green-400" />
                      Сумма фрибета (USDT) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={bonusForm.freebetAmount}
                        onChange={e => setBonusForm({...bonusForm, freebetAmount: e.target.value})}
                        placeholder="10.00"
                        className="w-full h-12 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-green-400/50 focus:bg-green-500/15 transition-all duration-200 shadow-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">USDT</span>
                    </div>
                  </motion.div>
                )}

                {/* Обычный бонус: Процент + Вейджер */}
                {!bonusForm.isFreebet && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp size={14} className="text-purple-400" />
                          Бонус %
                        </label>
                        <input
                          type="number"
                          value={bonusForm.percentage}
                          onChange={e => setBonusForm({...bonusForm, percentage: e.target.value})}
                          placeholder="100"
                          className="w-full h-12 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-purple-400/50 focus:bg-purple-500/15 transition-all duration-200 shadow-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                          <Gift size={14} className="text-blue-400" />
                          Вейджер x
                        </label>
                        <input
                          type="number"
                          value={bonusForm.wagerMultiplier}
                          onChange={e => setBonusForm({...bonusForm, wagerMultiplier: e.target.value})}
                          placeholder="10"
                          className="w-full h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-blue-400/50 focus:bg-blue-500/15 transition-all duration-200 shadow-lg"
                        />
                      </div>
                    </div>

                    {/* Мин/Макс депозит */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                          <CreditCard size={14} className="text-green-400" />
                          Мин. депозит $
                        </label>
                        <input
                          type="number"
                          value={bonusForm.minDeposit}
                          onChange={e => setBonusForm({...bonusForm, minDeposit: e.target.value})}
                          placeholder="0"
                          className="w-full h-12 rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-green-500/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                          <CreditCard size={14} className="text-yellow-400" />
                          Макс. депозит $
                        </label>
                        <input
                          type="number"
                          value={bonusForm.maxDeposit}
                          onChange={e => setBonusForm({...bonusForm, maxDeposit: e.target.value})}
                          placeholder="∞"
                          className="w-full h-12 rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-yellow-500/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Вейджер (для обоих типов) */}
                {bonusForm.isFreebet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <Gift size={14} className="text-blue-400" />
                      Вейджер x
                    </label>
                    <input
                      type="number"
                      value={bonusForm.wagerMultiplier}
                      onChange={e => setBonusForm({...bonusForm, wagerMultiplier: e.target.value})}
                      placeholder="10"
                      className="w-full h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-blue-400/50 focus:bg-blue-500/15 transition-all duration-200 shadow-lg"
                    />
                  </motion.div>
                )}

                {/* Макс использований */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Users size={14} className="text-orange-400" />
                    Макс. использований <span className="text-gray-500 normal-case text-[10px] font-normal">(пусто = ∞)</span>
                  </label>
                  <input
                    type="number"
                    value={bonusForm.maxUsages}
                    onChange={e => setBonusForm({...bonusForm, maxUsages: e.target.value})}
                    placeholder="Без ограничений"
                    className="w-full h-12 rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 text-[15px] font-semibold text-white placeholder:text-gray-500 outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all duration-200 shadow-lg"
                  />
                </div>

                {/* Дата истечения */}
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-pink-400" />
                    Действует до <span className="text-gray-500 normal-case text-[10px] font-normal">(пусто = бессрочно)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={bonusForm.expiresAt}
                    onChange={e => setBonusForm({...bonusForm, expiresAt: e.target.value})}
                    className="w-full h-12 rounded-2xl bg-gradient-to-br from-white/8 to-white/4 border-2 border-white/10 px-4 text-[15px] font-semibold text-white outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all duration-200 shadow-lg [color-scheme:dark]"
                  />
                </div>

                {/* Активен */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-white/10 p-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className={bonusForm.isActive ? 'text-green-400' : 'text-gray-500'} />
                      <span className="text-[14px] text-white font-bold">Активен</span>
                    </div>
                    <button
                      onClick={() => setBonusForm({...bonusForm, isActive: !bonusForm.isActive})}
                      className={`relative w-14 h-8 rounded-full transition-all duration-300 shadow-lg ${
                        bonusForm.isActive 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                          : 'bg-gray-600/50'
                      }`}
                    >
                      <motion.div
                        animate={{
                          x: bonusForm.isActive ? 24 : 4,
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {bonusForm.code && bonusForm.name && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Предпросмотр</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[12px] font-mono font-bold">{bonusForm.code}</span>
                        <p className="text-[13px] font-semibold text-white mt-1.5">{bonusForm.name}</p>
                        {bonusForm.isFreebet && bonusForm.freebetAmount && (
                          <p className="text-[11px] text-gray-400 mt-1">Фрибет: {bonusForm.freebetAmount} USDT</p>
                        )}
                      </div>
                      {bonusForm.isFreebet ? (
                        <span className="text-[18px] font-bold text-green-400">{bonusForm.freebetAmount || '0'} USDT</span>
                      ) : (
                        <span className="text-[18px] font-bold text-purple-400">+{bonusForm.percentage || 0}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FULLSCREEN MODAL СОЗДАНИЯ БАННЕРА (mobile-first) ── */}
      <AnimatePresence>
        {isCreating && (
          <>
            {/* Backdrop — blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
              onClick={() => { setIsCreating(false); resetForm(); }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-0 z-50 bg-[#0b0e14] flex flex-col"
            >
              {/* ── Modal Header ── */}
              <div className="bg-[#0b0e14] border-b border-white/[0.06] shrink-0">
                <div className="flex items-center justify-between px-3 py-3 max-w-lg mx-auto">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setIsCreating(false); resetForm(); }}
                      className="w-10 h-10 flex items-center justify-center rounded-xl active:bg-white/10 transition-colors touch-manipulation"
                    >
                      <X size={20} className="text-gray-400" />
                    </button>
                    <h2 className="text-base font-bold text-white">Новый баннер</h2>
                  </div>
                </div>
              </div>

              {/* ── Modal Scrollable Body ── */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overscroll-contain"
              >
              <div className="max-w-lg mx-auto px-3 py-4 space-y-5">

                {/* ── Тип баннера ── */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">Тип баннера</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBannerMode('content')}
                      className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center gap-2 touch-manipulation ${
                        bannerMode === 'content'
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/[0.06] active:border-white/10'
                      }`}
                    >
                      <Type size={16} className={bannerMode === 'content' ? 'text-blue-400' : 'text-gray-500'} />
                      <span className={`text-[13px] font-medium ${bannerMode === 'content' ? 'text-blue-400' : 'text-gray-400'}`}>
                        Контент
                      </span>
                    </button>
                    <button
                      onClick={() => setBannerMode('image')}
                      className={`h-12 rounded-xl border-2 transition-all flex items-center justify-center gap-2 touch-manipulation ${
                        bannerMode === 'image'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-white/[0.06] active:border-white/10'
                      }`}
                    >
                      <ImageIcon size={16} className={bannerMode === 'image' ? 'text-emerald-400' : 'text-gray-500'} />
                      <span className={`text-[13px] font-medium ${bannerMode === 'image' ? 'text-emerald-400' : 'text-gray-400'}`}>
                        Картинка
                      </span>
                    </button>
                  </div>
                </div>

                {/* ── Загрузка изображения ── */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                    Изображение {bannerMode === 'content' && <span className="normal-case font-normal text-gray-600">(необязательно)</span>}
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />

                  {(imagePreview || formData.imageUrl) ? (
                    <div className="relative rounded-xl overflow-hidden bg-white/5">
                      <img
                        src={imagePreview || resolveImg(formData.imageUrl)}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 size={22} className="animate-spin text-blue-400" />
                        </div>
                      )}
                      {!uploading && formData.imageUrl && (
                        <div className="absolute top-2 left-2 bg-green-500/90 rounded-full p-1">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                      {/* Action row — always visible on mobile (no hover) */}
                      {!uploading && (
                        <div className="flex gap-2 p-2 bg-black/30 backdrop-blur-sm">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 h-9 rounded-lg bg-white/10 active:bg-white/20 flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
                          >
                            <RefreshCw size={13} className="text-white/80" />
                            <span className="text-[12px] font-medium text-white/80">Заменить</span>
                          </button>
                          <button
                            onClick={() => {
                              setFormData(prev => ({ ...prev, imageUrl: '' }));
                              setImagePreview('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="h-9 px-3 rounded-lg bg-red-500/15 active:bg-red-500/25 flex items-center justify-center gap-1.5 transition-colors touch-manipulation"
                          >
                            <Trash2 size={13} className="text-red-400" />
                            <span className="text-[12px] font-medium text-red-400">Удалить</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-28 rounded-xl border-2 border-dashed border-white/[0.08] active:border-blue-500/40 bg-white/[0.02] active:bg-blue-500/5 flex flex-col items-center justify-center gap-1.5 transition-all touch-manipulation"
                    >
                      {uploading ? (
                        <Loader2 size={22} className="animate-spin text-blue-400" />
                      ) : (
                        <>
                          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                            <Upload size={17} className="text-gray-500" />
                          </div>
                          <p className="text-[11px] text-gray-500">Нажмите для загрузки</p>
                          <p className="text-[10px] text-gray-600">JPG, PNG, GIF, WebP · до 5 МБ</p>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* ── Контент-поля ── */}
                {bannerMode === 'content' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Заголовок</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="Супер акция!"
                        className="w-full h-11 rounded-xl bg-white/5 border border-white/[0.06] px-3.5 text-[14px] text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Описание</label>
                      <textarea
                        value={formData.text}
                        onChange={e => setFormData({...formData, text: e.target.value})}
                        placeholder="Описание акции..."
                        rows={2}
                        className="w-full rounded-xl bg-white/5 border border-white/[0.06] px-3.5 py-2.5 text-[14px] text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-colors resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Текст кнопки</label>
                      <input
                        type="text"
                        value={formData.buttonText}
                        onChange={e => setFormData({...formData, buttonText: e.target.value})}
                        placeholder="Получить бонус"
                        className="w-full h-11 rounded-xl bg-white/5 border border-white/[0.06] px-3.5 text-[14px] text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* ── Действие ── */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">Действие</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['NONE', 'LINK', 'BONUS'] as const).map((type) => {
                      const active = formData.actionType === type;
                      const styles: Record<string, { label: string; icon: React.ReactNode; border: string; bg: string; text: string }> = {
                        NONE:  { label: 'Нет',    icon: null,                border: '#6b7280', bg: 'rgba(107,114,128,0.1)', text: '#9ca3af' },
                        LINK:  { label: 'Ссылка', icon: <LinkIcon size={13} />, border: '#3b82f6', bg: 'rgba(59,130,246,0.1)', text: '#60a5fa' },
                        BONUS: { label: 'Бонус',  icon: <Gift size={13} />,     border: '#a855f7', bg: 'rgba(168,85,247,0.1)', text: '#c084fc' },
                      };
                      const s = styles[type];
                      return (
                        <button
                          key={type}
                          onClick={() => setFormData({...formData, actionType: type})}
                          className="h-11 rounded-xl border-2 text-[13px] font-medium flex items-center justify-center gap-1.5 transition-all touch-manipulation"
                          style={active
                            ? { borderColor: s.border, backgroundColor: s.bg, color: s.text }
                            : { borderColor: 'rgba(255,255,255,0.06)', color: '#6b7280' }
                          }
                        >
                          {s.icon}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Ссылка ── */}
                {(formData.actionType === 'LINK' || formData.actionType === 'NONE') && (
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Ссылка {formData.actionType === 'NONE' && <span className="normal-case font-normal text-gray-600">(клик по баннеру)</span>}
                    </label>
                    <input
                      type="url"
                      inputMode="url"
                      value={formData.linkUrl}
                      onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                      placeholder="/deposit или https://..."
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/[0.06] px-3.5 text-[14px] text-white placeholder:text-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>
                )}

                {/* ── Бонус ── */}
                {formData.actionType === 'BONUS' && (
                  <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">Бонус</label>
                    {bonuses.length > 0 ? (
                      <div className="space-y-1.5">
                        {bonuses.map(b => {
                          const selected = formData.bonusId === b.id;
                          return (
                            <button
                              key={b.id}
                              onClick={() => setFormData({...formData, bonusId: b.id})}
                              className={`w-full p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between touch-manipulation ${
                                selected
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-white/[0.06] active:border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  selected ? 'bg-purple-500/20' : 'bg-white/5'
                                }`}>
                                  <Gift size={16} className={selected ? 'text-purple-400' : 'text-gray-500'} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-[13px] font-semibold truncate ${selected ? 'text-purple-300' : 'text-gray-300'}`}>
                                    {b.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500 truncate">{b.code}</p>
                                </div>
                              </div>
                              <span className={`text-[13px] font-bold shrink-0 ml-2 ${selected ? 'text-purple-400' : 'text-gray-500'}`}>
                                +{b.percentage}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
                        <p className="text-[13px] text-yellow-500/80">Нет бонусов</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">Создайте шаблон через бот</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Spacer for bottom safe area */}
                <div className="h-4" />
              </div>
            </div>

              {/* ── Modal Footer — fixed bottom ── */}
              <div className="shrink-0 bg-[#0b0e14] border-t border-white/[0.06] px-3 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="max-w-lg mx-auto">
                  <button
                    onClick={handleCreate}
                    disabled={saving || uploading}
                    className="w-full h-12 rounded-xl bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:active:bg-blue-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-colors touch-manipulation"
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Save size={15} />
                        Создать баннер
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
