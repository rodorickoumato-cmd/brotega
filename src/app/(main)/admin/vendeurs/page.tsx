"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getVendeursAdmin, changerStatutVendeur, traiterAbonnementsExpires } from "@/app/actions/admin";
import Link from "next/link";

type AboInfo = {
  plan: string;
  statut: string;
  date_fin: string | null;
  prix_xaf: number;
} | null;

type Vendeur = {
  id: string;
  nom: string;
  slug: string;
  ville: string;
  statut: "en_attente" | "verifie" | "suspendu";
  categories: string[];
  nb_produits: number;
  note: number;
  created_at: string;
  utilisateur_id: string;
  abonnement: AboInfo;
};

const STATUT_STYLE: Record<string, string> = {
  en_attente: "bg-yellow-50 border-yellow-200 text-yellow-700",
  verifie:    "bg-green-50 border-green-200 text-green-700",
  suspendu:   "bg-red-50 border-red-200 text-red-700",
};
const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  verifie:    "Vérifié ✓",
  suspendu:   "Suspendu",
};

const PLAN_EMOJI: Record<string, string> = {
  gratuit:     "🌱",
  mensuel:     "📦",
  trimestriel: "🚀",
  semestriel:  "💎",
  annuel:      "👑",
};

function badgeAbo(abo: AboInfo) {
  if (!abo) return <span className="text-xs text-gray-300">— aucun abonnement</span>;

  if (abo.plan === "gratuit") {
    return (
      <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full">
        {PLAN_EMOJI.gratuit} Gratuit
      </span>
    );
  }

  const emoji = PLAN_EMOJI[abo.plan] ?? "📦";
  const label = abo.plan.charAt(0).toUpperCase() + abo.plan.slice(1);

  if (abo.statut === "expire") {
    return (
      <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
        ⚠️ {label} expiré
      </span>
    );
  }

  if (abo.date_fin) {
    const jours = Math.ceil((new Date(abo.date_fin).getTime() - Date.now()) / 86400000);
    const couleur = jours <= 7 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700";
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${couleur}`}>
        {emoji} {label} · {jours > 0 ? `J-${jours}` : "expiré aujourd'hui"}
      </span>
    );
  }

  return (
    <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
      {emoji} {label}
    </span>
  );
}

const FILTRES = ["Tous", "en_attente", "verifie", "suspendu"] as const;

export default function AdminVendeursPage() {
  const router = useRouter();
  const [vendeurs, setVendeurs] = useState<Vendeur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<string>("Tous");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [expirationEnCours, setExpirationEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth/login"); return; }
        const { data: profil } = await supabase
          .from("utilisateurs").select("role").eq("id", user.id).single();
        if (profil?.role !== "admin") { router.push("/"); return; }
        const res = await getVendeursAdmin();
        setVendeurs((res.vendeurs as Vendeur[]) ?? []);
      } catch {
        setErreur("Erreur de chargement.");
      } finally {
        setChargement(false);
      }
    })();
  }, [router]);

  const handleStatut = async (vendeurId: string, statut: "verifie" | "suspendu" | "en_attente") => {
    setErreur(""); setMessage("");
    setEnCours(vendeurId);
    const res = await changerStatutVendeur(vendeurId, statut);
    setEnCours(null);
    if (res.erreur) { setErreur(res.erreur); return; }
    setVendeurs((prev) => prev.map((v) => v.id === vendeurId ? { ...v, statut } : v));
    setMessage(
      statut === "verifie" ? "✓ Boutique validée — le vendeur peut maintenant vendre." :
      statut === "suspendu" ? "Boutique suspendue." :
      "Boutique remise en attente."
    );
  };

  const handleTraiterExpirations = async () => {
    setErreur(""); setMessage("");
    setExpirationEnCours(true);
    const res = await traiterAbonnementsExpires();
    setExpirationEnCours(false);
    if (res.erreur) { setErreur(res.erreur); return; }
    if (res.nb === 0) {
      setMessage("Aucun abonnement expiré à traiter.");
    } else {
      setMessage(`${res.nb} boutique${res.nb > 1 ? "s" : ""} suspendue${res.nb > 1 ? "s" : ""} pour abonnement expiré.`);
      // Recharger la liste
      const updated = await getVendeursAdmin();
      setVendeurs((updated.vendeurs as Vendeur[]) ?? []);
    }
  };

  const visibles = vendeurs.filter((v) => filtre === "Tous" || v.statut === filtre);
  const nbAttente = vendeurs.filter((v) => v.statut === "en_attente").length;
  const nbAboExpires = vendeurs.filter(
    (v) => v.abonnement?.statut === "expire" || (
      v.abonnement?.date_fin && new Date(v.abonnement.date_fin) < new Date() && v.abonnement.plan !== "gratuit"
    )
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-12 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Admin</Link>
        <h1 className="text-2xl font-black text-white">Vendeurs 🏪</h1>
        <p className="text-white/70 text-sm mt-1">
          {vendeurs.length} boutiques
          {nbAttente > 0 && ` · ${nbAttente} en attente de validation`}
          {nbAboExpires > 0 && ` · ⚠️ ${nbAboExpires} abonnement${nbAboExpires > 1 ? "s" : ""} expiré${nbAboExpires > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Alertes */}
        {erreur && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700 font-medium flex items-center justify-between">
            {erreur}
            <button onClick={() => setErreur("")} className="text-red-400 ml-2">✕</button>
          </div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium flex items-center justify-between">
            {message}
            <button onClick={() => setMessage("")} className="text-green-400 ml-2">✕</button>
          </div>
        )}

        {/* Action : traiter les abonnements expirés */}
        {nbAboExpires > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-orange-800">
                {nbAboExpires} abonnement{nbAboExpires > 1 ? "s" : ""} expiré{nbAboExpires > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-orange-600">
                Les produits en excès seront masqués et les boutiques suspendues.
              </p>
            </div>
            <button
              onClick={handleTraiterExpirations}
              disabled={expirationEnCours}
              className="flex-shrink-0 bg-orange-500 text-white text-xs font-black px-3 py-2 rounded-xl disabled:opacity-50 active:scale-95 transition-all"
            >
              {expirationEnCours ? "…" : "Traiter"}
            </button>
          </div>
        )}

        {/* Explication du processus */}
        <div className="bg-white rounded-2xl p-4 border border-blue-100">
          <p className="text-xs font-black text-blue-800 mb-2">Comment ça marche ?</p>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p>1. Un vendeur crée sa boutique → statut <span className="font-bold text-yellow-700">En attente</span></p>
            <p>2. Vous vérifiez et cliquez <span className="font-bold text-green-700">✓ Vérifier</span> → la boutique est active</p>
            <p>3. Si abonnement payant non renouvelé → cliquez <span className="font-bold text-orange-700">Traiter</span> ci-dessus pour suspendre automatiquement</p>
            <p>4. Pour une violation → <span className="font-bold text-red-700">Suspendre</span> manuellement</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {FILTRES.map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filtre === f
                  ? "bg-[#E63946] border-[#E63946] text-white"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
            >
              {f === "Tous" ? `Tous (${vendeurs.length})` : `${STATUT_LABEL[f]} (${vendeurs.filter((v) => v.statut === f).length})`}
            </button>
          ))}
        </div>

        {chargement && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-36" />
        ))}

        {!chargement && visibles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-gray-500 font-medium">Aucun vendeur dans cette catégorie</p>
          </div>
        )}

        {!chargement && visibles.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 text-base">{v.nom}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    📍 {v.ville}
                    {v.categories.length > 0 && ` · ${v.categories.slice(0, 2).join(", ")}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.nb_produits} produit{v.nb_produits !== 1 ? "s" : ""}
                    {v.note > 0 && ` · ⭐ ${v.note.toFixed(1)}`}
                  </p>
                  {/* Badge abonnement */}
                  <div className="mt-1.5">
                    {badgeAbo(v.abonnement)}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUT_STYLE[v.statut]}`}>
                  {STATUT_LABEL[v.statut]}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Inscrit le {new Date(v.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>

            <div className="px-4 pb-4 flex gap-2 flex-wrap border-t border-gray-50 pt-3">
              {/* Valider */}
              {v.statut !== "verifie" && (
                <button
                  onClick={() => handleStatut(v.id, "verifie")}
                  disabled={enCours === v.id}
                  className="bg-[#E63946] text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {enCours === v.id ? "…" : "✓ Valider"}
                </button>
              )}
              {/* Suspendre */}
              {v.statut !== "suspendu" && (
                <button
                  onClick={() => handleStatut(v.id, "suspendu")}
                  disabled={enCours === v.id}
                  className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {enCours === v.id ? "…" : "Suspendre"}
                </button>
              )}
              {/* Réactiver */}
              {v.statut === "suspendu" && (
                <button
                  onClick={() => handleStatut(v.id, "en_attente")}
                  disabled={enCours === v.id}
                  className="bg-gray-500 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                >
                  {enCours === v.id ? "…" : "Réactiver"}
                </button>
              )}
              <Link
                href={`/vendeur/${v.slug}`}
                className="text-xs font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-[#E63946]/40 transition-colors"
              >
                Voir →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
