"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXAF } from "@/lib/utils";
import { compresserImage, formatTaille } from "@/lib/imageCompressor";
import {
  sauvegarderProduit,
  supprimerProduit,
  getMesProduits,
  changerStatutProduit,
} from "@/app/actions/produits";
import { categories } from "@/data/categories";
import { confirmerCommandeVendeur } from "@/app/actions/commandes";
import type { Produit, Vendeur, Commande } from "@/lib/supabase/database.types";
import { MAX_PRODUITS_GRATUIT } from "@/lib/rules";

// ─── Types ───────────────────────────────────────────────────────────────────

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; url: string }
  | { status: "error"; message: string };

type FormData = { nom: string; description: string; prix: string; categorie: string; imagePreview: string; imageUrl: string };

const emptyForm: FormData = { nom: "", description: "", prix: "", categorie: "", imagePreview: "", imageUrl: "" };

// ─── Statuts commandes ────────────────────────────────────────────────────────

const STATUT_COMMANDE: Record<string, { label: string; cls: string }> = {
  en_attente_paiement: { label: "En attente",   cls: "bg-yellow-100 text-yellow-700" },
  payee_escrow:        { label: "Payée",         cls: "bg-blue-100 text-blue-700"    },
  confirmee_vendeur:   { label: "Confirmée",     cls: "bg-blue-100 text-blue-700"    },
  en_livraison:        { label: "En livraison",  cls: "bg-orange-100 text-orange-700"},
  livree:              { label: "Livrée ✓",     cls: "bg-green-100 text-green-700"  },
  annulee:             { label: "Annulée",       cls: "bg-red-100 text-red-700"      },
  remboursee:          { label: "Remboursée",    cls: "bg-gray-100 text-gray-600"    },
  litige:              { label: "Litige ⚠️",     cls: "bg-red-100 text-red-700"      },
};

// ─── Modal formulaire produit ─────────────────────────────────────────────────

