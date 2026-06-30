"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Candidature = {
  id: string;
  utilisateur_id: string;
  vehicule: string;
  zone: string;
  message: string | null;
  statut: "en_attente" | "approuvee" | "refusee";
  created_at: string;
  utilisateur: { nom: string; email: string | null; telephone: string | null } | null;
};

type Toast = { message: string; type: "succes" | "erreur" };

const VEHICULE_LABEL: Record<string, string> = {
  moto: "Moto 🏍️", velo: "Vélo 🚲", voiture: "Voiture 🚗", autre: "Autre",
};

export default function AdminCandidaturesPage() {
  const router = useRouter();
  const [candidatures, setCandidatures] = useState<Candidature[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<"en_attente" | "traitees">("en_attente");
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  const charger = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("candidatures_livreur")
      .select("*, utilisateur:utilisateurs(nom, email, telephone)")
      .order("created_at", { ascending: false });
    setCandidatures((data ?? []) as unknown as Candidature[]);
    setChargement(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      charger();
    })();
  }, [router, charger]);

  const traiter = async (candidature_id: string, decision: "approuvee" | "refusee") => {
    setLoading(candidature_id);
    try {
      const res = await fetch("/api/candidatures", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidature_id, decision }),
      });
      const data = await res.json() as { succes?: boolean; erreur?: string };
      if (data.erreur) { afficherToast(data.erreur, "erreur"); return; }
      afficherToast(
        decision === "approuvee" ? "Candidat approuvé — rôle livreur activé." : "Candidature refusée.",
        "succes"
      );
      charger();
    } catch {
      afficherToast("Erreur réseau.", "erreur");
    } finally {
      setLoading(null);
    }
  };

  const liste = candidatures.filter((c) =>
    onglet === "en_attente" ? c.statut === "en_attente" : c.statut !== "en_attente"
  );
  const nbEnAttente = candidatures.filter((c) => c.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Dashboard Admin</Link>
        <h1 className="text-2xl font-black text-white">Candidatures Livreur</h1>
        <p className="text-white/70 text-sm mt-1">Approuver ou refuser les demandes</p>
      </div>

      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      <div className="px-4 pt-4 flex gap-2">
        <button
          onClick={() => setOnglet("en_attente")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${onglet === "en_attente" ? "bg-[#E63946] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
        >
          En attente {nbEnAttente > 0 && `(${nbEnAttente})`}
        </button>
        <button
          onClick={() => setOnglet("traitees")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${onglet === "traitees" ? "bg-[#E63946] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
        >
          Traitées
        </button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {chargement && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
        ))}

        {!chargement && liste.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-bold text-gray-600">
              {onglet === "en_attente" ? "Aucune candidature en attente" : "Aucune candidature traitée"}
            </p>
          </div>
        )}

        {!chargement && liste.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-black text-gray-800">{c.utilisateur?.nom ?? "—"}</p>
                  {c.utilisateur?.email && (
                    <p className="text-xs text-gray-400">{c.utilisateur.email}</p>
                  )}
                  {c.utilisateur?.telephone && (
                    <a href={`tel:${c.utilisateur.telephone}`} className="text-xs text-[#E63946] font-semibold">
                      📞 {c.utilisateur.telephone}
                    </a>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  c.statut === "en_attente" ? "bg-yellow-100 text-yellow-700" :
                  c.statut === "approuvee"  ? "bg-green-100 text-green-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {c.statut === "en_attente" ? "En attente" : c.statut === "approuvee" ? "Approuvée" : "Refusée"}
                </span>
              </div>

              <div className="flex gap-4 text-sm text-gray-600 mb-2">
                <span>{VEHICULE_LABEL[c.vehicule] ?? c.vehicule}</span>
                <span>📍 {c.zone}</span>
              </div>

              {c.message && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 italic">"{c.message}"</p>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {c.statut === "en_attente" && (
              <div className="px-4 pb-4 flex gap-2 border-t border-gray-50 pt-3">
                <button
                  onClick={() => traiter(c.id, "approuvee")}
                  disabled={loading === c.id}
                  className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                >
                  {loading === c.id ? "..." : "✓ Approuver"}
                </button>
                <button
                  onClick={() => traiter(c.id, "refusee")}
                  disabled={loading === c.id}
                  className="flex-1 border-2 border-red-200 text-red-600 font-bold py-3 rounded-xl text-sm disabled:opacity-50 active:scale-95 transition-all"
                >
                  ✗ Refuser
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
