"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useRouter } from "next/navigation";
import { CITIES_GABON } from "@/lib/utils";
import { categories } from "@/data/categories";

const steps = ["Informations", "Boutique", "Documents", "Confirmation"];

export default function VendorRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "Libreville",
    shopName: "",
    shopDesc: "",
    shopCategories: [] as string[],
    shopPhone: "",
    shopWhatsapp: "",
    idNumber: "",
    idType: "cni",
  });

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      shopCategories: f.shopCategories.includes(cat)
        ? f.shopCategories.filter((c) => c !== cat)
        : [...f.shopCategories, cat],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    toast("🎉 Votre boutique a été créée ! Bienvenue sur Brotega !", "success");
    router.push("/vendor/dashboard");
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-[#00A550] rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-black text-2xl">B</span>
        </div>
        <h1 className="text-2xl font-black text-gray-800">Créer votre boutique</h1>
        <p className="text-gray-500 text-sm mt-1">Vendez dans tout le Gabon en quelques minutes</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i <= step ? "bg-[#00A550] text-white" : "bg-gray-200 text-gray-400"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= step ? "text-[#00A550]" : "text-gray-400"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-[#00A550]" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-bold text-lg text-gray-800">Vos informations personnelles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom complet *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jean-Pierre Mbourou" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Téléphone *</label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00A550]/30">
                  <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-500 border-r">+241</span>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01 23 45 67" className="flex-1 px-3 py-3 text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="exemple@email.com" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Ville *</label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30">
                  {CITIES_GABON.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <Button fullWidth size="lg" onClick={() => setStep(1)} disabled={!form.name || !form.phone}>
              Continuer →
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-bold text-lg text-gray-800">Votre boutique</h2>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom de la boutique *</label>
              <input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                placeholder="Marché Mbolo, TechGabon Store..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Description *</label>
              <textarea value={form.shopDesc} onChange={(e) => setForm({ ...form, shopDesc: e.target.value })}
                placeholder="Décrivez votre boutique, vos produits et ce qui vous rend unique..." rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30 resize-none" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">Catégories de vente *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.name)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 transition-all text-left ${form.shopCategories.includes(c.name) ? "border-[#00A550] bg-[#E8F7EE] text-[#00A550]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    <span>{c.icon}</span>
                    <span className="truncate text-xs font-medium">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Téléphone boutique</label>
                <input value={form.shopPhone} onChange={(e) => setForm({ ...form, shopPhone: e.target.value })}
                  placeholder="+241 01 23 45 67" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">WhatsApp boutique</label>
                <input value={form.shopWhatsapp} onChange={(e) => setForm({ ...form, shopWhatsapp: e.target.value })}
                  placeholder="+241 01 23 45 67" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>← Retour</Button>
              <Button fullWidth size="lg" onClick={() => setStep(2)} disabled={!form.shopName || !form.shopDesc || form.shopCategories.length === 0}>
                Continuer →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold text-lg text-gray-800">Documents d'identité</h2>
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">Pourquoi nous demandons ces informations ?</p>
              <p>Pour protéger nos acheteurs et garantir la confiance sur la plateforme, nous vérifions l'identité de chaque vendeur.</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Type de document *</label>
              <select value={form.idType} onChange={(e) => setForm({ ...form, idType: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30">
                <option value="cni">Carte Nationale d'Identité (CNI)</option>
                <option value="passport">Passeport</option>
                <option value="permis">Permis de conduire</option>
                <option value="rccm">RCCM (entreprise)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Numéro du document *</label>
              <input value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                placeholder="GA-123456789" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30" />
            </div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#00A550] transition-colors cursor-pointer">
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm font-medium text-gray-700">Uploader une photo du document</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG ou PDF — max 5 Mo</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>← Retour</Button>
              <Button fullWidth size="lg" onClick={() => setStep(3)} disabled={!form.idNumber}>
                Continuer →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-bold text-lg text-gray-800">Résumé de votre boutique</h2>
            <div className="bg-gradient-to-br from-[#00A550] to-[#007A3D] rounded-2xl p-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl">🏪</div>
                <div>
                  <p className="font-black text-lg">{form.shopName || "Votre boutique"}</p>
                  <p className="text-white/70 text-sm">📍 {form.city}</p>
                </div>
              </div>
              <p className="text-white/80 text-sm">{form.shopDesc}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {form.shopCategories.map((c) => (
                  <span key={c} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Propriétaire", form.name],
                ["Téléphone", `+241 ${form.phone}`],
                ["Email", form.email || "Non renseigné"],
                ["Document", `${form.idType.toUpperCase()} — ${form.idNumber}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="bg-[#E8F7EE] rounded-xl p-4 text-sm">
              <p className="font-semibold text-[#00A550] mb-2">✅ Ce que vous obtenez :</p>
              <ul className="text-gray-600 space-y-1 text-xs">
                <li>• Boutique visible sur Brotega immédiatement</li>
                <li>• Dashboard vendeur avec stats et gestion commandes</li>
                <li>• Commission de seulement 5% par vente</li>
                <li>• Badge "Vendeur vérifié" après vérification (48h)</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>← Retour</Button>
              <Button fullWidth size="lg" loading={loading} onClick={handleSubmit}>
                🚀 Créer ma boutique !
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
