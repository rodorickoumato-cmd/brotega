"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/store/cart";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { categories } from "@/data/categories";

export function Header() {
  const { count, state, dispatch } = useCart();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <div className="bg-[#007A3D] text-white text-xs py-1.5 px-4 text-center">
        🇬🇦 Livraison disponible dans toutes les villes du Gabon &nbsp;|&nbsp; Paiement sécurisé Airtel Money & Moov Money
      </div>

      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-[#00A550] rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-lg">B</span>
                </div>
                <div>
                  <span className="font-black text-xl text-[#00A550]">Brotega</span>
                  <div className="text-[10px] text-gray-400 leading-none -mt-0.5">La Marketplace du Gabon</div>
                </div>
              </div>
            </Link>

            {/* Search bar */}
            <div className="flex-1 max-w-2xl hidden sm:flex">
              <div className="flex w-full border-2 border-[#00A550] rounded-xl overflow-hidden">
                <select className="text-sm px-3 py-2 bg-[#E8F7EE] text-gray-700 border-r border-green-200 focus:outline-none cursor-pointer">
                  <option value="">Toutes catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="search"
                  placeholder="Rechercher produits, vendeurs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-4 py-2 text-sm focus:outline-none"
                />
                <button className="bg-[#00A550] hover:bg-[#007A3D] px-4 text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              {/* Location */}
              <button className="hidden md:flex items-center gap-1.5 text-gray-600 hover:text-[#00A550] text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">Libreville</span>
              </button>

              {/* Account */}
              <Link href="/auth/login" className="hidden md:flex items-center gap-1.5 text-gray-600 hover:text-[#00A550] text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Compte</span>
              </Link>

              {/* Vendor */}
              <Link href="/vendor/dashboard" className="hidden lg:flex items-center gap-1.5 bg-[#FFD100] hover:bg-[#E6BC00] text-[#1A202C] text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                Vendre
              </Link>

              {/* Cart */}
              <button
                onClick={() => dispatch({ type: "TOGGLE" })}
                className="relative flex items-center gap-1.5 text-gray-700 hover:text-[#00A550] px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
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

              {/* Mobile menu */}
              <button onClick={() => setMobileOpen(!mobileOpen)} className="sm:hidden p-2 rounded-lg hover:bg-gray-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden mt-3">
            <div className="flex border-2 border-[#00A550] rounded-xl overflow-hidden">
              <input
                type="search"
                placeholder="Rechercher..."
                className="flex-1 px-4 py-2 text-sm focus:outline-none"
              />
              <button className="bg-[#00A550] px-4 text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Category nav */}
        <nav className="border-t border-gray-100 bg-white overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-1 py-1">
              <button className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-[#00A550] rounded-lg whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Toutes catégories
              </button>
              {categories.slice(0, 7).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/catalogue?categorie=${cat.slug}`}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-[#00A550] hover:bg-[#E8F7EE] rounded-lg whitespace-nowrap transition-colors font-medium"
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </Link>
              ))}
              <Link href="/catalogue" className="px-3 py-2 text-sm text-[#00A550] font-semibold hover:underline whitespace-nowrap">
                Voir tout →
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
          <div className="bg-white w-72 h-full p-4 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg">Menu</span>
              <button onClick={() => setMobileOpen(false)}>✕</button>
            </div>
            <nav className="flex flex-col gap-1">
              <Link href="/auth/login" className="py-3 px-2 border-b text-sm font-medium">Mon compte</Link>
              <Link href="/vendor/dashboard" className="py-3 px-2 border-b text-sm font-medium text-[#00A550]">Devenir vendeur</Link>
              {categories.map((c) => (
                <Link key={c.id} href={`/catalogue?categorie=${c.slug}`} className="py-2.5 px-2 flex items-center gap-2 text-sm hover:bg-gray-50 rounded-lg">
                  <span>{c.icon}</span>{c.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <CartSidebar />
    </>
  );
}
