import Link from "next/link";

export default function AProposPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#E63946] transition-colors">← Retour à l'accueil</Link>
        <h1 className="text-3xl font-black text-gray-800 mt-3 mb-2">À propos de Brotega</h1>
        <p className="text-gray-500">La première marketplace 100% gabonaise.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-gradient-to-br from-[#E63946] to-[#C1121F] rounded-3xl p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-black text-white">B</div>
            <div>
              <h2 className="text-2xl font-black">Brotega</h2>
              <p className="text-white/70 text-sm">La Marketplace du Gabon 🇬🇦</p>
            </div>
          </div>
          <p className="text-white/90 leading-relaxed">
            Brotega est la première plateforme de commerce en ligne conçue spécifiquement pour le marché gabonais. Notre mission est de connecter acheteurs et vendeurs à travers tout le Gabon, en facilitant l'accès aux produits locaux et en soutenant l'économie gabonaise.
          </p>
        </div>

        {[
          {
            title: "Notre mission",
            icon: "🎯",
            content: "Démocratiser le commerce en ligne au Gabon en proposant une plateforme simple, sécurisée et adaptée aux réalités locales. Nous croyons que chaque Gabonais mérite d'avoir accès à une large gamme de produits, quel que soit son lieu de résidence.",
          },
          {
            title: "Notre vision",
            icon: "🌍",
            content: "Devenir la référence du e-commerce en Afrique centrale, en valorisant les produits et savoir-faire gabonais. Nous voulons créer un écosystème numérique qui bénéficie à tous : artisans, agriculteurs, commerçants et consommateurs.",
          },
          {
            title: "Nos valeurs",
            icon: "🤝",
            content: "Confiance, transparence et soutien aux entrepreneurs locaux sont au cœur de notre démarche. Chaque vendeur est vérifié, chaque transaction est sécurisée, et notre équipe est disponible 6j/7 pour vous accompagner.",
          },
        ].map((s) => (
          <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{s.icon}</span>
              <h2 className="text-xl font-black text-gray-800">{s.title}</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">{s.content}</p>
          </div>
        ))}

        {/* Chiffres clés */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-800 mb-5">Brotega en chiffres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { value: "500+", label: "Vendeurs actifs" },
              { value: "15 000+", label: "Produits référencés" },
              { value: "12", label: "Villes couvertes" },
              { value: "98%", label: "Clients satisfaits" },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 bg-[#FEF2F2] rounded-xl">
                <p className="text-2xl font-black text-[#E63946]">{s.value}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-gray-500 mb-4">Rejoignez la communauté Brotega dès aujourd'hui</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register" className="bg-[#E63946] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#C1121F] transition-colors">
              Créer un compte
            </Link>
            <Link href="/vendor/register" className="border-2 border-[#E63946] text-[#E63946] font-semibold px-6 py-2.5 rounded-xl hover:bg-[#FEF2F2] transition-colors">
              Devenir vendeur
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
