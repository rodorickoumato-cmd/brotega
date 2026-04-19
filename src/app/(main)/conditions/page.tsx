import Link from "next/link";

export default function ConditionsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-[#00A550] transition-colors">← Retour à l'accueil</Link>
        <h1 className="text-3xl font-black text-gray-800 mt-3 mb-2">Conditions Générales d'Utilisation</h1>
        <p className="text-gray-500 text-sm">Dernière mise à jour : 1er janvier 2026</p>
      </div>

      <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
        {[
          {
            title: "1. Présentation de Brotega",
            content: "Brotega est une plateforme de commerce électronique (marketplace) opérant au Gabon, permettant à des vendeurs professionnels et particuliers de proposer leurs produits à des acheteurs. L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes conditions générales.",
          },
          {
            title: "2. Inscription et compte utilisateur",
            content: "L'inscription est gratuite et ouverte à toute personne physique majeure résidant au Gabon. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités effectuées depuis votre compte. Brotega se réserve le droit de suspendre tout compte en cas d'utilisation frauduleuse.",
          },
          {
            title: "3. Conditions de vente",
            content: "Les vendeurs s'engagent à fournir des descriptions exactes de leurs produits, à respecter les prix annoncés et à traiter les commandes dans les délais indiqués. Brotega prélève une commission de 5% sur chaque vente réalisée via la plateforme.",
          },
          {
            title: "4. Paiements",
            content: "Les paiements sont acceptés via Airtel Money, Moov Money, espèces à la livraison et carte bancaire. Les fonds sont conservés par Brotega jusqu'à confirmation de la livraison par l'acheteur, garantissant ainsi la sécurité de la transaction.",
          },
          {
            title: "5. Livraison",
            content: "Les délais de livraison varient selon la ville de destination. Brotega ne peut être tenu responsable des retards causés par des événements indépendants de sa volonté (grèves, intempéries, etc.). Tout problème de livraison doit être signalé dans les 48h suivant la date prévue.",
          },
          {
            title: "6. Retours et remboursements",
            content: "L'acheteur dispose de 7 jours après réception pour signaler un produit non conforme ou défectueux. Les retours sont traités au cas par cas. En cas de litige avéré, Brotega procède au remboursement intégral de l'acheteur et engage une procédure avec le vendeur concerné.",
          },
          {
            title: "7. Responsabilités",
            content: "Brotega agit en qualité d'intermédiaire technique entre vendeurs et acheteurs. La responsabilité de Brotega est limitée aux dysfonctionnements de la plateforme. Les vendeurs sont seuls responsables de la conformité et de la qualité des produits qu'ils proposent.",
          },
          {
            title: "8. Modification des CGU",
            content: "Brotega se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront informés par email ou notification dans l'application. La poursuite de l'utilisation de la plateforme après modification vaut acceptation des nouvelles conditions.",
          },
        ].map((s) => (
          <div key={s.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-800 text-base mb-2">{s.title}</h2>
            <p>{s.content}</p>
          </div>
        ))}

        <div className="bg-[#E8F7EE] rounded-2xl p-5 text-center">
          <p className="text-[#00A550] font-semibold mb-2">Des questions sur nos conditions ?</p>
          <Link href="/contact" className="text-sm text-[#00A550] hover:underline font-medium">
            Contactez notre service juridique →
          </Link>
        </div>
      </div>
    </div>
  );
}
