import { useState } from 'react';

// CDN для SVG иконок криптовалют (spothq/cryptocurrency-icons)
const ICON_CDN = 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color';

// Локальные иконки для токенов, которых нет в CDN
const LOCAL_ICONS: Record<string, string> = {
  TON: '/crypto/ton.svg',
  SHIB: '/crypto/shib.svg',
  USDD: '/crypto/usdd.svg',
};

interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CryptoIcon({ symbol, size = 36, className, style }: CryptoIconProps) {
  const [imgError, setImgError] = useState(false);

  const upperSymbol = symbol.toUpperCase();
  const iconUrl = LOCAL_ICONS[upperSymbol]
    ? LOCAL_ICONS[upperSymbol]
    : `${ICON_CDN}/${symbol.toLowerCase()}.svg`;

  if (imgError) {
    // Fallback: показываем текстовую аббревиатуру в кружке
    return (
      <div
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: size > 30 ? '11px' : '9px',
          color: '#e5e7eb',
          flexShrink: 0,
          ...style,
        }}
      >
        {symbol.substring(0, 4)}
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setImgError(true)}
      className={className}
      style={{
        display: 'block',
        borderRadius: '50%',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
