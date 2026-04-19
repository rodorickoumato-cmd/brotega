"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erreur Brotega:", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-6xl mb-5">⚠️</div>
      <h1 className="text-2xl font-black text-gray-800 mb-2">Une erreur est survenue</h1>
      <p className="text-gray-500 mb-8">
        Nous n'avons pas pu charger cette page. Réessayez ou retournez à l'accueil.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="bg-[#00A550] hover:bg-[#007A3D] text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          🔄 Réessayer
        </button>
        <Link
          href="/"
          className="border-2 border-gray-200 hover:border-[#00A550] text-gray-700 hover:text-[#00A550] font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          🏠 Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
