import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center">
          <div className="text-8xl mb-6">🔍</div>
          <h1 className="text-4xl font-black text-gray-800 mb-3">404</h1>
          <h2 className="text-xl font-bold text-gray-600 mb-3">Page introuvable</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Cette page n'existe pas ou a été déplacée. Retournez à l'accueil pour continuer vos achats.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="bg-[#E63946] hover:bg-[#C1121F] text-white font-bold px-8 py-3 rounded-xl transition-colors">
              🏠 Retour à l'accueil
            </Link>
            <Link href="/catalogue" className="border-2 border-[#E63946] text-[#E63946] hover:bg-[#FEF2F2] font-bold px-8 py-3 rounded-xl transition-colors">
              🛍️ Voir le catalogue
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
