"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/store/cart";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { categories } from "@/data/categories";

type AuthEtat = {
  charge: boolean;
  connecte: boolean;
  role: string | null;
  initiales: string;
};

export function Header() {
  const { count, dispatch } = useCart();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [auth, setAuth] = useState<AuthEtat>({
    charge: true,
    connecte: false,
    role: null,
    initiales: "",
  });

  useEffect(() => {
    const supabase = createClient();

    async function miseAJourAuth(userId: string | null, roleJwt?: string) {
      if (!userId) {
        setAuth({ charge: false, connecte: false, role: null, initiales: "" });
        return;
      }
      // Rôle depuis le JWT en priorité (pas de requête DB) ; fallback DB pour comptes anciens
      let role = roleJwt ?? "";
      const { data } = await supabase
        .from("utilisateurs")
        .select(role ? "nom" : "role, nom")
        .eq("id", userId)
        .single();
      if (!role) role = (data as { role?: string })?.role ?? "acheteur";
      const nom = (data as { nom?: string })?.nom ?? "";
      const initiales = nom
        ? nom.trim().split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
        : "?";
      setAuth({ charge: false, connecte: true, role, initiales });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      miseAJourAuth(
        session?.user?.id ?? null,
        (session?.user?.app_metadata?.role as string) || undefined,
      );
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      miseAJourAuth(
        session?.user?.id ?? null,
        (session?.user?.app_metadata?.role as string) || undefined,
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    const cat = selectedCat ? `&categorie=${selectedCat}` : "";
    router.push(`/catalogue?q=${encodeURIComponent(q)}${cat}`);
  };

  // Lien principal (droite du header) selon le rôle
  const navAction = !auth.connecte
    ? { href: "/vendor/register", label: "Vendre", cls: "bg-[#FFD100] text-[#1A202C]" }
    : auth.role === "vendeur"
    ? { href: "/vendor/dashboard", label: "Ma boutique", cls: "bg-[#FFD100] text-[#1A202C]" }
    : auth.role === "admin"
    ? { href: "/admin", label: "⚙️ Admin", cls: "bg-gray-800 text-white" }
    : auth.role === "livreur"
    ? { href: "/livreur", label: "🚚 Livraisons", cls: "bg-blue-500 text-white" }
    : { href: "/vendor/register", label: "Vendre", cls: "bg-[#FFD100] text-[#1A202C]" };

  // Lien compte selon auth
  const compteHref = auth.connecte ? "/compte" : "/auth/login";

  // Menu mobile selon rôle
  const mobileMenuItems = auth.connecte
    ? [
        { href: "/compte", label: auth.role === "vendeur" ? `Mon compte (${auth.initiales})` : "Mon compte" },
        { href: "/compte/commandes", label: "Mes commandes" },
        ...(auth.role === "vendeur"
          ? [
              { href: "/vendor/dashboard", label: "🏪 Dashboard vendeur" },
              { href: "/vendor/abonnement", label: "💎 Mon abonnement" },
            ]
          : auth.role === "admin"
          ? [{ href: "/admin", label: "⚙️ Administration" }]
          : auth.role === "livreur"
          ? [{ href: "/livreur", label: "🚚 Mes livraisons" }]
          : [{ href: "/vendor/register", label: "🏪 Devenir vendeur" }]),
      ]
    : [
        { href: "/auth/login", label: "Se connecter" },
        { href: "/vendor/register", label: "Devenir vendeur" },
      ];

  return (
    <>
      {/* Top bar */}
      <div className="bg-[#C1121F] text-white text-xs py-1.5 px-4 text-center">
        ❤️ La marketplace familiale du Gabon &nbsp;|&nbsp; Paiement sécurisé Airtel Money &amp; Moov Money
      </div>

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0" aria-label="J'adore la Famille — Accueil">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#E63946] rounded-xl flex items-center justify-center">
                  <span className="text-lg" aria-hidden="true">❤️</span>
                </div>
                <div>
                  <span className="font-black text-lg text-[#E63946] leading-tight">J&apos;adore la Famille</span>
                  <div className="text-[10px] text-gray-400 leading-none -mt-0.5">La Marketplace du Gabon</div>
                </div>
              </div>
            </Link>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-2xl hidden sm:flex"
              role="search"
              aria-label="Rechercher des produits"
            >
              <div className="flex w-full border-2 border-[#E63946] rounded-xl overflow-hidden">
                <select
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                  aria-label="Filtrer par catégorie"
                  className="text-sm px-3 py-2 bg-[#FEF2F2] text-gray-700 border-r border-red-200 focus:outline-none cursor-pointer"
                >
                  <option value="">Toutes catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="search"
                  name="q"
                  placeholder="Rechercher produits, vendeurs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Terme de recherche"
                  className="flex-1 px-4 py-2 text-sm focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Lancer la recherche"
                  className="bg-[#E63946] hover:bg-[#C1121F] px-4 text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              {/* Location */}
              <button
                aria-label="Ville"
                className="hidden md:flex items-center gap-1.5 text-gray-600 hover:text-[#E63946] text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Libreville</span>
              </button>

              {/* Compte (dynamique selon auth) */}
              <Link
                href={compteHref}
                className="hidden md:flex items-center gap-1.5 text-gray-600 hover:text-[#E63946] text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="Mon compte"
              >
                {auth.connecte ? (
                  <span className="w-7 h-7 rounded-full bg-[#E63946] text-white text-xs font-black flex items-center justify-center">
                    {auth.charge ? "…" : auth.initiales}
                  </span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <span className="font-medium">
                  {auth.charge ? "" : auth.connecte ? "Mon compte" : "Se connecter"}
                </span>
              </Link>

              {/* Bouton action principal (rôle-dépendant) */}
              {!auth.charge && (
                <Link
                  href={navAction.href}
                  className={`hidden md:flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${navAction.cls}`}
                >
                  {navAction.label}
                </Link>
              )}
              {/* Accès rapide dashboard vendeur sur mobile */}
              {!auth.charge && auth.role === "vendeur" && (
                <Link
                  href="/vendor/dashboard"
                  className="flex md:hidden items-center justify-center w-9 h-9 bg-[#FFD100] rounded-xl text-lg"
                  aria-label="Ma boutique"
                >
                  🏪
                </Link>
              )}

              {/* Panier */}
              <button
                onClick={() => dispatch({ type: "TOGGLE" })}
                aria-label={`Panier (${count} article${count !== 1 ? "s" : ""})`}
                className="relative flex items-center gap-1.5 text-gray-700 hover:text-[#E63946] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" aria-hidden="true">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={mobileOpen}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="sm:hidden mt-3" role="search">
            <div className="flex border-2 border-[#E63946] rounded-xl overflow-hidden">
              <input
                type="search"
                name="q"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Rechercher"
                className="flex-1 px-4 py-2 text-sm focus:outline-none"
              />
              <button type="submit" aria-label="Rechercher" className="bg-[#E63946] px-4 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Category nav */}
        <nav className="border-t border-gray-100 bg-white overflow-x-auto" aria-label="Navigation par catégorie">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-1 py-1">
              <Link
                href="/catalogue"
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#E63946] rounded-lg whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Toutes catégories
              </Link>
              {categories.slice(0, 7).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalogue?categorie=${cat.slug}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-[#E63946] hover:bg-[#FEF2F2] rounded-lg whitespace-nowrap transition-colors font-medium"
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  {cat.name}
                </Link>
              ))}
              <Link href="/catalogue" className="px-3 py-2 text-sm text-[#E63946] font-semibold hover:underline whitespace-nowrap">
                Voir tout →
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-label="Menu navigation"
        >
          <div
            className="bg-white w-72 h-full p-4 animate-slide-in overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              {auth.connecte ? (
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#E63946] text-white text-sm font-black flex items-center justify-center">
                    {auth.initiales}
                  </span>
                  <span className="font-bold text-sm text-gray-800">
                    {auth.role === "vendeur" ? "Vendeur"
                     : auth.role === "admin" ? "Administrateur"
                     : auth.role === "livreur" ? "Livreur"
                     : "Client"}
                  </span>
                </div>
              ) : (
                <span className="font-bold text-lg">Menu</span>
              )}
              <button onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" className="p-1 rounded-lg hover:bg-gray-100">
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {mobileMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 px-2 border-b text-sm font-medium text-gray-700 hover:text-[#E63946]"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Catégories</p>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/catalogue?categorie=${c.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="py-2.5 px-2 flex items-center gap-2 text-sm hover:bg-gray-50 rounded-lg"
                  >
                    <span aria-hidden="true">{c.icon}</span>{c.name}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      <CartSidebar />
    </>
  );
}
