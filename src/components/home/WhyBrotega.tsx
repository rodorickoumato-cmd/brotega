const features = [
  {
    icon: "🇬🇦",
    title: "100% Gabonais",
    description: "Plateforme conçue pour les besoins locaux du Gabon. Vendeurs vérifiés, produits authentiques.",
  },
  {
    icon: "📱",
    title: "Mobile Money",
    description: "Payez facilement avec Airtel Money ou Moov Money. Simple, rapide et sécurisé.",
  },
  {
    icon: "🚚",
    title: "Livraison nationale",
    description: "Livraison dans les 12 principales villes du Gabon. Suivi en temps réel.",
  },
  {
    icon: "🛡️",
    title: "Achat protégé",
    description: "Votre argent est sécurisé jusqu'à la livraison. Remboursement garanti si problème.",
  },
  {
    icon: "🌿",
    title: "Produits locaux",
    description: "Soutenez les producteurs et artisans gabonais en achetant leurs créations.",
  },
  {
    icon: "💬",
    title: "Support WhatsApp",
    description: "Notre équipe répond sur WhatsApp 7j/7 de 8h à 20h pour vous aider.",
  },
];

export function WhyBrotega() {
  return (
    <section className="bg-white py-14">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-gray-800">Pourquoi choisir Brotega ?</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            La marketplace de confiance adaptée aux réalités gabonaises
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="text-center p-5 rounded-2xl hover:bg-[#E8F7EE] transition-colors group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform inline-block">{f.icon}</div>
              <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
