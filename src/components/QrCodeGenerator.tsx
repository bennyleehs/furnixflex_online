"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";

export default function QrCodeGenerator() {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL("https://furnixflex.com")
      .then((url) => setQrUrl(url))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="text-center">
      <h2 className="mb-2 text-lg font-semibold">FurnixFlex QR Code</h2>
      {qrUrl && (
        <Image
          src={qrUrl}
          alt="FurnixFlex QR Code"
          width={200}
          height={200}
          unoptimized // Required for data URLs
        />
      )}
    </div>
  );
}
