import React from 'react';
import { X } from 'lucide-react';

interface BonusModalProps {
  onClose: () => void;
  onLearnMore: () => void;
}

export const BonusModal: React.FC<BonusModalProps> = ({ onClose, onLearnMore }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 w-full max-w-[390px] mx-auto">
      <div className="bg-gradient-to-b from-[#1a1f35] to-[#0f1419] rounded-3xl p-6 max-w-[320px] w-[90%] relative border border-blue-500/30 shadow-2xl">
        
        {/* Крестик в верхнем углу */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Анимированный подарок */}
        <div className="flex justify-center mb-6">
          <div className="relative animate-bounce">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🎁</span>
            </div>
            {/* Блеск */}
            <div className="absolute -inset-2 border-2 border-yellow-400/50 rounded-2xl animate-pulse"></div>
          </div>
        </div>

        {/* Заголовок */}
        <h2 className="text-2xl font-black text-center mb-2 bg-gradient-to-r from-yellow-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
          🎉 ВАШ БОНУС ЖДЁТ!
        </h2>

        {/* Основной текст */}
        <div className="space-y-3 mb-6">
          <p className="text-center text-white text-sm leading-relaxed">
            У вас доступен <span className="font-bold text-yellow-300">+100% БОНУС</span> к первому пополнению!
          </p>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
            <p className="text-xs text-yellow-200 text-center font-semibold">
              ⚡ Не упустите шанс удвоить свой депозит!
            </p>
          </div>

          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 font-bold mt-0.5">✓</span>
              <span>Удвойте свой первый депозит</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 font-bold mt-0.5">✓</span>
              <span>Начните играть с большим запасом</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 font-bold mt-0.5">✓</span>
              <span>Увеличьте свои шансы на победу</span>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="space-y-2">
          <button
            onClick={onLearnMore}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95 text-sm shadow-lg"
          >
            📚 Узнать условия
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-sm border border-white/20"
          >
            Закрыть
          </button>
        </div>


      </div>
    </div>
  );
};