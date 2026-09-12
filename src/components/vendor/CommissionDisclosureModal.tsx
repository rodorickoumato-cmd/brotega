"use client";

import { useEffect, useState } from "react";

interface CommissionDisclosureModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CommissionDisclosureModal({
  isOpen = true,
  onClose,
}: CommissionDisclosureModalProps) {
  const [show, setShow] = useState(false);
  const [hasSeenBefore, setHasSeenBefore] = useState(true);

  useEffect(() => {
    // Check if user has already seen this modal
    const seen = localStorage.getItem("commission_disclosure_seen");
    if (!seen) {
      setHasSeenBefore(false);
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    // Mark as seen - don't show again
    localStorage.setItem("commission_disclosure_seen", "true");
    setShow(false);
    onClose?.();
  };

  if (!show || hasSeenBefore) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl p-6 text-white">
          <h2 className="text-2xl font-black mb-1">💡 Bienvenue à Brotega!</h2>
          <p className="text-blue-100 text-sm">Quelques informations avant votre premier produit</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Commission Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">📊</span>
              <div>
                <p className="font-bold text-gray-800 text-sm">Frais de plateforme</p>
                <p className="text-gray-600 text-sm mt-1">
                  Nous prélevons <span className="font-black text-blue-600">5%</span> par vente pour maintenir et améliorer la plateforme.
                </p>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Vos 5% couvrent:</p>
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex gap-2">
                <span>✓</span>
                <span>Hébergement sécurisé de votre boutique</span>
              </div>
              <div className="flex gap-2">
                <span>✓</span>
                <span>Traitement des paiements (Airtel & Moov)</span>
              </div>
              <div className="flex gap-2">
                <span>✓</span>
                <span>Réseau de livraison dans 12 villes</span>
              </div>
              <div className="flex gap-2">
                <span>✓</span>
                <span>Support client 24/7</span>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Exemple:</span> Vous vendez un article 100,000 XAF → Vous recevez 95,000 XAF (après 5% de frais)
            </p>
          </div>

          {/* CTA */}
          <div className="pt-2">
            <button
              onClick={handleClose}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Parfait, j'ai compris! 🎉
            </button>
          </div>

          {/* Fine print */}
          <p className="text-xs text-gray-500 text-center">
            Ce message n'apparaîtra qu'une seule fois
          </p>
        </div>
      </div>
    </div>
  );
}
