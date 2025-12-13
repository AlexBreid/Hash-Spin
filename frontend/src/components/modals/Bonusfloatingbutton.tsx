import React from 'react';

interface BonusFloatingButtonProps {
  position: number; // 0-3 (разные позиции на экране)
  onClick: () => void;
}

export const BonusFloatingButton: React.FC<BonusFloatingButtonProps> = ({ position, onClick }) => {
  const getPositionClass = () => {
    switch (position) {
      case 0:
        return 'top-20 left-4'; // Верхний левый
      case 1:
        return 'top-32 right-4'; // Верхний правый
      case 2:
        return 'bottom-32 left-4'; // Нижний левый
      case 3:
        return 'bottom-32 right-4'; // Нижний правый
      default:
        return 'top-20 left-4';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`fixed ${getPositionClass()} z-40 p-3 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 shadow-2xl transform transition-all animate-pulse hover:scale-110 active:scale-95`}
      style={{
        animation: 'bounce 0.6s ease-in-out infinite',
      }}
    >
      <div className="relative">
        <span className="text-2xl block">🎁</span>
        {/* Сверкающий эффект */}
        <div className="absolute -inset-1 rounded-full border-2 border-yellow-200/50 animate-spin" style={{
          animationDuration: '2s'
        }}></div>
      </div>

      {/* Стили анимации */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </button>
  );
};