"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/supabase/database.types";

const STATUTS_CHAT = ["payee_escrow", "confirmee_vendeur", "en_livraison", "livree", "litige"];

export default function ChatPage() {
  const { commandeId } = useParams<{ commandeId: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [codeCommande, setCodeCommande] = useState<string | null>(null);
  const [interlocuteur, setInterlocuteur] = useState("Conversation");
  const [chatDisponible, setChatDisponible] = useState(true);
  const bas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      // Vérifie que la commande existe
      const { data: commande } = await supabase
        .from("commandes")
        .select("id, code_court, utilisateur_id, vendeur_id, statut")
        .eq("id", commandeId)
        .single();

      if (!commande) { router.push("/messages"); return; }
      setCodeCommande(commande.code_court);

      // Vérifie l'autorisation : l'utilisateur doit être acheteur ou vendeur
      const estAcheteur = commande.utilisateur_id === user.id;
      let estVendeur = false;

      if (!estAcheteur && commande.vendeur_id) {
        const { data: v } = await supabase
          .from("vendeurs")
          .select("id")
          .eq("id", commande.vendeur_id)
          .eq("utilisateur_id", user.id)
          .maybeSingle();
        estVendeur = !!v;
      }

      if (!estAcheteur && !estVendeur) { router.push("/messages"); return; }

      // Chat disponible selon statut
      if (!STATUTS_CHAT.includes(commande.statut)) setChatDisponible(false);

      // Nom de l'interlocuteur
      if (estAcheteur && commande.vendeur_id) {
        const { data: v } = await supabase
          .from("vendeurs").select("nom").eq("id", commande.vendeur_id).single();
        if (v) setInterlocuteur(v.nom);
      } else if (estVendeur && commande.utilisateur_id) {
        const { data: a } = await supabase
          .from("utilisateurs").select("nom").eq("id", commande.utilisateur_id).single();
        if (a) setInterlocuteur(a.nom);
      }

      // Charge les messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("commande_id", commandeId)
        .order("created_at", { ascending: true });
      setMessages(msgs ?? []);

      // Marque les messages reçus comme lus
      await supabase.from("messages")
        .update({ lu: true })
        .eq("commande_id", commandeId)
        .neq("expediteur_id", user.id);
    })();

    // Abonnement realtime
    const supabase2 = createClient();
    const channel = supabase2
      .channel(`messages:${commandeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `commande_id=eq.${commandeId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        supabase2.from("messages").update({ lu: true }).eq("id", (payload.new as Message).id);
      })
      .subscribe();

    return () => { supabase2.removeChannel(channel); };
  }, [commandeId, router]);

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const envoyer = async () => {
    if (!texte.trim() || !userId || envoi || !chatDisponible) return;
    const contenu = texte.trim();
    setTexte("");
    setEnvoi(true);
    const supabase = createClient();
    await supabase.from("messages").insert({
      commande_id: commandeId,
      expediteur_id: userId,
      contenu,
    });
    setEnvoi(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA]">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
        <Link href="/messages" className="text-gray-500 text-xl flex-shrink-0">←</Link>
        <div className="w-9 h-9 bg-[#FEF2F2] rounded-full flex items-center justify-center text-lg flex-shrink-0">🏪</div>
        <div className="min-w-0">
          <p className="font-black text-sm text-gray-800 truncate">{interlocuteur}</p>
          <p className="text-xs text-gray-400">Commande {codeCommande ?? commandeId.slice(0, 8)}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && chatDisponible && (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400">Commencez la conversation</p>
          </div>
        )}
        {!chatDisponible && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center mt-4">
            <p className="text-sm text-amber-700 font-semibold">
              Le chat est disponible une fois la commande payée.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const estMoi = m.expediteur_id === userId;
          return (
            <div key={m.id} className={`flex ${estMoi ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                estMoi
                  ? "bg-[#E63946] text-white rounded-br-sm"
                  : "bg-white text-gray-800 shadow-sm rounded-bl-sm"
              }`}>
                <p className="leading-relaxed">{m.contenu}</p>
                <p className={`text-xs mt-1 ${estMoi ? "text-white/60" : "text-gray-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bas} />
      </div>

      {/* Zone de saisie */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex-shrink-0">
        {chatDisponible ? (
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 min-h-[44px] max-h-32">
              <textarea
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
                placeholder="Votre message..."
                rows={1}
                className="w-full bg-transparent text-sm text-gray-800 resize-none focus:outline-none leading-relaxed"
              />
            </div>
            <button
              onClick={envoyer}
              disabled={!texte.trim() || envoi}
              className="w-11 h-11 bg-[#E63946] rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
            >
              <span className="text-white text-lg">↑</span>
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-1">Chat non disponible</p>
        )}
      </div>
    </div>
  );
}
