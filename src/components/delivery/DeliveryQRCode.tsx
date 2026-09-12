"use client";

import { useEffect, useState } from "react";

interface DeliveryQRCodeProps {
  livraisonId: string;
  confirmationCode: string;
  clientName?: string;
}

export function DeliveryQRCode({
  livraisonId,
  confirmationCode,
  clientName,
}: DeliveryQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    // Générer QR code via API (api.qrserver.com)
    const qrValue = `BROTEGA|${livraisonId}|${confirmationCode}`;
    const encodedValue = encodeURIComponent(qrValue);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedValue}`;
    setQrDataUrl(qrUrl);
  }, [livraisonId, confirmationCode]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `qr-livraison-${livraisonId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-6 text-center space-y-4">
      {/* Title */}
      <div>
        <h3 className="font-bold text-gray-800 text-lg">📱 Code QR Livraison</h3>
        <p className="text-sm text-gray-600 mt-1">
          Montrez ce code au livreur pour confirmer la livraison
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-blue-50 rounded-lg p-4 flex justify-center">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code livraison"
            className="w-48 h-48"
          />
        ) : (
          <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
            <p className="text-gray-500">Génération QR...</p>
          </div>
        )}
      </div>

      {/* Code manually */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-600 mb-1">Ou utilisez ce code:</p>
        <p className="font-black text-lg text-blue-600 tracking-widest">
          {confirmationCode}
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-700">
          ✓ Le livreur scanera ce QR code ou saisira le code à 6 chiffres pour confirmer la livraison
        </p>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        💾 Télécharger le QR code
      </button>

      {/* Info */}
      <p className="text-xs text-gray-500 italic">
        Vous pouvez imprimer ce code ou le montrer directement sur votre téléphone
      </p>
    </div>
  );
}
