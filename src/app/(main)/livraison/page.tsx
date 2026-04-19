import Link from "next/link";

const villes = [
  { ville: "Libreville", delai: "24 – 48h", frais: "2 500 FCFA", zone: "Estuaire" },
  { ville: "Port-Gentil", delai: "2 – 3 jours", frais: "4 000 FCFA", zone: "Ogooué-Maritime" },
  { ville: "Franceville", delai: "3 – 4 jours", frais: "5 000 FCFA", zone: "Haut-Ogooué" },
  { ville: "Oyem", delai: "3 – 4 jours", frais: "5 000 FCFA", zone: "Woleu-Ntem" },
  { ville: "Moanda", delai: "3 – 4 jours", frais: "5 000 FCFA", zone: "Haut-Ogooué" },
  { ville: "Mouila", delai: "3 – 5 jours", frais: "5 500 FCFA", zone: "Ngounié" },
  { ville: "Lambaréné", delai: "2 – 3 jours", frais: "3 500 FCFA", zone: "Moyen-Ogooué" },
  { ville: "Tchibanga", delai: "4 – 5 jours", frais: "6 000 FCFA", zone: "Nyanga" },
  { ville: "Koulamoutou", delai: "4 – 5 jours", frais: "6 000 FCFA", zone: "Ogooué-Lolo" },
  { ville: "Makokou", delai: "4 – 5 jours", frais: "6 000 FCFA", zone: "Ogooué-Ivindo" },
  { ville: "Bitam", delai: "4 – 5 jours", frais: "6 000 FCFA", zone: "Woleu-Ntem" },
  { ville: "Gamba", delai: "4 – 6 jours", frais: "7 000 FCFA", zone: "Ogooué-Maritime" },
];

export default function LivraisonPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#00A550] transition-colors">← Retour à l'accueil</Link>
        <h1 className="text-3xl font-black text-gray-800 mt-3 mb-2">Livraison & Retours</h1>
        <p className="text-gray-500">Tout savoir sur nos livraisons dans toutes les villes du Gabon.</p>
      </div>

      <div className="space-y-6">
        {/* Livraison gratuite */}
        <div className="bg-[#E8F7EE] border border-[#00A550]/20 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🎉</span>
            <h2 className="font-bold text-[#00A550] text-lg">Livraison gratuite dès 50 000 FCFA</h2>
          </div>
          <p className="text-sm text-gray-600">Pour toute commande supérieure à 50 000 FCFA, la livraison est offerte à Libreville.</p>
        </div>

        {/* Tableau des villes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-bold text-gray-800 text-lg">🚚 Délais et frais de livraison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Ville</th>
                  <th className="px-5 py-3 text-left">Province</th>
                  <th className="px-5 py-3 text-left">Délai</th>
                  <th className="px-5 py-3 text-right">Frais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {villes.map((v) => (
                  <tr key={v.ville} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-gray-800">📍 {v.ville}</td>
                    <td className="px-5 py-3.5 text-gray-500">{v.zone}</td>
                    <td className="px-5 py-3.5 text-gray-600">{v.delai}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#00A550]">{v.frais}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Politique de retour */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg mb-4">↩️ Politique de retour</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-[#00A550] font-bold mt-0.5">✓</span>
              <p><strong>7 jours</strong> pour signaler un produit non conforme ou défectueux après réception.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00A550] font-bold mt-0.5">✓</span>
              <p>Contactez notre service client via WhatsApp avec des photos du produit.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00A550] font-bold mt-0.5">✓</span>
              <p>En cas de litige avéré, remboursement intégral sous 48 à 72 heures.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400 font-bold mt-0.5">✗</span>
              <p className="text-gray-500">Les produits alimentaires et cosmétiques ouverts ne sont pas retournables pour des raisons d'hygiène.</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">Un problème avec votre livraison ?</p>
          <a
            href="https://wa.me/24101234567?text=Bonjour%2C%20j%27ai%20un%20probl%C3%A8me%20avec%20ma%20livraison."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#1da851] transition-colors"
          >
            💬 Contacter le support WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
