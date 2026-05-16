import Link from "next/link";
import { categories } from "@/data/categories";

export function Footer() {
  return (
    <footer className="bg-[#1A202C] text-gray-300 mt-16">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#E63946] rounded-lg flex items-center justify-center">
                <span className="text-lg">❤️</span>
              </div>
              <span className="font-black text-xl text-white">J&apos;adore la Famille</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-400">
              La marketplace familiale du Gabon. Achetez local, soutenez les entrepreneurs gabonais.
            </p>
            <div className="flex gap-3 mt-4">
              {[
                { name: "Facebook", icon: "f", href: "https://facebook.com/mycssecret" },
                { name: "Instagram", icon: "📷", href: "https://instagram.com/mycssecret" },
                { name: "Twitter / X", icon: "𝕏", href: "https://twitter.com/mycssecret" },
                { name: "WhatsApp", icon: "📱", href: "https://wa.me/24101234567" },
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#E63946] transition-colors text-sm"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            {/* Payment badges */}
            <div className="mt-5">
              <p className="text-xs text-gray-500 mb-2">Paiements acceptés</p>
              <div className="flex flex-wrap gap-2">
                {["Airtel Money", "Moov Money", "Espèces", "Carte"].map((p) => (
                  <span key={p} className="text-xs bg-white/10 px-2 py-1 rounded-md font-medium">{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-bold mb-4">Catégories</h3>
            <ul className="space-y-2">
              {categories.slice(0, 8).map((c) => (
                <li key={c.id}>
                  <Link href={`/catalogue?categorie=${c.slug}`} className="text-sm hover:text-[#E63946] transition-colors flex items-center gap-2">
                    <span className="text-xs">{c.icon}</span>{c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-white font-bold mb-4">Mon Compte</h3>
            <ul className="space-y-2 text-sm">
              {[
                ["Créer un compte", "/auth/register"],
                ["Se connecter", "/auth/login"],
                ["Mes commandes", "/compte/commandes"],
                ["Mes favoris", "/compte/favoris"],
                ["Devenir vendeur", "/vendor/register"],
                ["Dashboard vendeur", "/vendor/dashboard"],
                ["Centre d'aide", "/aide"],
                ["Contact", "/contact"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-[#E63946] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-white font-bold mb-4">Informations</h3>
            <ul className="space-y-2 text-sm mb-6">
              {[
                ["À propos de J'adore la Famille", "/a-propos"],
                ["Conditions d'utilisation", "/conditions"],
                ["Politique de confidentialité", "/confidentialite"],
                ["Comment vendre", "/vendre"],
                ["Livraison & Retours", "/livraison"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-[#E63946] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs font-semibold text-white mb-1">Service client</p>
              <p className="text-xs text-gray-400">Lun - Sam : 8h - 20h</p>
              <a href="tel:+24101234567" className="text-[#E63946] text-sm font-bold mt-1 block hover:underline">+241 01 23 45 67</a>
              <a href="https://wa.me/24101234567" className="text-[#25D366] text-xs mt-0.5 block hover:underline">💬 WhatsApp</a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <p>© 2026 J&apos;adore la Famille — Fait avec ❤️ au Gabon 🇬🇦</p>
          <p>Tous droits réservés · Libreville, Gabon</p>
        </div>
      </div>
    </footer>
  );
}
