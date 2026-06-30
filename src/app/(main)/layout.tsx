import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/sw/ServiceWorkerRegister";
import { PushPermissionBanner } from "@/components/ui/PushPermissionBanner";
import { AiChat } from "@/components/ai/AiChat";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { BanniereSysteme } from "@/components/ui/BanniereSysteme";
import { getAppConfig } from "@/lib/config";
import { getCategories } from "@/lib/categories";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [cfg, categories] = await Promise.all([
    getAppConfig(),
    getCategories(),
  ]);

  const cfgExtra = cfg as unknown as Record<string, unknown>;

  // Mode maintenance → rediriger vers la page de maintenance
  // Sauf si on est déjà sur /maintenance pour éviter la boucle infinie
  if (cfgExtra.maintenance_actif === true) {
    redirect("/maintenance");
  }

  const banniere = {
    actif: cfgExtra.banniere_actif === true,
    texte: (cfgExtra.banniere_texte as string) ?? "",
    type:  (cfgExtra.banniere_type  as string) ?? "info",
  };

  const whatsapp = (cfgExtra.contact_whatsapp as string) ?? "24100000000";

  return (
    <>
      <ServiceWorkerRegister />
      <PushPermissionBanner />
      <OfflineBanner />
      {banniere.actif && banniere.texte && (
        <BanniereSysteme texte={banniere.texte} type={banniere.type} />
      )}
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} whatsapp={whatsapp} cfgExtra={cfgExtra} />
      <ScrollToTop />
      <AiChat />
      <WhatsAppButton numero={whatsapp} />
    </>
  );
}
