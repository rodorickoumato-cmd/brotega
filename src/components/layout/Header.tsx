"use client";
import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

// ─── Barre catégories — lit searchParams pour état actif ─────────
function CategoryNavContent() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const scrollRef    = useRef<HTMLDivElement>(null);

  // Catégorie active : null si pas sur /catalogue, slug ou "" si sur /catalogue
  const activeCat = pathname === "/catalogue"
    ? (searchParams.get("categorie") ?? "")
    : null;

  const handleClick = (slug: string) => {
    const target = slug === "" ? "/catalogue" : `/catalogue?categorie=${slug}`;
    router.push(target);
    // Centrer l'élément actif dans la barre
    setTimeout(() => {
      const el = scrollRef.current?.querySelector(`[data-cat="${slug}"]`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, 50);
  };

  return (
    <nav className="border-t border-gray-100 bg-white overflow-x-auto scrollbar-hide" aria-label="Catégories">
      <div ref={scrollRef} className="flex items-center gap-1 px-3 py-2 w-max min-w-full">

        {/* Toutes catégories */}
        <button
          data-cat=""
          onClick={() => handleClick("")}
          className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all flex-shrink-0 ${
            activeCat === "" ? "bg-[#FEF2F2]" : "hover:bg-gray-50"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            activeCat === "" ? "bg-[#E63946]" : "bg-gray-100"
          }`}>
            <svg className={`w-5 h-5 ${activeCat === "" ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <span className={`text-[10px] font-bold whitespace-nowrap ${activeCat === "" ? "text-[#E63946]" : "text-gray-400"}`}>
            Tous
          </span>
        </button>

        {categories.map((cat) => {
          const isActive = activeCat === cat.slug;
          return (
            <button
              key={cat.id}
              data-cat={cat.slug}
              onClick={() => handleClick(cat.slug)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all flex-shrink-0 ${
                isActive ? "bg-[#FEF2F2]" : "hover:bg-gray-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                isActive ? "ring-2 ring-[#E63946] ring-offset-1" : ""
              }`}>
                <Image
                  src={cat.image}
                  alt={cat.name}
                  width={40}
                  height={40}
                  className={`w-full h-full object-cover transition-opacity ${isActive ? "opacity-100" : "opacity-75"}`}
                  unoptimized
                />
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap max-w-[48px] text-center leading-tight ${
                isActive ? "text-[#E63946]" : "text-gray-400"
              }`}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function CategoryNav() {
  return (
    <Suspense fallback={<div className="border-t border-gray-100 h-[72px]" />}>
      <CategoryNavContent />
    </Suspense>
  );
}

// ─── Header principal ─────────────────────────────────────────────
export function Header() {
  const { count, dispatch } = useCart();
  const router = useRouter();
  const [search, setSearch] = useState("");
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
    router.push(`/catalogue${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const navAction = !auth.connecte
    ? { href: "/vendor/register", label: "Vendre ici", cls: "bg-[#FFD100] text-[#1A202C]" }
    : auth.role === "vendeur"
    ? { href: "/vendor/dashboard", label: "Ma boutique", cls: "bg-[#FFD100] text-[#1A202C]" }
    : auth.role === "admin"
    ? { href: "/admin", label: "Administration", cls: "bg-gray-800 text-white" }
    : auth.role === "livreur"
    ? { href: "/livreur", label: "Mes livraisons", cls: "bg-blue-600 text-white" }
    : { href: "/vendor/register", label: "Vendre ici", cls: "bg-[#FFD100] text-[#1A202C]" };

  const compteHref = auth.connecte ? "/compte" : "/auth/login";

  const mobileMenuItems = auth.connecte
    ? [
        { href: "/compte", label: "Mon compte" },
        { href: "/compte/commandes", label: "Mes commandes" },
        ...(auth.role === "vendeur"
          ? [
              { href: "/vendor/dashboard", label: "Ma boutique" },
              { href: "/vendor/abonnement", label: "Mon abonnement" },
            ]
          : auth.role === "admin"
          ? [{ href: "/admin", label: "Administration" }]
          : auth.role === "livreur"
          ? [{ href: "/livreur", label: "Mes livraisons" }]
          : [{ href: "/vendor/register", label: "Devenir vendeur" }]),
      ]
    : [
        { href: "/auth/login", label: "Se connecter" },
        { href: "/vendor/register", label: "Devenir vendeur" },
      ];

  return (
    <>
      {/* Top bar */}
      <div className="bg-[#1A202C] text-gray-300 text-xs py-1.5 px-4 text-center tracking-wide">
        Livraison partout au Gabon &nbsp;·&nbsp; Paiement sécurisé Airtel Money &nbsp;·&nbsp; Argent bloqué jusqu&apos;à livraison
      </div>

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0" aria-label="Brotega — Accueil">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-[#E63946] rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <span className="font-black text-base text-[#E63946] block">Brotega</span>
                  <span className="text-[10px] text-gray-400 font-medium">Marketplace du Gabon</span>
                </div>
              </div>
            </Link>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden sm:flex" role="search">
              <div className="flex w-full border-2 border-[#E63946] rounded-xl overflow-hidden">
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              {/* Compte */}
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <span className="font-medium">
                  {auth.charge ? "" : auth.connecte ? "Mon compte" : "Se connecter"}
                </span>
              </Link>

              {/* CTA rôle */}
              {!auth.charge && (
                <Link
                  href={navAction.href}
                  className={`hidden md:flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${navAction.cls}`}
                >
                  {navAction.label}
                </Link>
              )}

              {/* Accès rapide dashboard vendeur mobile */}
              {!auth.charge && auth.role === "vendeur" && (
                <Link
                  href="/vendor/dashboard"
                  className="flex md:hidden items-center justify-center w-9 h-9 bg-[#FFD100] rounded-xl"
                  aria-label="Ma boutique"
                >
                  <svg className="w-5 h-5 text-[#1A202C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </Link>
              )}

              {/* Panier */}
              <button
                onClick={() => dispatch({ type: "TOGGLE" })}
                aria-label={`Panier (${count} article${count !== 1 ? "s" : ""})`}
                className="relative flex items-center gap-1.5 text-gray-700 hover:text-[#E63946] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>

              {/* Menu mobile toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={mobileOpen}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="flex-1 px-4 py-2 text-sm focus:outline-none"
              />
              <button type="submit" className="bg-[#E63946] px-4 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* Category nav avec photos */}
        <CategoryNav />
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {mobileMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 px-2 border-b border-gray-50 text-sm font-medium text-gray-700 hover:text-[#E63946]"
                >
                  {item.label}
                </Link>
              ))}

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-3">Catégories</p>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/catalogue?categorie=${c.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100">
                        <Image src={c.image} alt={c.name} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      <CartSidebar />
    </>
  );
}
