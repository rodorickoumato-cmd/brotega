"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const slides = [
  {
    title: "Bienvenue sur J'adore la Famille",
    subtitle: "La Marketplace du Gabon 🇬🇦",
    description: "Achetez et vendez en toute confiance. Produits locaux et internationaux livrés partout au Gabon.",
    cta: "Découvrir les produits",
    ctaLink: "/catalogue",
    bg: "from-[#E63946] to-[#C1121F]",
    image: "🛒",
  },
  {
    title: "Artisanat Gabonais",
    subtitle: "Des créations authentiques",
    description: "Découvrez les œuvres uniques des artisans gabonais. Masques, sculptures, textiles et bijoux traditionnels.",
    cta: "Explorer l'artisanat",
    ctaLink: "/catalogue?categorie=artisanat",
    bg: "from-[#8B4513] to-[#5D2E0C]",
    image: "🎨",
  },
  {
    title: "Devenez Vendeur",
    subtitle: "Développez votre business",
    description: "Rejoignez plus de 500 vendeurs sur J'adore la Famille. Créez votre boutique gratuitement et vendez dans tout le Gabon.",
    cta: "Commencer à vendre",
    ctaLink: "/vendor/register",
    bg: "from-[#FFD100] to-[#E6A800]",
    image: "💼",
    dark: true,
  },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  return (
    <section className={`bg-gradient-to-br ${slide.bg} transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-up">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 ${slide.dark ? "bg-black/10 text-gray-800" : "bg-white/20 text-white"}`}>
              🇬🇦 {slide.subtitle}
            </div>
            <h1 className={`text-3xl md:text-5xl font-black leading-tight mb-4 ${slide.dark ? "text-gray-900" : "text-white"}`}>
              {slide.title}
            </h1>
            <p className={`text-base md:text-lg mb-8 leading-relaxed ${slide.dark ? "text-gray-700" : "text-white/90"}`}>
              {slide.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={slide.ctaLink}>
                <Button
                  variant={slide.dark ? "primary" : "secondary"}
                  size="lg"
                >
                  {slide.cta}
                </Button>
              </Link>
              <Link href="/vendor/register">
                <Button
                  variant={slide.dark ? "outline" : "ghost"}
                  size="lg"
                  className={slide.dark ? "" : "text-white border-white/40 hover:bg-white/20 hover:text-white"}
                >
                  Vendre sur J'adore la Famille
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className={`flex gap-6 mt-8 pt-8 border-t ${slide.dark ? "border-black/10" : "border-white/20"}`}>
              {[["500+", "Vendeurs"], ["15k+", "Produits"], ["12", "Villes"]].map(([n, l]) => (
                <div key={l}>
                  <div className={`text-2xl font-black ${slide.dark ? "text-[#E63946]" : "text-white"}`}>{n}</div>
                  <div className={`text-xs ${slide.dark ? "text-gray-600" : "text-white/70"}`}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual */}
          <div className="flex flex-col gap-4">
            {/* Big card */}
            <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-6 text-center">
              <div className="text-8xl mb-4">{slide.image}</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Livraison express", icon: "🚚", sub: "Libreville 24h" },
                  { label: "Paiement Mobile", icon: "📱", sub: "Airtel & Moov" },
                  { label: "Produits locaux", icon: "🌿", sub: "Made in Gabon" },
                  { label: "Vendeurs vérifiés", icon: "✅", sub: "+500 boutiques" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl p-3 text-left ${slide.dark ? "bg-black/10" : "bg-white/20"}`}>
                    <div className="text-xl mb-1">{item.icon}</div>
                    <div className={`text-xs font-bold ${slide.dark ? "text-gray-800" : "text-white"}`}>{item.label}</div>
                    <div className={`text-xs ${slide.dark ? "text-gray-500" : "text-white/70"}`}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === current ? (slide.dark ? "bg-[#E63946] w-8" : "bg-white w-8") : (slide.dark ? "bg-black/20 w-2" : "bg-white/40 w-2")}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
