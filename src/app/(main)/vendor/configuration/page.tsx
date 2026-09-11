// Dashboard configuration vendeur — Commission & Stratégie

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CommissionDashboard } from "@/components/vendor/CommissionDashboard";

export default async function VendorConfigurationPage() {
  const supabase = await createClient();

  // Vérifier que l'utilisateur est authentifié
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Récupérer le vendeur de cet utilisateur
  const { data: vendeur } = await supabase
    .from("vendeurs")
    .select("id, nom, slug")
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (!vendeur) {
    redirect("/vendor/register");
  }

  // Récupérer les infos du plan actuel
  const { data: abonnement } = await supabase
    .from("abonnements")
    .select("plan, statut")
    .eq("vendeur_id", vendeur.id)
    .eq("statut", "actif")
    .maybeSingle();

  return (
    <main className="flex-1 bg-[#F7F8FA] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/vendor/dashboard"
            className="text-[#E63946] text-sm font-bold mb-3 inline-block hover:underline"
          >
            ← Retour au Dashboard
          </Link>
          <h1 className="text-2xl font-black text-gray-800">⚙️ Configuration</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez votre stratégie de commission pour maximiser vos revenus
          </p>
        </div>

        {/* Breadcrumb d'info */}
        <div className="bg-[#FEF2F2] border border-[#E63946]/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            <span className="font-bold">Boutique:</span> {vendeur.nom} {" "}
            {abonnement && (
              <>
                • <span className="font-bold">Plan:</span>{" "}
                {abonnement.plan === "gratuit" ? "Découverte" : "Business"}
              </>
            )}
          </p>
        </div>

        {/* Commission Dashboard Component */}
        <CommissionDashboard />

        {/* Section Info Système */}
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-black text-gray-800 mb-4">📚 Comment ça marche ?</h2>
          <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
            <p>
              <span className="font-bold">Nouveau système :</span> Fini les limites d'articles !
              Vous pouvez maintenant publier <strong>illimité</strong> d'articles.
            </p>
            <p>
              <span className="font-bold">Monétisation :</span> Au lieu d'un abonnement,
              nous facturons une <strong>commission %</strong> sur chaque article vendu.
            </p>
            <p>
              <span className="font-bold">Votre contrôle :</span> Vous fixez une commission
              par défaut, et pouvez la <strong>personnaliser par produit</strong> selon votre stratégie.
            </p>
            <p>
              <span className="font-bold">Incitation :</span> Plus vous publiez, plus vous gagnez
              potentiellement. Pas de limite = plus de produits = plus de ventes !
            </p>
          </div>
        </div>

        {/* Section Exemple */}
        <div className="mt-6 bg-green-50 rounded-xl border border-green-200 p-6">
          <h3 className="font-bold text-green-900 mb-3">✅ Exemple de Calcul</h3>
          <div className="space-y-2 text-sm text-green-800">
            <p>
              <span className="font-semibold">Vous vendez un article 100,000 XAF</span>
            </p>
            <p className="ml-4">
              Commission défaut: <strong>5%</strong> = 5,000 XAF (plateforme)
            </p>
            <p className="ml-4">
              Vous recevez: <strong>95,000 XAF</strong>
            </p>
            <p className="mt-3 border-t border-green-300 pt-3">
              <span className="font-semibold">Avec 10 produits vendus par jour:</span>
            </p>
            <p className="ml-4 font-black text-green-900">
              950,000 XAF / jour = 28.5M XAF / mois ! 🚀
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-8 text-center pb-6">
          <Link
            href="/vendor/produits"
            className="inline-block bg-[#E63946] text-white px-6 py-3 rounded-lg font-black text-sm active:scale-95 transition-transform"
          >
            Gérer mes articles →
          </Link>
        </div>
      </div>
    </main>
  );
}
