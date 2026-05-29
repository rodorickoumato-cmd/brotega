import Link from "next/link";

const faqs = [
  {
    q: "Comment passer une commande ?",
    a: "Ajoutez les produits souhaités à votre panier, puis cliquez sur « Commander ». Renseignez votre adresse de livraison et choisissez votre mode de paiement.",
  },
  {
    q: "Quels modes de paiement sont acceptés ?",
    a: "Nous acceptons Airtel Money (*555#), Moov Money (*111#), le paiement en espèces à la livraison, et les cartes bancaires Visa / Mastercard.",
  },
  {
    q: "Dans quelles villes livrez-vous ?",
    a: "Brotega livre dans toutes les grandes villes du Gabon : Libreville, Port-Gentil, Franceville, Oyem, Moanda, Mouila, Lambaréné, Tchibanga, Koulamoutou, Makokou, Bitam et Gamba.",
  },
  {
    q: "Quel est le délai de livraison ?",
    a: "À Libreville, comptez 24 à 48h. Pour les autres villes du Gabon, le délai est de 2 à 5 jours ouvrés selon votre localisation.",
  },
  {
    q: "Comment devenir vendeur sur Brotega ?",
    a: "Cliquez sur « Vendre » dans la barre de navigation, puis suivez les 4 étapes d'inscription. Votre boutique est créée gratuitement en moins de 5 minutes.",
  },
  {
    q: "Puis-je retourner un produit ?",
    a: "Oui, vous disposez de 7 jours après réception pour signaler un problème. Contactez notre service client via WhatsApp au +241 01 23 45 67.",
  },
  {
    q: "Comment suivre ma commande ?",
    a: "Rendez-vous dans votre espace « Mes commandes » pour consulter l'état de vos commandes en temps réel.",
  },
  {
    q: "Mon paiement est-il sécurisé ?",
    a: "Oui. Votre argent est conservé sur notre compte jusqu'à la confirmation de livraison. En cas de problème, vous êtes remboursé intégralement.",
  },
];

export default function AidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#E63946] transition-colors">← Retour à l'accueil</Link>
        <h1 className="text-3xl font-black text-gray-800 mt-3 mb-2">Centre d'aide</h1>
        <p className="text-gray-500">Trouvez les réponses à vos questions sur Brotega.</p>
      </div>

      {/* Contact rapide */}
      <div className="bg-[#FEF2F2] border border-[#E63946]/20 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-3xl">💬</div>
        <div className="flex-1">
          <p className="font-bold text-[#E63946]">Besoin d'aide immédiate ?</p>
          <p className="text-sm text-gray-600">Notre équipe répond sur WhatsApp du lundi au samedi de 8h à 20h.</p>
        </div>
        <a
          href="https://wa.me/24101234567?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20sur%20Brotega."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white font-semibold px-4 py-2 rounded-xl text-sm hover:bg-[#1da851] transition-colors whitespace-nowrap"
        >
          💬 WhatsApp
        </a>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-gray-800 mb-4">Questions fréquentes</h2>
        {faqs.map((faq, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-2">❓ {faq.q}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm mb-3">Vous n'avez pas trouvé votre réponse ?</p>
        <Link href="/contact" className="bg-[#E63946] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#C1121F] transition-colors inline-block">
          Nous contacter
        </Link>
      </div>
    </div>
  );
}
