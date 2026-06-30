"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Categorie = {
  slug: string;
  nom: string;
  icone: string;
  couleur: string;
  bg: string;
  ordre: number;
  actif: boolean;
};

type Toast = { message: string; type: "succes" | "erreur" };

const COULEURS = [
  { hex: "#E63946", bg: "#FEF2F2", label: "Rouge" },
  { hex: "#9B59B6", bg: "#F5F0FB", label: "Violet" },
  { hex: "#2980B9", bg: "#EBF5FB", label: "Bleu" },
  { hex: "#E67E22", bg: "#FEF5EC", label: "Orange" },
  { hex: "#E91E8C", bg: "#FEF0F7", label: "Rose" },
  { hex: "#27AE60", bg: "#EAFAF1", label: "Vert" },
  { hex: "#1ABC9C", bg: "#E8F8F5", label: "Turquoise" },
  { hex: "#F39C12", bg: "#FEF9EC", label: "Jaune" },
  { hex: "#7F8C8D", bg: "#F2F3F4", label: "Gris" },
  { hex: "#8B4513", bg: "#FDF3EC", label: "Marron" },
  { hex: "#92400E", bg: "#FEF3C7", label: "Brun" },
];

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);

  const [formulaire, setFormulaire] = useState({
    slug: "", nom: "", icone: "🛒",
    couleur: "#E63946", bg: "#FEF2F2", ordre: 0,
  });

  function afficherToast(message: string, type: "succes" | "erreur") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const charger = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const json = await res.json();
    setCategories(json.categories ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profil } = await supabase
        .from("utilisateurs").select("role").eq("id", user.id).single();
      if (profil?.role !== "admin") { router.push("/"); return; }
      charger();
    })();
  }, [router, charger]);

  async function sauvegarder(data: Partial<Categorie> & { slug: string }) {
    setEnregistrement(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setEnregistrement(false);
    if (json.succes) {
      afficherToast("Catégorie sauvegardée.", "succes");
      setEditSlug(null);
      setAjoutOuvert(false);
      charger();
    } else {
      afficherToast(json.erreur ?? "Erreur.", "erreur");
    }
  }

  async function toggleActif(slug: string, actif: boolean) {
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, actif: !actif }),
    });
    const json = await res.json();
    if (json.succes) charger();
    else afficherToast(json.erreur ?? "Erreur.", "erreur");
  }

  async function supprimer(slug: string) {
    if (!confirm(`Supprimer la catégorie "${slug}" ?`)) return;
    const res = await fetch(`/api/admin/categories?slug=${slug}`, { method: "DELETE" });
    const json = await res.json();
    if (json.succes) { afficherToast("Catégorie supprimée.", "succes"); charger(); }
    else afficherToast(json.erreur ?? "Erreur.", "erreur");
  }

  function ouvrirEdition(cat: Categorie) {
    setFormulaire({ slug: cat.slug, nom: cat.nom, icone: cat.icone, couleur: cat.couleur, bg: cat.bg, ordre: cat.ordre });
    setEditSlug(cat.slug);
    setAjoutOuvert(false);
  }

  function ouvrirAjout() {
    setFormulaire({ slug: "", nom: "", icone: "🛒", couleur: "#E63946", bg: "#FEF2F2", ordre: categories.length + 1 });
    setAjoutOuvert(true);
    setEditSlug(null);
  }

  function choisirCouleur(hex: string, bg: string) {
    setFormulaire((f) => ({ ...f, couleur: hex, bg }));
  }

  const formulaireOuvert = editSlug !== null || ajoutOuvert;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="bg-[#E63946] px-5 pt-5 pb-6">
        <Link href="/admin" className="text-white/70 text-sm flex items-center gap-1 mb-3">‹ Dashboard Admin</Link>
        <h1 className="text-2xl font-black text-white">Catégories</h1>
        <p className="text-white/70 text-sm mt-1">Gérer les catégories de produits</p>
      </div>

      {toast && (
        <div className={`mx-4 mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-white ${toast.type === "succes" ? "bg-green-500" : "bg-red-500"}`}>
          {toast.type === "succes" ? "✓ " : "✗ "}{toast.message}
        </div>
      )}

      <div className="px-4 py-5 space-y-3">
        {/* Formulaire ajout/édition */}
        {formulaireOuvert && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-bold text-gray-800">{ajoutOuvert ? "Nouvelle catégorie" : "Modifier la catégorie"}</h2>
            {ajoutOuvert && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Slug (identifiant unique, ex: alimentation)</label>
                <input
                  value={formulaire.slug}
                  onChange={(e) => setFormulaire((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                  placeholder="ex: electronique"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Nom affiché</label>
              <input
                value={formulaire.nom}
                onChange={(e) => setFormulaire((f) => ({ ...f, nom: e.target.value }))}
                placeholder="ex: Alimentation"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Icône (emoji)</label>
              <input
                value={formulaire.icone}
                onChange={(e) => setFormulaire((f) => ({ ...f, icone: e.target.value }))}
                className="w-24 text-center text-2xl border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {COULEURS.map(({ hex, bg, label }) => (
                  <button
                    key={hex}
                    onClick={() => choisirCouleur(hex, bg)}
                    title={label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formulaire.couleur === hex ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Ordre d'affichage</label>
              <input
                type="number"
                min={1}
                value={formulaire.ordre}
                onChange={(e) => setFormulaire((f) => ({ ...f, ordre: parseInt(e.target.value) || 0 }))}
                className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#E63946]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => sauvegarder(formulaire)}
                disabled={enregistrement || !formulaire.nom || !formulaire.slug}
                className="flex-1 bg-[#E63946] text-white font-bold py-3 rounded-xl disabled:opacity-60"
              >
                {enregistrement ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              <button
                onClick={() => { setEditSlug(null); setAjoutOuvert(false); }}
                className="px-4 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Bouton ajouter */}
        {!formulaireOuvert && (
          <button
            onClick={ouvrirAjout}
            className="w-full bg-white border-2 border-dashed border-gray-300 rounded-2xl py-4 text-gray-500 font-semibold hover:border-[#E63946] hover:text-[#E63946] transition-colors"
          >
            + Ajouter une catégorie
          </button>
        )}

        {/* Liste */}
        {chargement ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
          ))
        ) : (
          categories.map((cat) => (
            <div key={cat.slug} className={`bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 ${!cat.actif ? "opacity-50" : ""}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: cat.bg }}>
                {cat.icone}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">{cat.nom}</p>
                <p className="text-xs text-gray-400">/{cat.slug} · ordre {cat.ordre}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActif(cat.slug, cat.actif)}
                  className={`text-xs px-2 py-1 rounded-lg font-semibold ${cat.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {cat.actif ? "Actif" : "Inactif"}
                </button>
                <button onClick={() => ouvrirEdition(cat)} className="text-gray-400 hover:text-[#E63946] text-lg px-1">✏️</button>
                <button onClick={() => supprimer(cat.slug)} className="text-gray-400 hover:text-red-500 text-lg px-1">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
