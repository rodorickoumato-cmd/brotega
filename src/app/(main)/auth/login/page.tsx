"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast("Connexion réussie ! Bienvenue sur Brotega 🇬🇦", "success");
    router.push("/");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#00A550] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-black text-2xl">B</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800">Connexion</h1>
          <p className="text-gray-500 text-sm mt-1">Connectez-vous à votre compte Brotega</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Numéro de téléphone</label>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#00A550]/30">
                <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-500 border-r">🇬🇦 +241</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01 23 45 67"
                  className="flex-1 px-4 py-3 text-sm focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                required
              />
              <div className="text-right mt-1">
                <a href="#" className="text-xs text-[#00A550] hover:underline">Mot de passe oublié ?</a>
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Se connecter
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">ou continuer avec</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              <span>📱</span> Airtel Money
            </button>
            <button className="flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
              <span>📲</span> Moov Money
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{" "}
            <Link href="/auth/register" className="text-[#00A550] font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          En vous connectant, vous acceptez nos{" "}
          <a href="#" className="hover:underline">Conditions d'utilisation</a>
        </p>
      </div>
    </div>
  );
}
