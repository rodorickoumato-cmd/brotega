"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { formatXAF } from "@/lib/utils";
import { vers241 } from "@/lib/phone";
import { getMonWallet, getMesTransactions, demanderRetrait } from "@/app/actions/wallet";
import type { Wallet, WalletTransaction } from "@/lib/supabase/database.types";

const TYPE_AFFICHAGE: Record<WalletTransaction["type"], { label: string; couleur: string; emoji: string }> = {
  credit_escrow:  { label: "Vente reçue (escrow)",     couleur: "blue",   emoji: "🔒" },
  liberation:     { label: "Libération après livraison", couleur: "green", emoji: "💰" },
  commission:     { label: "Commission Brotega",       couleur: "gray",   emoji: "🏷️" },
  retrait:        { label: "Retrait Mobile Money",     couleur: "amber",  emoji: "📤" },
  remboursement:  { label: "Remboursement",            couleur: "red",    emoji: "↩️" },
  ajustement:     { label: "Ajustement",                couleur: "gray",   emoji: "⚙️" },
};

export default function PageWallet() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [chargement, setChargement] = useState(true);
  const [showRetrait, setShowRetrait] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      const [w, tx] = await Promise.all([getMonWallet(), getMesTransactions()]);
      if (!actif) return;
      if (w.erreur) { toast(w.erreur, "error"); router.push("/vendor/dashboard"); return; }
      setWallet(w.wallet);
      setTransactions(tx);
      setChargement(false);
    })();
    return () => { actif = false; };
  }, [router]);

  const recharger = async () => {
    const [w, tx] = await Promise.all([getMonWallet(), getMesTransactions()]);
    setWallet(w.wallet);
    setTransactions(tx);
  };

  if (chargement) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63946] mx-auto" />
        <p className="text-gray-500 mt-4">Chargement de votre wallet...</p>
      </div>
    );
  }

  const pending = wallet?.balance_pending_xaf ?? 0;
  const available = wallet?.balance_available_xaf ?? 0;
  const total = pending + available;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Mon argent</h1>
          <p className="text-sm text-gray-500">Vos paiements et retraits</p>
        </div>
        <Link href="/vendor/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
      </div>

      {/* Solde TOTAL — gros chiffre rassurant */}
      <div className="bg-gradient-to-br from-[#E63946] to-[#008F47] rounded-3xl p-6 text-white shadow-lg">
        <p className="text-sm text-white/80 mb-1">Total dans votre wallet</p>
        <p className="text-4xl font-black">{formatXAF(total)}</p>
      </div>

      {/* Deux piles visuelles : pending vs available */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pending */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <div className="text-2xl mb-1">🔒</div>
          <p className="text-xs text-blue-700 font-semibold mb-1">EN ATTENTE LIVRAISON</p>
          <p className="text-2xl font-black text-blue-900">{formatXAF(pending)}</p>
          <p className="text-xs text-blue-700 mt-2">
            Argent reçu — sera disponible dès la confirmation de livraison
          </p>
        </div>

        {/* Available */}
        <div className="bg-[#FEF2F2] border border-[#E63946]/30 rounded-2xl p-5">
          <div className="text-2xl mb-1">💰</div>
          <p className="text-xs text-[#E63946] font-semibold mb-1">DISPONIBLE À RETIRER</p>
          <p className="text-2xl font-black text-[#E63946]">{formatXAF(available)}</p>
          <p className="text-xs text-[#E63946] mt-2">
            Vous pouvez retirer ce montant maintenant
          </p>
        </div>
      </div>

      {/* Bouton retrait */}
      <Button
        fullWidth size="lg"
        onClick={() => setShowRetrait(true)}
        disabled={available < 5000}
        className="py-4 text-base"
      >
        📤 Retirer mon argent
      </Button>
      {available < 5000 && (
        <p className="text-xs text-gray-500 text-center -mt-2">
          Minimum pour retirer : 5 000 XAF
        </p>
      )}

      {/* Historique transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Historique</h2>
          <p className="text-xs text-gray-500">{transactions.length} mouvement{transactions.length > 1 ? "s" : ""}</p>
        </div>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Aucun mouvement pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const aff = TYPE_AFFICHAGE[tx.type];
              const positif = tx.montant_xaf > 0;
              return (
                <div key={tx.id} className="p-4 flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{aff.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{aff.label}</p>
                    {tx.description && <p className="text-xs text-gray-500 line-clamp-1">{tx.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className={`font-black text-sm flex-shrink-0 ${positif ? "text-[#E63946]" : "text-red-500"}`}>
                    {positif ? "+" : ""}{formatXAF(tx.montant_xaf)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Garantie escrow */}
      <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700">
        <p className="font-bold mb-1">🛡️ Comment ça marche ?</p>
        <ol className="text-xs space-y-1 list-decimal list-inside">
          <li>Un client paye → l&apos;argent va dans &quot;En attente livraison&quot;</li>
          <li>Le client confirme la réception (ou auto-confirmé après 7 jours)</li>
          <li>L&apos;argent passe dans &quot;Disponible&quot; (- 5% de commission Brotega)</li>
          <li>Vous retirez vers Airtel Money ou Moov Money en 24h max</li>
        </ol>
      </div>

      {showRetrait && (
        <ModaleRetrait
          available={available}
          onClose={() => setShowRetrait(false)}
          onSucces={recharger}
        />
      )}
    </div>
  );
}

