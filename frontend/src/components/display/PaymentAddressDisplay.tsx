interface PaymentAddressDisplayProps {
  address: string;
  amount: string;
  currency: string;
  qrData: string;
  networkInfo: {
    network: string;
    chainId: number;
    blockExplorer: string;
  };
}

export default function PaymentAddressDisplay({
  address,
  amount,
  currency,
  qrData,
  networkInfo,
}: PaymentAddressDisplayProps) {
  // Генерируем QR-код через Google Charts API (бесплатно)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="payment-address-display">
      {/* Информация о платеже */}
      <div className="payment-info">
        <div className="info-row">
          <span className="label">Сумма:</span>
          <span className="value">{amount} {currency}</span>
        </div>
        <div className="info-row">
          <span className="label">Сеть:</span>
          <span className="value">{networkInfo.network} (Chain ID: {networkInfo.chainId})</span>
        </div>
      </div>

      {/* QR-код */}
      <div className="qr-section">
        <p className="section-title">📱 QR-код</p>
        <div className="qr-container">
          <img src={qrCodeUrl} alt="QR Code" style={{ width: 200, height: 200 }} />
        </div>
      </div>

      {/* Адрес */}
      <div className="address-section">
        <p className="section-title">🔗 Адрес кошелька</p>
        <div className="address-box">
          <code className="address">{address}</code>
        </div>
      </div>
    </div>
  );
}
