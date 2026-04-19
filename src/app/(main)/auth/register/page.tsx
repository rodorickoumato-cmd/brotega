"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { CITIES_GABON } from "@/lib/utils";
import { inscrire } from "@/app/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"acheteur" | "vendeur">("acheteur");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "", telephone: "", email: "",
    city: "Libreville", password: "", confirm: "", nomBoutique: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password.length < 8) {
      toast("Le mot de passe doit contenir au moins 8 caractères.", "error");
      return;
    }
    if (form.password !== form.confirm) {
      toast("Les mots de passe ne correspondent pas.", "error");
      return;
    }
    if (!form.email) {
      toast("L'adresse email est obligatoire.", "error");
      return;
    }
    if (role === "vendeur" && !form.nomBoutique.trim()) {
      toast("Le nom de votre boutique est obligatoire.", "error");
      return;
    }

    setLoading(true);

    const result = await inscrire({
      email: form.email,
      password: form.password,
      nom: form.nom,
      telephone: form.telephone.replace(/\s/g, ""),
      ville: form.city,
      role,
      nomBoutique: form.nomBoutique || undefined,
    });

    setLoading(false);

    if (result?.erreur) {
      toast(result.erreur, "error");
      return;
    }

    toast(
      role === "vendeur"
        ? "🎉 Boutique créée ! Bienvenue sur Brotega !"
        : "🎉 Compte créé ! Bienvenue sur Brotega !",
      "success"
    );
    router.push(role === "vendeur" ? "/vendor/dashboard" : "/");
    router.refresh();
  };

  const input = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30 transition-all";

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
          {/* Choix du rôle */}
          <div className="flex bg-gray-100 rounded-2xl p-1.5 mb-6">
            {[
              { id: "acheteur", label: "🛒 Acheteur", desc: "Je veux acheter" },
              { id: "vendeur", label: "🏪 Vendeur", desc: "Je veux vendre" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id as typeof role)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  role === r.id ? "bg-[#00A550] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r.label}
                <div className={`text-xs mt-0.5 font-normal ${role === r.id ? "text-white/80" : "text-gray-400"}`}>
                  {r.desc}
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Nom boutique (vendeur uniquement) */}
            {role === "vendeur" && (
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Nom de votre boutique <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.nomBoutique}
                  onChange={(e) => setForm({ ...form, nomBoutique: e.target.value })}
                  placeholder="Ma Super Boutique Gabon"
                  className={input}
                  required={role === "vendeur"}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Nom complet <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Jean-Pierre Mbourou"
                  className={input}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Téléphone <span className="text-red-400">*</span>
                </label>
                <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00A550]/30">
                  <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-500 border-r border-gray-200">
                    🇬🇦 +241
                  </span>
                  <input
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    placeholder="01 23 45 67"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="exemple@email.com"
                  className={input}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Ville <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={input}
                >
                  {CITIES_GABON.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Mot de passe <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                  placeholder="Min. 8 caractères"
                  className={input}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Confirmer <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Répéter le mot de passe"
                  className={input}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            {role === "vendeur" && (
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
              {role === "vendeur" ? "Créer ma boutique 🏪" : "Créer mon compte 🛒"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-[#00A550] font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          En créant un compte, vous acceptez nos{" "}
          <Link href="/conditions" className="hover:underline">Conditions d&apos;utilisation</Link>
          {" "}et notre{" "}
          <Link href="/confidentialite" className="hover:underline">Politique de confidentialité</Link>
        </p>
      </div>
    </div>
  );
}
