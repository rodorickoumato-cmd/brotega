import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { PromoSection } from "@/components/home/PromoSection";
import { VendorsSection } from "@/components/home/VendorsSection";
import { NewProducts } from "@/components/home/NewProducts";
import { WhyBrotega } from "@/components/home/WhyBrotega";
import { PaymentBanner } from "@/components/home/PaymentBanner";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <CategoriesSection />
        <FeaturedProducts />
        <PromoSection />
        <VendorsSection />
        <NewProducts />
        <WhyBrotega />
        <PaymentBanner />
      </main>
      <Footer />
    </>
  );
}
