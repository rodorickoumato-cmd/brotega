"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Statuts qui autorisent le chat
const STATUTS_CHAT = ["payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"] as const;

type Conversation = {
  commande_id: string;
  code_court: string | null;
  dernier_message: string;
  non_lus: number;
  interlocuteur: string;
  updated_at: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login?redirect=/messages"); return; }

      // Vérifie si l'utilisateur est aussi vendeur
      const { data: vendeur } = await supabase
        .from("vendeurs").select("id, nom").eq("utilisateur_id", user.id).maybeSingle();

      // Commandes comme acheteur
      const { data: cmdAcheteur } = await supabase
        .from("commandes")
        .select("id, code_court, vendeur_id")
        .eq("utilisateur_id", user.id)
        .in("statut", STATUTS_CHAT);

      // Commandes comme vendeur
      const { data: cmdVendeur } = vendeur
        ? await supabase
            .from("commandes")
            .select("id, code_court, utilisateur_id")
            .eq("vendeur_id", vendeur.id)
            .in("statut", STATUTS_CHAT)
        : { data: [] };

      const toutesLesCommandes = [...(cmdAcheteur ?? []), ...(cmdVendeur ?? [])];
      const commandeIds = toutesLesCommandes.map((c) => c.id);

      if (commandeIds.length === 0) { setChargement(false); return; }

      // Noms des interlocuteurs pour les commandes acheteur (→ nom de la boutique)
      const vendeurIds = (cmdAcheteur ?? []).map((c) => (c as { vendeur_id: string | null }).vendeur_id).filter(Boolean) as string[];
      const { data: vendeurs } = vendeurIds.length > 0
        ? await supabase.from("vendeurs").select("id, nom").in("id", vendeurIds)
        : { data: [] };

      // Noms des interlocuteurs pour les commandes vendeur (→ nom de l'acheteur)
      const acheteurIds = (cmdVendeur ?? []).map((c) => (c as { utilisateur_id: string | null }).utilisateur_id).filter(Boolean) as string[];
      const { data: acheteurs } = acheteurIds.length > 0
        ? await supabase.from("utilisateurs").select("id, nom").in("id", acheteurIds)
        : { data: [] };

      // Messages pour ces commandes, triés du plus récent
      const { data: msgs } = await supabase
        .from("messages")
        .select("commande_id, contenu, lu, created_at, expediteur_id")
        .in("commande_id", commandeIds)
        .order("created_at", { ascending: false });

      // Groupe par commande_id
      const parCommande = new Map<string, Conversation>();
      for (const m of msgs ?? []) {
        if (!parCommande.has(m.commande_id)) {
          const cmdA = (cmdAcheteur ?? []).find((c) => c.id === m.commande_id) as { id: string; code_court: string | null; vendeur_id?: string | null } | undefined;
          const cmdV = (cmdVendeur ?? []).find((c) => c.id === m.commande_id) as { id: string; code_court: string | null; utilisateur_id?: string | null } | undefined;

          let interlocuteur = "—";
          if (cmdA?.vendeur_id) {
            interlocuteur = vendeurs?.find((v) => v.id === cmdA.vendeur_id)?.nom ?? "Vendeur";
          } else if (cmdV?.utilisateur_id) {
            interlocuteur = acheteurs?.find((a) => a.id === cmdV.utilisateur_id)?.nom ?? "Acheteur";
          }

          parCommande.set(m.commande_id, {
            commande_id: m.commande_id,
            code_court: cmdA?.code_court ?? cmdV?.code_court ?? null,
            dernier_message: m.contenu,
            non_lus: !m.lu && m.expediteur_id !== user.id ? 1 : 0,
            interlocuteur,
            updated_at: m.created_at,
          });
        } else if (!m.lu && m.expediteur_id !== user.id) {
          parCommande.get(m.commande_id)!.non_lus++;
        }
      }

      const liste = Array.from(parCommande.values())
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setConversations(liste);
      setChargement(false);
    })();
  }, [router]);

  const formaterDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-white px-5 pt-5 pb-5 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-800">Messages</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vos conversations liées à vos commandes</p>
      </div>

      {chargement && (
        <div className="px-4 py-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!chargement && conversations.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-bold text-gray-700 mb-1">Aucun message</p>
          <p className="text-sm text-gray-400">Vos conversations apparaîtront ici après une commande</p>
          <Link href="/catalogue"
            className="inline-block mt-5 bg-[#E63946] text-white font-bold px-6 py-3 rounded-2xl text-sm">
            Parcourir le catalogue
          </Link>
        </div>
      )}

      {!chargement && conversations.length > 0 && (
        <div className="px-4 py-4 space-y-2">
          {conversations.map((c) => (
            <Link key={c.commande_id} href={`/messages/${c.commande_id}`}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 active:scale-98 transition-all shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center text-xl flex-shrink-0">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-black text-sm text-gray-800 truncate">{c.interlocuteur}</p>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-2">{formaterDate(c.updated_at)}</p>
                </div>
                <p className="text-xs text-gray-400 mb-0.5">Commande {c.code_court ?? c.commande_id.slice(0, 8)}</p>
                <p className="text-sm text-gray-500 truncate">{c.dernier_message}</p>
              </div>
              {c.non_lus > 0 && (
                <div className="w-5 h-5 bg-[#E63946] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-black">{c.non_lus}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
