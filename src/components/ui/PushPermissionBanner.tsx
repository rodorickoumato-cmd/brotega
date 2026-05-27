"use client";
import { useEffect, useState } from "react";
import { demanderPermissionPush } from "@/components/sw/ServiceWorkerRegister";

export function PushPermissionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "default") {
      const dismissed = sessionStorage.getItem("push-banner-dismissed");
      if (!dismissed) setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccepter = async () => {
    setVisible(false);
    await demanderPermissionPush();
  };

  const handleIgnorer = () => {
    sessionStorage.setItem("push-banner-dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 flex-shrink-0 text-[#FFD100]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="font-medium">Soyez alerté dès qu&apos;une commande est confirmée ou livrée</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleAccepter}
          className="bg-[#E63946] hover:bg-[#C1121F] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          Activer
        </button>
        <button
          onClick={handleIgnorer}
          className="text-gray-400 hover:text-white text-xs px-2 py-1.5 transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
