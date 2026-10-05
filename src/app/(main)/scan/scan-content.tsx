"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Scan = { code: string; token: string; nomEnregistre: boolean };
type Etape = "generation" | "felicitations" | "termine" | "erreur";

// Lien du QR : /scan?c=<campagne>
export default function ScanContent() {
  const searchParams = useSearchParams();
  const rawCampagne = searchParams.get("c") || "";
  const campagne = /^[a-z0-9_-]{1,50}$/i.test(rawCampagne) ? rawCampagne.toLowerCase() : "general";
  const storageKey = `brotega_scan_${campagne}`;

  const [etape, setEtape] = useState<Etape>("generation");
  const [scan, setScan] = useState<Scan | null>(null);
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dejaLance = useRef(false);

  const sauvegarder = (s: Scan) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {}
  };

  useEffect(() => {
    if (dejaLance.current) return;
    dejaLance.current = true;

    const demarrer = async () => {
      // Même appareil + même campagne → on réaffiche le code existant
      try {
        const existant = localStorage.getItem(storageKey);
        if (existant) {
          const s = JSON.parse(existant) as Scan;
          if (s.code && s.token) {
            setScan(s);
            setEtape(s.nomEnregistre ? "termine" : "felicitations");
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campagne }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.erreur || "Erreur lors de la génération du code");
          setEtape("erreur");
          return;
        }
        const s: Scan = { code: data.code, token: data.token, nomEnregistre: false };
        sauvegarder(s);
        setScan(s);
        setEtape("felicitations");
      } catch {
        setError("Erreur réseau. Vérifiez votre connexion.");
        setEtape("erreur");
      }
    };

    demarrer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnregistrer = async () => {
    if (!scan) return;
    setError("");
    if (nom.trim().length < 2) {
      setError("❌ Entrez au moins 2 caractères");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan/nom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: scan.code, token: scan.token, nom }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.erreur || "Erreur lors de l'enregistrement");
        return;
      }
      const s = { ...scan, nomEnregistre: true };
      sauvegarder(s);
      setScan(s);
      setEtape("termine");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopier = () => {
    if (scan) navigator.clipboard?.writeText(scan.code).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          {etape === "generation" && (
            <>
              <div className="text-5xl mb-4 animate-pulse">🎁</div>
              <p className="text-gray-600">Génération de votre code...</p>
            </>
          )}

          {etape === "erreur" && (
            <>
              <div className="text-5xl mb-4">😕</div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            </>
          )}

          {(etape === "felicitations" || etape === "termine") && scan && (
            <>
              <div className="text-6xl mb-2">🎉</div>
              <h1 className="text-3xl font-black text-emerald-700 mb-2">Félicitations !</h1>
              <p className="text-gray-600 text-sm mb-6">Voici votre code personnel</p>

              <button
                type="button"
                onClick={handleCopier}
                className="w-full bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-xl py-4 mb-2"
              >
                <span className="text-3xl font-black tracking-widest text-emerald-800 font-mono">
                  {scan.code}
                </span>
              </button>
              <p className="text-xs text-gray-500 mb-6">Touchez pour copier · Conservez ce code</p>

              {etape === "felicitations" && (
                <div className="text-left border-t pt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Votre nom <span className="font-normal text-gray-400">(facultatif)</span>
                  </label>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => {
                      setNom(e.target.value.slice(0, 80));
                      setError("");
                    }}
                    placeholder="Ex : Marie Nzé"
                    autoComplete="name"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-emerald-500 focus:outline-none mb-3"
                  />

                  <button
                    type="button"
                    onClick={handleEnregistrer}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg py-3 mb-2"
                  >
                    {loading ? "Enregistrement..." : "Enregistrer mon nom"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEtape("termine")}
                    className="w-full text-gray-500 text-sm py-2"
                  >
                    Passer
                  </button>
                </div>
              )}

              {etape === "termine" && (
                <div className="border-t pt-6">
                  <p className="text-emerald-700 font-bold">
                    ✅ {scan.nomEnregistre ? "Votre nom est enregistré." : "Code enregistré."}
                  </p>
                  <a href="/catalogue" className="inline-block mt-4 text-emerald-600 underline text-sm">
                    Découvrir le catalogue
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
