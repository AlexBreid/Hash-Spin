// CreateBannerModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link as LinkIcon, Gift } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useFetch } from '../../hooks/useDynamicApi';
import { toast } from 'sonner';

interface CreateBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface BonusTemplate {
  id: number;
  name: string;
  code: string;
  percentage: number;
}

export function CreateBannerModal({ isOpen, onClose, onSuccess }: CreateBannerModalProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [actionType, setActionType] = useState<'LINK' | 'BONUS' | 'NONE'>('NONE');
  const [linkUrl, setLinkUrl] = useState('');
  const [bonusId, setBonusId] = useState<number | null>(null);
  const [bonuses, setBonuses] = useState<BonusTemplate[]>([]);

  const { execute: createBanner, loading } = useFetch('ADMIN_CREATE_banner', 'POST');
  const { data: bonusesData, execute: fetchBonuses } = useFetch('ADMIN_GET_bonuses', 'GET');

  useEffect(() => {
    if (isOpen) {
      fetchBonuses();
    }
  }, [isOpen, fetchBonuses]);

  useEffect(() => {
    if (bonusesData && Array.isArray(bonusesData)) {
      setBonuses(bonusesData);
    }
  }, [bonusesData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageUrl) {
      toast.error('Пожалуйста, укажите URL изображения');
      return;
    }

    try {
      await createBanner({
        imageUrl,
        title,
        text,
        buttonText,
        actionType,
        linkUrl: actionType === 'LINK' ? linkUrl : undefined,
        bonusId: actionType === 'BONUS' ? bonusId : undefined,
        isActive: true,
        priority: 0
      });

      toast.success('Баннер успешно создан!');
      onSuccess();
      onClose();
      
      // Reset form
      setImageUrl('');
      setTitle('');
      setText('');
      setButtonText('');
      setActionType('NONE');
      setLinkUrl('');
      setBonusId(null);
    } catch (error) {
      toast.error('Ошибка при создании баннера');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg"
          >
            <Card className="relative overflow-hidden bg-[#1a1b26] border-[#2e303e] text-white p-6 shadow-2xl">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Upload className="w-6 h-6 text-blue-500" />
                Создать баннер
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">URL изображения</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Title & Text */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Заголовок (необязательно)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Супер Акция!"
                      className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Текст (необязательно)</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Описание акции..."
                      rows={2}
                      className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Action Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Действие при клике</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType('NONE')}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        actionType === 'NONE' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-[#13141c] border-[#2e303e] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      Нет
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionType('LINK')}
                      className={`px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        actionType === 'LINK' 
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                          : 'bg-[#13141c] border-[#2e303e] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      Ссылка
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionType('BONUS')}
                      className={`px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        actionType === 'BONUS' 
                          ? 'bg-purple-600/20 border-purple-500 text-purple-400' 
                          : 'bg-[#13141c] border-[#2e303e] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <Gift className="w-4 h-4" />
                      Бонус
                    </button>
                  </div>
                </div>

                {/* Dynamic Fields based on Action Type */}
                {actionType === 'LINK' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Текст кнопки</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="Перейти"
                        className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Ссылка</label>
                      <input
                        type="text"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="/games/crash или https://google.com"
                        className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </motion.div>
                )}

                {actionType === 'BONUS' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Текст кнопки</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="Получить бонус"
                        className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Выберите бонус</label>
                      <select
                        value={bonusId || ''}
                        onChange={(e) => setBonusId(Number(e.target.value))}
                        className="w-full bg-[#13141c] border border-[#2e303e] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Выберите бонус --</option>
                        {bonuses.map((bonus) => (
                          <option key={bonus.id} value={bonus.id}>
                            {bonus.name} ({bonus.percentage}%) - {bonus.code}
                          </option>
                        ))}
                      </select>
                      {bonuses.length === 0 && (
                        <p className="text-xs text-yellow-500 mt-1">
                          Нет доступных бонусов. Создайте их через Telegram бота.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all"
                >
                  {loading ? 'Создание...' : 'Создать баннер'}
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

