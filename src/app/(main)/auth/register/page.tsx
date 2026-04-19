"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useRouter } from "next/navigation";
import { CITIES_GABON } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "Libreville", password: "", confirm: "", shopName: "" });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast("Le mot de passe doit contenir au moins 8 caractères", "error"); return; }
    if (form.password !== form.confirm) { toast("Les mots de passe ne correspondent pas", "error"); return; }
    if (!/^\d{8,9}$/.test(form.phone.replace(/\s/g, ""))) { toast("Numéro de téléphone invalide (ex : 01234567)", "error"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    toast(role === "seller" ? "🎉 Boutique créée ! Bienvenue sur Brotega !" : "🎉 Compte créé ! Bienvenue sur Brotega !", "success");
    router.push(role === "seller" ? "/vendor/dashboard" : "/");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#00A550] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-1">Rejoignez la marketplace du Gabon</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          {/* Role toggle */}
          <div className="flex bg-gray-100 rounded-2xl p-1.5 mb-6">
            {[
              { id: "buyer", label: "🛒 Acheteur", desc: "Je veux acheter" },
              { id: "seller", label: "🏪 Vendeur", desc: "Je veux vendre" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id as typeof role)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${role === r.id ? "bg-[#00A550] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {r.label}
                <div className={`text-xs mt-0.5 font-normal ${role === r.id ? "text-white/80" : "text-gray-400"}`}>{r.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {role === "seller" && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom de votre boutique *</label>
                <input
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  placeholder="Ma Super Boutique Gabon"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                  required={role === "seller"}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom complet *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jean-Pierre Mbourou"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Téléphone *</label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00A550]/30">
                  <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-500 border-r">+241</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01 23 45 67"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="exemple@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Ville *</label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                >
                  {CITIES_GABON.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Mot de passe *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                  placeholder="Min. 8 caractères"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Confirmer *</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Répéter le mot de passe"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                  required
                />
              </div>
            </div>

            {role === "seller" && (
              <div className="bg-[#E8F7EE] rounded-xl p-4 text-sm">
                <p className="font-semibold text-[#00A550] mb-1">✅ Avantages vendeur Brotega :</p>
                <ul className="text-gray-600 space-y-0.5 text-xs">
                  <li>• Boutique gratuite à créer en 5 minutes</li>
                  <li>• Commission réduite de 5% seulement</li>
                  <li>• Dashboard avec analytics en temps réel</li>
                  <li>• Support dédié pour les vendeurs</li>
                </ul>
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading}>
              {role === "seller" ? "Créer ma boutique 🏪" : "Créer mon compte 🛒"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-[#00A550] font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
