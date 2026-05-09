"use client";
import { useOnline } from "@/hooks/useOnline";

export function OfflineBanner() {
  const enLigne = useOnline();

  if (enLigne) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[100] bg-orange-500 text-white text-center py-3 px-4 shadow-lg"
    >
      <div className="flex items-center justify-center gap-2 text-sm font-semibold">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
        </svg>
        <span>Pas de connexion internet</span>
        <span className="hidden sm:inline text-orange-100">— Certaines fonctions ne sont pas disponibles</span>
      </div>
    </div>
  );
}
