"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const VEHICULES = [
  { value: "moto",    label: "Moto 🏍️",       desc: "Idéal pour la ville" },
  { value: "velo",    label: "Vélo 🚲",         desc: "Pour courtes distances" },
  { value: "voiture", label: "Voiture 🚗",      desc: "Pour colis volumineux" },
  { value: "autre",   label: "Autre",           desc: "Précisez dans le message" },
] as const;

export default function DevenirLivreurPage() {
  const router = useRouter();
  const [etape, setEtape] = useState<"form" | "succes">("form");
  const [vehicule, setVehicule] = useState("");
  const [zone, setZone] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecte, setConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setConnecte(!!user);
    });
  }, []);

  const handleSubmit = async () => {
    if (!vehicule) { setErreur("Choisissez votre véhicule"); return; }
    if (!zone.trim()) { setErreur("Indiquez votre zone d'intervention"); return; }
    setErreur("");
    setLoading(true);
    try {
      const res = await fetch("/api/candidatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicule, zone: zone.trim(), message: message.trim() || undefined }),
      });
      const data = await res.json() as { succes?: boolean; erreur?: string };
      if (data.erreur) { setErreur(data.erreur); return; }
      setEtape("succes");
    } catch {
      setErreur("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  if (connecte === null) return null;

  if (!connecte) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="text-5xl mb-4">🏍️</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">Devenir livreur</h1>
        <p className="text-gray-500 mb-6">Connectez-vous pour soumettre votre candidature.</p>
        <Link
          href="/auth/login?redirect=/devenir-livreur"
          className="bg-[#E63946] text-white font-bold px-8 py-3 rounded-2xl"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (etape === "succes") {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">Candidature envoyée !</h1>
        <p className="text-gray-500 mb-2">Notre équipe examine votre demande.</p>
        <p className="text-gray-400 text-sm mb-8">Vous serez notifié dès qu'une décision est prise.</p>
        <Link href="/" className="bg-[#E63946] text-white font-bold px-8 py-3 rounded-2xl">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Accueil</Link>
        <h1 className="text-2xl font-black text-white">Devenir livreur</h1>
        <p className="text-white/70 text-sm mt-1">Livrez des commandes et gagnez de l'argent</p>
      </div>

      {/* Avantages */}
      <div className="px-4 pt-5 pb-3">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: "💰", titre: "60% des frais", desc: "de livraison" },
            { icon: "⏰", titre: "Horaires libres", desc: "à votre rythme" },
            { icon: "📱", titre: "App dédiée", desc: "tout en un" },
          ].map((a) => (
            <div key={a.titre} className="bg-white rounded-2xl p-3 text-center border border-gray-100">
              <div className="text-2xl mb-1">{a.icon}</div>
              <p className="text-xs font-black text-gray-800">{a.titre}</p>
              <p className="text-xs text-gray-400">{a.desc}</p>
            </div>
          ))}
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-5">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-3 block">Votre véhicule *</label>
            <div className="grid grid-cols-2 gap-2">
              {VEHICULES.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setVehicule(v.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    vehicule === v.value
                      ? "border-[#E63946] bg-red-50"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-sm font-bold text-gray-800">{v.label}</p>
                  <p className="text-xs text-gray-400">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Zone d'intervention *</label>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="ex : Libreville, Owendo, Akanda..."
              className="w-full text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E63946]"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Message (facultatif)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Expérience, disponibilités, informations utiles..."
              rows={3}
              className="w-full text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#E63946] resize-none"
            />
          </div>

          {erreur && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
              {erreur}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !vehicule || !zone.trim()}
            className="w-full bg-[#E63946] text-white font-black py-4 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? "Envoi en cours..." : "Envoyer ma candidature"}
          </button>
        </div>
      </div>
    </div>
  );
}
