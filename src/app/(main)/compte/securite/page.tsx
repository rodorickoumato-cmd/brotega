"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";

export default function SecuritePage() {
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwForm.current) { toast("Veuillez saisir votre mot de passe actuel", "error"); return; }
    if (pwForm.next.length < 8) { toast("Le nouveau mot de passe doit contenir au moins 8 caractères", "error"); return; }
    if (pwForm.next !== pwForm.confirm) { toast("Les mots de passe ne correspondent pas", "error"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast("Mot de passe modifié avec succès ✓", "success");
    setPwForm({ current: "", next: "", confirm: "" });
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compte" className="text-gray-400 hover:text-[#00A550] transition-colors">← Mon compte</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-black text-gray-800">Sécurité</h1>
      </div>

      <div className="space-y-5">
        {/* Changement de mot de passe */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-1">🔒 Changer le mot de passe</h2>
          <p className="text-sm text-gray-500 mb-5">Choisissez un mot de passe fort d'au moins 8 caractères.</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Mot de passe actuel *</label>
              <input
                type="password"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nouveau mot de passe *</label>
              <input
                type="password"
                value={pwForm.next}
                onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                placeholder="Min. 8 caractères"
                minLength={8}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Confirmer le nouveau mot de passe *</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="Répéter le mot de passe"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              />
            </div>
            <Button type="submit" loading={loading}>Enregistrer le nouveau mot de passe</Button>
          </form>
        </div>

        {/* Sessions actives */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4">📱 Sessions actives</h2>
          <div className="space-y-3">
            {[
              { device: "Android · Chrome", location: "Libreville, Gabon", time: "Maintenant", current: true },
              { device: "Windows · Chrome", location: "Libreville, Gabon", time: "Il y a 2 jours", current: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.device} {s.current && <span className="text-xs text-[#00A550] font-normal">(appareil actuel)</span>}</p>
                  <p className="text-xs text-gray-500">{s.location} · {s.time}</p>
                </div>
                {!s.current && (
                  <button className="text-xs text-red-400 hover:text-red-600 hover:underline" onClick={() => toast("Session déconnectée", "success")}>
                    Déconnecter
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Zone danger */}
        <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
          <h2 className="font-bold text-red-700 mb-2">⚠️ Zone de danger</h2>
          <p className="text-sm text-red-600 mb-4">La suppression de votre compte est définitive et irréversible.</p>
          <button className="text-sm text-red-500 hover:text-red-700 font-semibold hover:underline">
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  );
}