function ProductFormModal({
  produit,
  nomBoutique,
  onSave,
  onClose,
}: {
  produit: Produit | null;
  nomBoutique: string;
  onSave: (nom: string, description: string | null, prix: number, categorie: string | null, image: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormData>(() =>
    produit
      ? { nom: produit.nom, description: produit.description ?? "", prix: produit.prix.toString(), categorie: produit.categorie ?? "", imagePreview: produit.image ?? "", imageUrl: produit.image ?? "" }
      : emptyForm
  );
  const [errors, setErrors] = useState<{ nom?: string; prix?: string; image?: string }>({});
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [infoCompression, setInfoCompression] = useState<{ avant: number; apres: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field === "nom" ? "nom" : field === "prix" ? "prix" : "image"]: undefined }));
  };

  const uploadVersCloudinaire = async (fichier: File): Promise<string> => {
    setUpload({ status: "uploading", progress: 0 });
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const data = new globalThis.FormData();
      data.append("file", fichier);
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable)
          setUpload({ status: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText) as { url?: string; error?: string };
          if (res.url) { setUpload({ status: "done", url: res.url }); resolve(res.url); }
          else { const m = res.error ?? "Erreur inconnue"; setUpload({ status: "error", message: m }); reject(new Error(m)); }
        } else {
          const m = "Problème de connexion. Vérifiez votre réseau.";
          setUpload({ status: "error", message: m }); reject(new Error(m));
        }
      });
      xhr.addEventListener("error", () => {
        const m = "Pas de connexion internet.";
        setUpload({ status: "error", message: m }); reject(new Error(m));
      });
      xhr.open("POST", "/api/upload");
      xhr.send(data);
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) {
      setErrors((p) => ({ ...p, image: "Ce fichier n'est pas une image." }));
      return;
    }
    setErrors((p) => ({ ...p, image: undefined }));
    setInfoCompression(null);
    setUpload({ status: "uploading", progress: 0 });
    try {
      const res = await compresserImage(fichier, 800, 0.75);
      setInfoCompression({ avant: res.tailleAvant, apres: res.tailleApres });
      setForm((p) => ({ ...p, imagePreview: res.preview, imageUrl: "" }));
      const url = await uploadVersCloudinaire(res.fichier);
      setForm((p) => ({ ...p, imagePreview: url, imageUrl: url }));
    } catch (err) {
      setErrors((p) => ({ ...p, image: err instanceof Error ? err.message : "Échec upload." }));
    }
  };

  const handleSubmit = async () => {
    const errs: typeof errors = {};
    if (!form.nom.trim() || form.nom.trim().length < 2) errs.nom = "Nom requis (min. 2 caractères).";
    if (!form.prix || Number(form.prix) <= 0) errs.prix = "Prix doit être supérieur à 0.";
    if (!form.imagePreview) errs.image = "Ajoutez une photo du produit.";
    if (upload.status === "uploading") errs.image = "Attendez la fin de l'envoi...";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    await onSave(
      form.nom.trim(),
      form.description.trim() || null,
      Number(form.prix),
      form.categorie || null,
      form.imageUrl || null,
    );
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-lg text-gray-800">
              {produit ? "Modifier le produit" : "Ajouter un produit"}
            </h2>
            <p className="text-xs text-gray-400">{nomBoutique}</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            ✕
          </button>
        </div>

        {/* Corps */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Photo */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Photo du produit <span className="text-red-400">*</span>
            </label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />

            {!form.imagePreview && (
              <button type="button" onClick={() => fileRef.current?.click()}
                disabled={upload.status === "uploading"}
                className="w-full py-6 bg-[#E63946] text-white rounded-2xl font-bold flex flex-col items-center gap-2 disabled:opacity-60 active:scale-95 transition-all">
                <span className="text-3xl">📷</span>
                <span>Choisir une photo</span>
                <span className="text-white/70 text-xs font-normal">Depuis votre téléphone ou galerie</span>
              </button>
            )}

            {form.imagePreview && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#E63946]">
                <img src={form.imagePreview} alt="Aperçu" className="w-full h-44 object-cover" />
                {upload.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 p-4">
                    <p className="text-white font-bold text-sm">Envoi en cours...</p>
                    <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
                      <div className="bg-[#E63946] h-full rounded-full transition-all"
                        style={{ width: `${Math.max((upload as { status: "uploading"; progress: number }).progress, 5)}%` }} />
                    </div>
                  </div>
                )}
                {upload.status === "done" && (
                  <div className="absolute top-2 right-2 bg-[#E63946] text-white text-xs font-bold px-3 py-1 rounded-full">✓ Enregistrée</div>
                )}
                <button type="button" onClick={() => fileRef.current?.click()}
                  disabled={upload.status === "uploading"}
                  className="absolute bottom-2 right-2 bg-white text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-xl shadow disabled:opacity-50">
                  Changer
                </button>
              </div>
            )}

            {upload.status === "done" && infoCompression && (
              <p className="text-xs text-[#E63946] mt-2 bg-[#FEF2F2] rounded-xl px-3 py-2">
                ⚡ Compressée : {formatTaille(infoCompression.avant)} → {formatTaille(infoCompression.apres)}
              </p>
            )}
            {upload.status === "error" && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-red-700 mb-1">❌ {(upload as { status: "error"; message: string }).message}</p>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="text-xs bg-red-500 text-white font-bold px-4 py-2 rounded-lg">Réessayer</button>
              </div>
            )}
            {errors.image && <p className="text-xs text-red-500 mt-1">{errors.image}</p>}
          </div>

          {/* Nom */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Nom du produit <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => set("nom", e.target.value)}
              placeholder="Ex : Manioc frais 2 kg, Pagne wax..."
              maxLength={100}
              className={`w-full border-2 rounded-2xl px-4 py-4 text-base focus:outline-none transition-colors ${
                errors.nom ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#E63946]"
              }`}
            />
            {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Description <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Décrivez votre produit : taille, matière, couleur..."
              maxLength={500}
              rows={3}
              className="w-full border-2 border-gray-200 focus:border-[#E63946] rounded-2xl px-4 py-3 text-base focus:outline-none transition-colors resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.description.length}/500</p>
          </div>

          {/* Catégorie */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Catégorie <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
            </label>
            <select
              value={form.categorie}
              onChange={(e) => set("categorie", e.target.value)}
              className="w-full border-2 border-gray-200 focus:border-[#E63946] rounded-2xl px-4 py-4 text-base focus:outline-none transition-colors bg-white appearance-none">
              <option value="">— Choisir une catégorie —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Prix */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">
              Prix de vente (XAF) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={form.prix}
                onChange={(e) => set("prix", e.target.value)}
                placeholder="0"
                className={`w-full border-2 rounded-2xl px-4 py-4 pr-16 text-base focus:outline-none transition-colors ${
                  errors.prix ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#E63946]"
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">FCFA</span>
            </div>
            {errors.prix && <p className="text-xs text-red-500 mt-1">{errors.prix}</p>}
            {form.prix && Number(form.prix) > 0 && (
              <p className="text-sm font-black text-[#E63946] mt-2">{formatXAF(Number(form.prix))}</p>
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-3xl">
          <button onClick={onClose}
            className="flex-1 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 active:scale-95 transition-all">
            Annuler
          </button>
          <button onClick={handleSubmit}
            disabled={submitting || upload.status === "uploading"}
            className="flex-[2] py-3.5 bg-[#E63946] text-white rounded-2xl text-sm font-black disabled:opacity-50 active:scale-95 transition-all">
            {submitting ? "Enregistrement..." : upload.status === "uploading" ? "⏳ Photo en cours..." : produit ? "Enregistrer" : "Ajouter le produit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dialog suppression ───────────────────────────────────────────────────────

function DeleteConfirm({ nom, onConfirm, onCancel }: {
  nom: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">🗑️</div>
        <h3 className="font-black text-lg text-gray-800 mb-2">Supprimer ce produit ?</h3>
        <p className="text-sm text-gray-500 mb-6">
          <span className="font-semibold text-gray-700">"{nom}"</span> sera définitivement retiré de votre boutique.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600">
            Annuler
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-black active:scale-95 transition-all">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Code boutique copiable ───────────────────────────────────────────────────

function CodeBoutique({ vendeurId }: { vendeurId: string }) {
  const code = vendeurId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  return (
    <button onClick={copier}
      className="flex items-center gap-1.5 bg-white/15 rounded-xl px-3 py-1.5 active:scale-95 transition-all">
      <span className="text-white/70 text-xs">Code :</span>
      <span className="text-white font-black text-xs tracking-widest">{code}</span>
      <span className="text-white/60 text-xs">{copie ? "✓" : "⎘"}</span>
    </button>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function VendorDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"produits" | "commandes">("produits");
  const [vendeur, setVendeur] = useState<Vendeur | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [maxProduits, setMaxProduits] = useState(MAX_PRODUITS_GRATUIT);
  const [chargement, setChargement] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [erreurGlobale, setErreurGlobale] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login?redirect=/vendor/dashboard"); return; }

      const { data: v } = await supabase
        .from("vendeurs").select("*").eq("utilisateur_id", user.id).single();

      if (!v) { router.push("/vendor/register"); return; }
      setVendeur(v);

      const [prodData, aboData, cmdData] = await Promise.all([
        getMesProduits(),
        supabase.from("abonnements").select("max_produits")
          .eq("vendeur_id", v.id).eq("statut", "actif")
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("commandes").select("*")
          .eq("vendeur_id", v.id)
          .order("created_at", { ascending: false }).limit(20),
      ]);

      setProduits(prodData);
      setMaxProduits(aboData.data?.max_produits ?? MAX_PRODUITS_GRATUIT);
      setCommandes(cmdData.data ?? []);
      setChargement(false);
    })();
  }, [router]);

  const openAdd = () => { setEditing(null); setShowForm(true); setErreurGlobale(""); };
  const openEdit = (p: Produit) => { setEditing(p); setShowForm(true); setErreurGlobale(""); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async (nom: string, description: string | null, prix: number, categorie: string | null, image: string | null) => {
    const res = await sauvegarderProduit({ id: editing?.id, nom, description, prix, categorie, image });
    if (res.erreur) { setErreurGlobale(res.erreur); return; }
    closeForm();
    const updated = await getMesProduits();
    setProduits(updated);
  };

  const handleToggleStatut = async (p: Produit) => {
    const nvStatut = p.statut === "actif" ? "inactif" : "actif";
    setProduits((prev) => prev.map((x) => x.id === p.id ? { ...x, statut: nvStatut } : x));
    const res = await changerStatutProduit(p.id, nvStatut);
    if (res.erreur) {
      setProduits((prev) => prev.map((x) => x.id === p.id ? { ...x, statut: p.statut } : x));
      setErreurGlobale(res.erreur);
    }
  };

  const handleDelete = async (id: string) => {
    const saved = produits.find((p) => p.id === id);
    setProduits((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    const res = await supprimerProduit(id);
    if (res.erreur) {
      if (saved) setProduits((prev) => [saved, ...prev]);
      setErreurGlobale(res.erreur);
    }
  };

  const handleConfirmerCommande = async (commandeId: string) => {
    const res = await confirmerCommandeVendeur(commandeId);
    if (res.erreur) { setErreurGlobale(res.erreur); return; }
    setCommandes((prev) => prev.map((c) => c.id === commandeId ? { ...c, statut: "confirmee_vendeur" as const } : c));
  };

  const filtres = produits.filter((p) => p.nom.toLowerCase().includes(search.toLowerCase()));
  const initiales = vendeur?.nom?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const planActif = maxProduits > MAX_PRODUITS_GRATUIT ? "payant" : "gratuit";
  const limiteAtteinte = produits.length >= maxProduits;

  if (chargement) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-[#E63946] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {showForm && vendeur && (
        <ProductFormModal
          produit={editing}
          nomBoutique={vendeur.nom}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
      {deleteId && (
        <DeleteConfirm
          nom={produits.find((p) => p.id === deleteId)?.nom ?? ""}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Header */}
      <div className="bg-[#E63946] px-5 pt-12 pb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">
            {initiales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate">{vendeur?.nom}</p>
            <p className="text-white/70 text-sm">📍 {vendeur?.ville}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                vendeur?.statut === "verifie" ? "bg-white text-[#E63946]"
                : vendeur?.statut === "suspendu" ? "bg-red-400 text-white"
                : "bg-white/20 text-white"
              }`}>
                {vendeur?.statut === "verifie" ? "✓ Vérifié"
                  : vendeur?.statut === "suspendu" ? "Suspendu"
                  : "En attente"}
              </span>
              <span className="text-xs text-white/60">Plan {planActif}</span>
            </div>
            {vendeur && <div className="mt-2"><CodeBoutique vendeurId={vendeur.id} /></div>}
          </div>
          <Link href="/vendor/wallet"
            className="flex-shrink-0 bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl active:scale-95 transition-all">
            💰 Wallet
          </Link>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Produits", value: produits.length },
            { label: "Actifs", value: produits.filter((p) => p.statut === "actif").length },
            { label: "Commandes", value: commandes.length },
          ].map((s) => (
            <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-white/70 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-4 pb-10 space-y-4">
        {/* Alerte erreur */}
        {erreurGlobale && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">{erreurGlobale}</p>
            <button onClick={() => setErreurGlobale("")} className="text-red-400 ml-3">✕</button>
          </div>
        )}

        {/* Bannière plan gratuit */}
        {planActif === "gratuit" && (
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${
            limiteAtteinte ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
          }`}>
            <span className="text-2xl">{limiteAtteinte ? "🔒" : "⚡"}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black ${limiteAtteinte ? "text-red-700" : "text-amber-700"}`}>
                {limiteAtteinte ? `Limite atteinte (${maxProduits} produits)` : `${produits.length}/${maxProduits} produits utilisés`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {limiteAtteinte ? "Passez à un plan payant pour ajouter plus de produits."
                  : `Plan gratuit — ${maxProduits - produits.length} emplacement(s) restant(s)`}
              </p>
            </div>
            {limiteAtteinte && (
              <Link href="/vendor/abonnement"
                className="flex-shrink-0 bg-[#E63946] text-white text-xs font-black px-3 py-2 rounded-xl active:scale-95 transition-all">
                Upgrader
              </Link>
            )}
          </div>
        )}

        {/* Onglets */}
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm gap-1">
          {[
            { id: "produits" as const, label: `🛍️ Produits (${produits.length})` },
            { id: "commandes" as const, label: `📦 Commandes (${commandes.length})` },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id ? "bg-[#E63946] text-white shadow-sm" : "text-gray-500"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Onglet Produits ── */}
        {tab === "produits" && (
          <div className="space-y-3">
            {/* Barre recherche + bouton ajouter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-[#E63946] transition-colors"
                />
              </div>
              <button
                onClick={openAdd}
                disabled={limiteAtteinte}
                className="bg-[#E63946] text-white font-black px-4 py-3 rounded-2xl text-sm disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap flex items-center gap-1">
                + Ajouter
              </button>
            </div>

            {/* Liste produits */}
            {filtres.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
                <div className="text-5xl mb-3">{search ? "🔍" : "🛍️"}</div>
                <p className="font-black text-gray-700 mb-1">
                  {search ? "Aucun résultat" : "Boutique vide"}
                </p>
                <p className="text-sm text-gray-400 mb-5">
                  {search ? `Aucun produit pour "${search}"` : "Ajoutez votre premier produit."}
                </p>
                {!search && !limiteAtteinte && (
                  <button onClick={openAdd}
                    className="bg-[#E63946] text-white font-black px-6 py-3 rounded-2xl text-sm active:scale-95 transition-all">
                    + Ajouter un produit
                  </button>
                )}
              </div>
            ) : (
              filtres.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.image ? (
                      <img src={p.image} alt={p.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 truncate">{p.nom}</p>
                    {p.description && <p className="text-xs text-gray-400 truncate mt-0.5">{p.description}</p>}
                    <p className="text-[#E63946] font-bold text-sm mt-0.5">{formatXAF(p.prix)}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.statut === "actif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {p.statut === "actif" ? "Actif" : "Inactif"}
                      </span>
                      {p.categorie && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {categories.find((c) => c.slug === p.categorie)?.icon} {categories.find((c) => c.slug === p.categorie)?.name ?? p.categorie}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions — 3 max */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(p)}
                      className="text-xs font-bold text-[#E63946] bg-[#FEF2F2] px-3 py-1.5 rounded-xl active:scale-95 transition-all">
                      Modifier
                    </button>
                    <button onClick={() => handleToggleStatut(p)}
                      className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
                      {p.statut === "actif" ? "Désactiver" : "Activer"}
                    </button>
                    <button onClick={() => setDeleteId(p.id)}
                      className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all">
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Onglet Commandes ── */}
        {tab === "commandes" && (
          <div className="space-y-3">
            {commandes.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
                <div className="text-5xl mb-3">📦</div>
                <p className="font-black text-gray-700 mb-1">Aucune commande</p>
                <p className="text-sm text-gray-400">Vos commandes apparaîtront ici.</p>
              </div>
            ) : (
              commandes.map((c) => {
                const s = STATUT_COMMANDE[c.statut] ?? { label: c.statut, cls: "bg-gray-100 text-gray-600" };
                return (
                  <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                    <Link href={`/commande/${c.code_court}`} className="flex items-center gap-4 active:scale-98 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-gray-800">{c.code_court ?? c.id.slice(0, 8)}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-[#E63946]">{formatXAF(c.total)}</p>
                        <p className="text-gray-300 text-lg">›</p>
                      </div>
                    </Link>
                    {c.statut === "payee_escrow" && (
                      <button
                        onClick={() => handleConfirmerCommande(c.id)}
                        className="w-full bg-[#E63946] text-white font-black py-3 rounded-xl text-sm active:scale-95 transition-all">
                        ✅ Confirmer la commande
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Voir ma boutique */}
        {vendeur && (
          <Link href={`/vendeur/${vendeur.slug}`}
            className="block w-full text-center bg-white rounded-2xl py-4 text-[#E63946] font-bold text-sm shadow-sm active:scale-95 transition-all border border-[#E63946]/20">
            Voir ma boutique publique →
          </Link>
        )}
      </div>
    </div>
  );
}
