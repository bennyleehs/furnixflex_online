'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCodeGenerator() {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL('https://furnixflex.com')
      .then((url) => setQrUrl(url))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold mb-2">FurnixFlex QR Code</h2>
      {qrUrl && <img src={qrUrl} alt="FurnixFlex QR Code" />}
    </div>
  );
}
