import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/sw/ServiceWorkerRegister";
import { AiChat } from "@/components/ai/AiChat";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      <OfflineBanner />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <AiChat />
      <WhatsAppButton />
    </>
  );
}
