/**
 * VendorPromoCard - Component pour attirer les vendeurs
 * Montre l'opportunité ILLIMITÉE avec des chiffres motivants
 */

import Link from "next/link";

export default function VendorPromoCard() {
  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 rounded-2xl p-8 md:p-12 text-white shadow-2xl overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white opacity-5 rounded-full" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white opacity-5 rounded-full" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider">
              Opportunité Illimitée 🚀
            </p>
            <h2 className="text-4xl md:text-5xl font-black mt-2 mb-3">
              Publiez SANS LIMITE
            </h2>
            <p className="text-xl text-emerald-100">
              Fini la limite de 3 produits. Publiez autant que vous voulez.
              <br />
              <span className="font-bold">Plus vous publiez, plus vous gagnez!</span>
            </p>
          </div>
          <span className="text-6xl md:text-7xl">♾️</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 my-8">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-lg">
            <p className="text-emerald-100 text-sm">Frais</p>
            <p className="text-3xl font-black">5%</p>
            <p className="text-xs text-emerald-200">Le plus bas!</p>
          </div>
          <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-lg">
            <p className="text-emerald-100 text-sm">Limite</p>
            <p className="text-3xl font-black">NONE</p>
            <p className="text-xs text-emerald-200">Illimité</p>
          </div>
          <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-lg">
            <p className="text-emerald-100 text-sm">Gain</p>
            <p className="text-3xl font-black">95%</p>
            <p className="text-xs text-emerald-200">Par vente</p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col md:flex-row gap-4">
          <Link
            href="/vendor/onboarding"
            className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-black hover:shadow-xl transition-all hover:scale-105 text-center"
          >
            Découvrir l'opportunité →
          </Link>
          <Link
            href="/vendor/dashboard"
            className="bg-emerald-700 text-white px-8 py-4 rounded-lg font-black hover:bg-emerald-800 transition-all text-center border-2 border-white"
          >
            Aller au Dashboard
          </Link>
        </div>

        {/* Small text */}
        <p className="text-xs text-emerald-200 mt-6">
          💡 Inspiré par les besoins des vendeurs africains. Transparent. Juste. Efficace.
        </p>
      </div>
    </div>
  );
}
