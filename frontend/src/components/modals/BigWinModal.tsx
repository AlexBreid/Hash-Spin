import React from 'react';
import { X, Trophy, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BigWinModalProps {
  isOpen: boolean;
  onClose: () => void;
  winAmount: number;
  multiplier: number;
  gameType: 'crash' | 'minesweeper' | 'plinko';
}

const getGameName = (gameType: string): string => {
  switch (gameType) {
    case 'crash':
      return 'Краш';
    case 'minesweeper':
      return 'Сапёр';
    case 'plinko':
      return 'Плинко';
    default:
      return 'Игра';
  }
};

export const BigWinModal: React.FC<BigWinModalProps> = ({
  isOpen,
  onClose,
  winAmount,
  multiplier,
  gameType,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] w-full max-w-[390px] mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="bg-gradient-to-b from-[#1a1f35] to-[#0f1419] rounded-3xl p-8 max-w-[340px] w-[90%] relative border-2 border-yellow-500/50 shadow-2xl overflow-hidden"
        >
          {/* Анимация фона */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse"></div>
          </div>

          {/* Крестик */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Иконка трофея с анимацией */}
          <div className="flex justify-center mb-6 relative z-10">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse'
              }}
              className="relative"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-2xl">
                <Trophy className="w-10 h-10 text-yellow-900" />
              </div>
              {/* Блеск вокруг */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-3"
              >
                <Sparkles className="w-full h-full text-yellow-400/50" />
              </motion.div>
            </motion.div>
          </div>

          {/* Заголовок */}
          <motion.h2
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-black text-center mb-2 bg-gradient-to-r from-yellow-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent relative z-10"
          >
            🎉 МЕГА ВЫИГРЫШ!
          </motion.h2>

          {/* Информация о выигрыше */}
          <div className="space-y-4 mb-6 relative z-10">
            {/* Игра */}
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-1">Игра</p>
              <p className="text-lg font-bold text-white">{getGameName(gameType)}</p>
            </div>

            {/* Множитель */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-xl p-4 text-center">
              <p className="text-sm text-yellow-200 mb-1">Множитель</p>
              <p className="text-3xl font-black text-yellow-300">{multiplier.toFixed(2)}x</p>
            </div>

            {/* Сумма выигрыша */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4 text-center">
              <p className="text-sm text-green-200 mb-1">Выигрыш</p>
              <p className="text-4xl font-black text-green-300">
                ${winAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Кнопка закрытия */}
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-yellow-500/50 relative z-10"
          >
            Продолжить игру
          </motion.button>

          {/* Конфетти эффект (визуальный) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: -20, 
                  x: Math.random() * 340,
                  opacity: 0,
                  rotate: 0
                }}
                animate={{ 
                  y: 500,
                  opacity: [0, 1, 0],
                  rotate: 360
                }}
                transition={{ 
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                  repeat: Infinity
                }}
                className="absolute text-2xl"
              >
                🎊
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};

