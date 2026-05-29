import Link from "next/link";

export default function ConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#E63946] transition-colors">← Retour à l'accueil</Link>
        <h1 className="text-3xl font-black text-gray-800 mt-3 mb-2">Politique de Confidentialité</h1>
        <p className="text-gray-500 text-sm">Dernière mise à jour : 1er janvier 2026</p>
      </div>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        {[
          {
            title: "1. Données collectées",
            content: "J'adore la Famille collecte les données suivantes lors de votre inscription et utilisation de la plateforme : nom, numéro de téléphone, adresse email (optionnelle), ville de résidence, historique des commandes et préférences d'achat. Ces données sont nécessaires au bon fonctionnement du service.",
          },
          {
            title: "2. Utilisation des données",
            content: "Vos données personnelles sont utilisées exclusivement pour : traiter vos commandes, vous contacter au sujet de votre compte, améliorer nos services, vous envoyer des informations sur les promotions (avec votre consentement). Nous ne vendons jamais vos données à des tiers.",
          },
          {
            title: "3. Protection des données",
            content: "J'adore la Famille met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, modification, divulgation ou destruction. Les mots de passe sont chiffrés et les transactions sont sécurisées.",
          },
          {
            title: "4. Partage des données",
            content: "Vos données peuvent être partagées avec les vendeurs uniquement dans le cadre du traitement de vos commandes (nom, adresse de livraison, téléphone). Aucune donnée financière n'est transmise aux vendeurs. Nous pouvons être amenés à communiquer vos données aux autorités compétentes sur réquisition judiciaire.",
          },
          {
            title: "5. Cookies",
            content: "J'adore la Famille utilise des cookies techniques indispensables au fonctionnement de la plateforme (session, panier). Nous pouvons également utiliser des cookies analytiques anonymisés pour améliorer votre expérience. Vous pouvez désactiver les cookies non essentiels dans les paramètres de votre navigateur.",
          },
          {
            title: "6. Vos droits",
            content: "Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour exercer ces droits, contactez-nous à : privacy@J'adore la Famille.ga ou via notre service client.",
          },
          {
            title: "7. Conservation des données",
            content: "Vos données sont conservées pendant toute la durée de votre relation avec J'adore la Famille, plus une période de 3 ans après la clôture de votre compte, conformément aux obligations légales en matière de comptabilité et de lutte contre la fraude.",
          },
        ].map((s) => (
          <div key={s.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 text-base mb-2">{s.title}</h2>
            <p>{s.content}</p>
          </div>
        ))}

        <div className="bg-[#FEF2F2] rounded-2xl p-5 text-center">
          <p className="text-[#E63946] font-semibold mb-2">Questions sur vos données personnelles ?</p>
          <Link href="/contact" className="text-sm text-[#E63946] hover:underline font-medium">
            Contacter notre délégué à la protection des données →
          </Link>
        </div>
      </div>
    </div>
  );
}
