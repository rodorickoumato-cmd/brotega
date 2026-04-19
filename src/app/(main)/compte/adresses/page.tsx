"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { CITIES_GABON } from "@/lib/utils";

const mockAddresses = [
  { id: "1", label: "Domicile", fullName: "Marie Nzamba", phone: "+241 01 23 45 67", city: "Libreville", district: "Nombakélé", details: "Près de l'école primaire, maison bleue", isDefault: true },
  { id: "2", label: "Bureau", fullName: "Marie Nzamba", phone: "+241 01 23 45 67", city: "Libreville", district: "Centre-ville", details: "Immeuble Cristal, 3ème étage", isDefault: false },
];

export default function AdressesPage() {
  const [addresses, setAddresses] = useState(mockAddresses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", fullName: "", phone: "", city: "Libreville", district: "", details: "" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.district) { toast("Veuillez remplir tous les champs obligatoires", "error"); return; }
    const newAddr = { ...form, id: Date.now().toString(), isDefault: addresses.length === 0 };
    setAddresses([...addresses, newAddr]);
    setForm({ label: "", fullName: "", phone: "", city: "Libreville", district: "", details: "" });
    setShowForm(false);
    toast("Adresse ajoutée avec succès ✓", "success");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compte" className="text-gray-400 hover:text-[#00A550] transition-colors">← Mon compte</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-black text-gray-800">Mes adresses</h1>
      </div>

      <div className="space-y-4 mb-5">
        {addresses.map((addr) => (
          <div key={addr.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${addr.isDefault ? "border-[#00A550]" : "border-gray-100"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-800">📍 {addr.label || "Adresse"}</span>
                  {addr.isDefault && <span className="text-xs bg-[#E8F7EE] text-[#00A550] px-2 py-0.5 rounded-full font-semibold">Par défaut</span>}
                </div>
                <p className="text-sm font-medium text-gray-700">{addr.fullName}</p>
                <p className="text-sm text-gray-500">{addr.phone}</p>
                <p className="text-sm text-gray-500">{addr.district}, {addr.city}</p>
                {addr.details && <p className="text-xs text-gray-400 mt-0.5">{addr.details}</p>}
              </div>
              <button
                onClick={() => { setAddresses(addresses.filter((a) => a.id !== addr.id)); toast("Adresse supprimée", "info"); }}
                className="text-xs text-red-400 hover:text-red-600 hover:underline"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)} variant="outline" fullWidth>
          + Ajouter une adresse
        </Button>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4">Nouvelle adresse</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Libellé (ex : Domicile, Bureau)</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Domicile" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom complet *</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Téléphone *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+241 01 23 45 67" required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Ville *</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30">
                  {CITIES_GABON.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Quartier *</label>
                <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Nombakélé, PK5..." required className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Indications complémentaires</label>
              <input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Maison rouge, 2ème rue à gauche..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)} type="button">Annuler</Button>
              <Button type="submit" fullWidth>Enregistrer l'adresse</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
