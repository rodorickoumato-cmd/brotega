"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) { toast("Veuillez remplir tous les champs obligatoires", "error"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast("Message envoyé ! Nous vous répondrons dans les 24h. 📩", "success");
    setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 mb-2">Contactez-nous</h1>
        <p className="text-gray-500">Notre équipe vous répond dans les 24 heures ouvrées.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-4">
          {[
            { icon: "📱", label: "WhatsApp", value: "+241 01 23 45 67", href: "https://wa.me/24101234567" },
            { icon: "📞", label: "Téléphone", value: "+241 01 23 45 67", href: "tel:+24101234567" },
            { icon: "📧", label: "Email", value: "support@J'adore la Famille.ga", href: "mailto:support@J'adore la Famille.ga" },
            { icon: "📍", label: "Adresse", value: "Libreville, Gabon", href: undefined },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-semibold text-[#E63946] hover:underline">{c.value}</a>
                  ) : (
                    <p className="text-sm font-semibold text-gray-700">{c.value}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div className="bg-[#FEF2F2] rounded-2xl p-4 text-sm">
            <p className="font-semibold text-[#E63946] mb-1">Horaires d'ouverture</p>
            <p className="text-gray-600">Lundi – Samedi : 8h – 20h</p>
            <p className="text-gray-500 text-xs mt-1">Fermé les dimanches et jours fériés</p>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg text-gray-800 mb-5">Envoyez-nous un message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom complet *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jean-Pierre Mbourou"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+241 01 23 45 67"
                  type="tel"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="exemple@email.com"
                type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Sujet</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/30"
              >
                <option value="">Sélectionnez un sujet</option>
                <option value="commande">Problème de commande</option>
                <option value="paiement">Problème de paiement</option>
                <option value="livraison">Problème de livraison</option>
                <option value="vendeur">Devenir vendeur</option>
                <option value="autre">Autre demande</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Décrivez votre demande en détail..."
                rows={5}
                required
                maxLength={2000}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E63946]/30 resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{form.message.length}/2000</p>
            </div>
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Envoyer le message
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
