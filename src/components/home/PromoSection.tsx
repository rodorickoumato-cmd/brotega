import Link from "next/link";

export function PromoSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Big promo */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#00A550] to-[#004d26] rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 text-[150px] opacity-10 select-none">🛍️</div>
          <div className="relative z-10">
            <span className="bg-[#FFD100] text-[#1A202C] text-xs font-black px-3 py-1 rounded-full">OFFRE SPÉCIALE</span>
            <h3 className="text-2xl md:text-3xl font-black mt-3 mb-2">Jusqu'à -40%</h3>
            <p className="text-white/80 mb-5 text-sm">Sur les produits alimentaires et cosmétiques locaux. Offre valable cette semaine.</p>
            <Link href="/catalogue?promo=1" className="inline-flex items-center gap-2 bg-white text-[#00A550] font-bold px-5 py-2.5 rounded-xl hover:bg-[#E8F7EE] transition-colors text-sm">
              Profiter maintenant →
            </Link>
          </div>
        </div>

        {/* Side promos */}
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-br from-[#FFD100] to-[#FF8C00] rounded-3xl p-6 text-white relative overflow-hidden flex-1">
            <div className="absolute right-2 bottom-2 text-5xl opacity-20">🎨</div>
            <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">ARTISANAT</span>
            <h4 className="font-black text-lg mt-2 mb-1">Art Gabonais</h4>
            <p className="text-white/80 text-xs mb-3">Sculptures, masques et créations uniques</p>
            <Link href="/catalogue?categorie=artisanat" className="text-white font-bold text-sm hover:underline">
              Découvrir →
            </Link>
          </div>
          <div className="bg-gradient-to-br from-[#9B59B6] to-[#6C3483] rounded-3xl p-6 text-white relative overflow-hidden flex-1">
            <div className="absolute right-2 bottom-2 text-5xl opacity-20">👗</div>
            <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">MODE</span>
            <h4 className="font-black text-lg mt-2 mb-1">Wax & Bazin</h4>
            <p className="text-white/80 text-xs mb-3">Tenues africaines modernes et élégantes</p>
            <Link href="/catalogue?categorie=mode" className="text-white font-bold text-sm hover:underline">
              Explorer →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
