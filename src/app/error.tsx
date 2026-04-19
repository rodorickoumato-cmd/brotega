"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erreur critique Brotega:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4">
        <div className="text-center">
          <div className="text-6xl mb-5">🇬🇦</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Brotega est temporairement indisponible</h1>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Notre équipe travaille à rétablir le service. Veuillez réessayer dans quelques instants.
          </p>
          <button
            onClick={reset}
            className="bg-[#00A550] hover:bg-[#007A3D] text-white font-bold px-8 py-3 rounded-xl transition-colors"
          >
            🔄 Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