// ─── Modale demande de retrait ───────────────────────────────
function ModaleRetrait({
  available, onClose, onSucces,
}: { available: number; onClose: () => void; onSucces: () => void }) {
  const [montant, setMontant] = useState("");
  const [telephone, setTelephone] = useState("");
  const [provider, setProvider] = useState<"airtel" | "moov">("airtel");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseInt(montant.replace(/\s/g, ""), 10);
    if (!Number.isFinite(m) || m <= 0) { toast("Montant invalide", "error"); return; }
    if (m > available) { toast("Montant supérieur au solde disponible", "error"); return; }
    if (!vers241(telephone)) { toast("Numéro Mobile Money invalide", "error"); return; }

    setLoading(true);
    const res = await demanderRetrait({ montant_xaf: m, telephone, provider });
    setLoading(false);
    if (res.erreur) { toast(res.erreur, "error"); return; }
    toast(res.message ?? "Retrait demandé", "success");
    onSucces();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-xl text-gray-800">Retirer mon argent</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Choix opérateur */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Vers quel Mobile Money ?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["airtel", "moov"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`p-3 rounded-xl border-2 font-semibold transition-all text-sm ${
                    provider === p ? "border-[#E63946] bg-[#FEF2F2] text-[#E63946]" : "border-gray-200 text-gray-500"
                  }`}
                >
                  <div className="text-xl mb-1">{p === "airtel" ? "📱" : "📲"}</div>
                  {p === "airtel" ? "Airtel Money" : "Moov Money"}
                </button>
              ))}
            </div>
          </div>

          {/* Montant */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">
              Combien retirer ?
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={montant}
                onChange={(e) => setMontant(e.target.value.replace(/\D/g, ""))}
                placeholder="10000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 pr-16 text-base font-semibold focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">XAF</span>
            </div>
            <button
              type="button"
              onClick={() => setMontant(String(available))}
              className="text-xs text-[#E63946] font-bold hover:underline mt-1.5"
            >
              Tout retirer ({formatXAF(available)})
            </button>
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-1.5 block">
              Votre numéro {provider === "airtel" ? "Airtel" : "Moov"} Money
            </label>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#E63946] focus-within:ring-2 focus-within:ring-[#E63946]/20">
              <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-600 border-r border-gray-200 font-medium">
                🇬🇦 +241
              </span>
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="01 23 45 67"
                className="flex-1 px-3 py-3.5 text-sm focus:outline-none"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-900">
            ⏱️ <strong>Délai :</strong> Vous recevrez l&apos;argent sous 24h max. 1 retrait par jour maximum.
          </div>

          <Button type="submit" fullWidth size="lg" loading={loading} className="py-4 text-base">
            Confirmer le retrait
          </Button>
        </form>
      </div>
    </div>
  );
}
