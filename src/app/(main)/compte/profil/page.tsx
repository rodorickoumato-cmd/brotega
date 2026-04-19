"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { CITIES_GABON } from "@/lib/utils";

export default function ProfilPage() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "Marie Nzamba",
    phone: "01 23 45 67",
    email: "marie.nzamba@email.com",
    city: "Libreville",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) { toast("Veuillez remplir les champs obligatoires", "error"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast("Profil mis à jour avec succès ✓", "success");
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compte" className="text-gray-400 hover:text-[#00A550] transition-colors">← Mon compte</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-black text-gray-800">Mon profil</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-20 h-20 bg-gradient-to-br from-[#00A550] to-[#007A3D] rounded-full flex items-center justify-center text-2xl font-black text-white">
            MN
          </div>
          <div>
            <h2 className="font-bold text-gray-800">{form.name}</h2>
            <p className="text-sm text-gray-500">+241 {form.phone}</p>
            <button className="text-xs text-[#00A550] hover:underline mt-1">
              Changer la photo de profil
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom complet *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Téléphone *</label>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00A550]/30">
                <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-500 border-r">🇬🇦 +241</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="exemple@email.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Ville</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
              >
                {CITIES_GABON.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <Button type="submit" size="lg" loading={loading}>
            Enregistrer les modifications
          </Button>
        </form>
      </div>
    </div>
  );
}
