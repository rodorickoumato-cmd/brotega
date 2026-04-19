"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { formatXAF, CITIES_GABON } from "@/lib/utils";
import { products as initialProducts } from "@/data/products";
import { vendors } from "@/data/vendors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { categories } from "@/data/categories";
import { Product } from "@/types";
import Link from "next/link";

const vendor = vendors[0];
const vendorProducts = initialProducts.filter((p) => p.vendorId === vendor.id);

const stats = [
  { label: "Ventes ce mois", value: "342 500 FCFA", change: "+12%", icon: "💰" },
  { label: "Commandes", value: "28", change: "+5", icon: "📦" },
  { label: "Produits actifs", value: "12", change: "0", icon: "🛍️" },
  { label: "Avis clients", value: "4.8 ★", change: "+0.2", icon: "⭐" },
];

const orders = [
  { id: "#ORD-001", client: "Marie Nzamba", product: "Manioc frais 2kg", amount: 5000, status: "delivered", date: "18/04/2026" },
  { id: "#ORD-002", client: "Paul Essono", product: "Huile de palme 1L", amount: 4500, status: "shipped", date: "17/04/2026" },
  { id: "#ORD-003", client: "Sophie Ondo", product: "Plantains verts 5kg", amount: 3000, status: "confirmed", date: "17/04/2026" },
  { id: "#ORD-004", client: "Jean-Claude Mba", product: "Poisson fumé 1kg", amount: 8500, status: "pending", date: "16/04/2026" },
  { id: "#ORD-005", client: "Alice Nkoghe", product: "Manioc frais 5kg", amount: 12500, status: "cancelled", date: "15/04/2026" },
];

type BadgeVariant = "green" | "yellow" | "red" | "gray" | "orange";
const statusColors: Record<string, BadgeVariant> = {
  pending: "yellow", confirmed: "green", shipped: "orange", delivered: "green", cancelled: "red",
};
const statusLabels: Record<string, string> = {
  pending: "En attente", confirmed: "Confirmée", shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée",
};

// ─── Types formulaire ─────────────────────────────────────────────────────────

type FormData = {
  name: string;
  price: string;
  originalPrice: string;
  category: string;
  description: string;
  imagePreview: string;
  imageBlobUrl: string;
  imageUrl: string;
  stock: string;
  city: string;
  unit: string;
};

const emptyForm: FormData = {
  name: "", price: "", originalPrice: "",
  category: categories[0].name,
  description: "", imagePreview: "", imageBlobUrl: "", imageUrl: "",
  stock: "", city: "Libreville", unit: "",
};

function slugify(str: string): string {
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Modale formulaire ────────────────────────────────────────────────────────

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "done"; url: string }
  | { status: "error"; message: string };

function ProductFormModal({
  product, onSave, onClose,
}: {
  product: Product | null;
  onSave: (p: Product) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormData>(() =>
    product
      ? {
          name: product.name, price: product.price.toString(),
          originalPrice: product.originalPrice?.toString() ?? "",
          category: product.category, description: product.description,
          imagePreview: product.images[0] ?? "", imageBlobUrl: "", imageUrl: product.images[0] ?? "",
          stock: product.stock.toString(), city: product.city, unit: product.unit ?? "",
        }
      : emptyForm
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    setUpload({ status: "uploading", progress: 0 });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const data = new globalThis.FormData();
      data.append("file", file);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUpload({ status: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText) as { url?: string; error?: string };
          if (res.url) {
            setUpload({ status: "done", url: res.url });
            resolve(res.url);
          } else {
            const msg = res.error ?? "Erreur inconnue";
            setUpload({ status: "error", message: msg });
            reject(new Error(msg));
          }
        } else {
          const msg = "Erreur lors de l'upload. Vérifiez votre connexion.";
          setUpload({ status: "error", message: msg });
          reject(new Error(msg));
        }
      });

      xhr.addEventListener("error", () => {
        const msg = "Connexion impossible. Vérifiez votre réseau.";
        setUpload({ status: "error", message: msg });
        reject(new Error(msg));
      });

      xhr.open("POST", "/api/upload");
      xhr.send(data);
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, imagePreview: "Fichier invalide. Choisissez une image." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imagePreview: "Image trop lourde (max 5 Mo)." }));
      return;
    }

    // Prévisualisation locale immédiate
    if (form.imageBlobUrl) URL.revokeObjectURL(form.imageBlobUrl);
    const blobUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, imagePreview: blobUrl, imageBlobUrl: blobUrl, imageUrl: "" }));
    setErrors((prev) => ({ ...prev, imagePreview: undefined }));

    try {
      const cloudUrl = await uploadToCloudinary(file);
      // Remplace le blob par l'URL Cloudinary persistante
      setForm((prev) => ({ ...prev, imagePreview: cloudUrl, imageUrl: cloudUrl }));
    } catch (err) {
      // Conserve le blob pour la prévisualisation, signale l'erreur
      setErrors((prev) => ({
        ...prev,
        imagePreview: err instanceof Error ? err.message : "Échec de l'upload.",
      }));
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 3) errs.name = "Nom requis (min. 3 caractères).";
    if (!form.price || Number(form.price) <= 0) errs.price = "Le prix doit être supérieur à 0.";
    if (form.originalPrice && Number(form.originalPrice) <= Number(form.price))
      errs.originalPrice = "Le prix barré doit dépasser le prix de vente.";
    if (!form.description.trim() || form.description.trim().length < 10)
      errs.description = "Description requise (min. 10 caractères).";
    if (!form.imagePreview) errs.imagePreview = "Ajoutez une photo du produit.";
    if (upload.status === "uploading") errs.imagePreview = "Attendez la fin de l'upload...";
    if (form.stock === "" || Number(form.stock) < 0) errs.stock = "Le stock doit être ≥ 0.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const saved: Product = {
      id: product?.id ?? `local-${Date.now()}`,
      name: form.name.trim(),
      slug: product?.slug ?? `${slugify(form.name.trim())}-${Date.now()}`,
      description: form.description.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      images: [form.imagePreview],
      category: form.category,
      vendorId: vendor.id,
      vendor: {
        id: vendor.id, name: vendor.name, slug: vendor.slug, logo: vendor.logo,
        description: vendor.description, city: vendor.city, rating: vendor.rating,
        reviewCount: vendor.reviewCount, productCount: vendor.productCount,
        verified: vendor.verified, joinedAt: vendor.joinedAt,
        phone: vendor.phone, whatsapp: vendor.whatsapp, categories: vendor.categories,
      },
      rating: product?.rating ?? 0,
      reviewCount: product?.reviewCount ?? 0,
      stock: Number(form.stock),
      unit: form.unit.trim() || undefined,
      tags: [],
      city: form.city,
      isNew: !product,
      featured: false,
    };
    onSave(saved);
    setSubmitting(false);
  };

  const Field = ({ label, error, children, required = true }: {
    label: string; error?: string; children: React.ReactNode; required?: boolean;
  }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
        {!required && <span className="text-gray-400 font-normal"> (optionnel)</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );

  const inputClass = (err?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${
      err ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#00A550]"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
        {/* En-tête sticky */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-lg text-gray-800">
              {product ? "Modifier le produit" : "Ajouter un produit"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Boutique : {vendor.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corps scrollable */}
        <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Photo */}
          <Field label="Photo du produit" error={errors.imagePreview}>
            <div className="flex gap-4 items-start">
              {/* Vignette / prévisualisation */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={upload.status === "uploading"}
                className={`w-24 h-24 rounded-2xl border-2 border-dashed flex-shrink-0 overflow-hidden transition-all relative ${
                  upload.status === "uploading"
                    ? "border-[#00A550] cursor-wait"
                    : form.imagePreview
                    ? "border-[#00A550]"
                    : errors.imagePreview
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300 hover:border-[#00A550] hover:bg-gray-50"
                }`}
              >
                {form.imagePreview ? (
                  <img src={form.imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">Photo</span>
                  </div>
                )}
                {/* Overlay spinner pendant l'upload */}
                {upload.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}
                {/* Badge succès */}
                {upload.status === "done" && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-[#00A550] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFile}
                  className="hidden"
                />

                {/* Bouton choisir */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={upload.status === "uploading"}
                  className="w-full py-2.5 px-4 border-2 border-gray-200 hover:border-[#00A550] disabled:opacity-50 disabled:cursor-wait rounded-xl text-sm font-medium text-gray-600 hover:text-[#00A550] transition-colors"
                >
                  {upload.status === "uploading" ? "⏳ Envoi en cours..." : "📁 Choisir une photo"}
                </button>

                {/* Barre de progression */}
                {upload.status === "uploading" && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Envoi vers Cloudinary...</span>
                      <span className="font-semibold text-[#00A550]">{upload.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#00A550] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Confirmation upload réussi */}
                {upload.status === "done" && (
                  <div className="flex items-center gap-1.5 text-xs text-[#00A550] font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Photo envoyée sur Cloudinary
                  </div>
                )}

                {/* Erreur upload */}
                {upload.status === "error" && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {upload.message} —{" "}
                    <button type="button" onClick={() => fileRef.current?.click()} className="underline">Réessayer</button>
                  </div>
                )}

                <p className="text-xs text-gray-400">JPG, PNG, WebP · Max 5 Mo · Optimisé automatiquement</p>
              </div>
            </div>
          </Field>

          {/* Nom du produit */}
          <Field label="Nom du produit" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex : Manioc frais 2 kg, Pagne wax, Téléphone..."
              maxLength={100}
              className={inputClass(errors.name)}
            />
          </Field>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prix de vente (XAF)" error={errors.price}>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                  className={inputClass(errors.price) + " pr-14"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">FCFA</span>
              </div>
            </Field>
            <Field label="Prix barré" error={errors.originalPrice} required={false}>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={form.originalPrice}
                  onChange={(e) => set("originalPrice", e.target.value)}
                  placeholder="0"
                  className={inputClass(errors.originalPrice) + " pr-14"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">FCFA</span>
              </div>
            </Field>
          </div>

          {/* Catégorie */}
          <Field label="Catégorie">
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00A550] bg-white transition-colors"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </Field>

          {/* Description */}
          <Field label="Description" error={errors.description}>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Décrivez votre produit : origine, qualité, dimensions, utilisation..."
              rows={4}
              maxLength={1000}
              className={inputClass(errors.description) + " resize-none"}
            />
            <div className="flex items-center justify-between">
              <span />
              <span className="text-xs text-gray-400">{form.description.length}/1000</span>
            </div>
          </Field>

          {/* Stock + Unité */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Stock disponible" error={errors.stock}>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
                placeholder="0"
                className={inputClass(errors.stock)}
              />
            </Field>
            <Field label="Unité de vente" required={false}>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => set("unit", e.target.value)}
                placeholder="kg, L, pièce, lot..."
                maxLength={20}
                className={inputClass()}
              />
            </Field>
          </div>

          {/* Ville */}
          <Field label="Ville au Gabon">
            <select
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00A550] bg-white transition-colors"
            >
              {CITIES_GABON.map((c) => (
                <option key={c} value={c}>📍 {c}</option>
              ))}
            </select>
          </Field>

          {/* Aperçu prix */}
          {form.price && Number(form.price) > 0 && (
            <div className="bg-[#E8F7EE] rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl font-black text-[#00A550]">{formatXAF(Number(form.price))}</span>
              {form.originalPrice && Number(form.originalPrice) > Number(form.price) && (
                <span className="text-sm text-gray-400 line-through">{formatXAF(Number(form.originalPrice))}</span>
              )}
              <span className="text-xs text-gray-500 ml-auto">Aperçu prix</span>
            </div>
          )}
        </form>

        {/* Pied sticky */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-200 hover:border-gray-300 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={submitting || upload.status === "uploading"}
            className="flex-[2] py-3 bg-[#00A550] hover:bg-[#007A3D] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Enregistrement...
              </>
            ) : upload.status === "uploading" ? (
              "⏳ Photo en cours..."
            ) : product ? (
              "💾 Enregistrer les modifications"
            ) : (
              "✓ Ajouter le produit"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dialog confirmation suppression ─────────────────────────────────────────

function DeleteConfirm({ productName, onConfirm, onCancel }: {
  productName: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="font-black text-lg text-gray-800 mb-2">Supprimer ce produit ?</h3>
        <p className="text-sm text-gray-500 mb-6">
          <span className="font-semibold text-gray-700">"{productName}"</span> sera définitivement retiré de votre boutique.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border-2 border-gray-200 hover:border-gray-300 rounded-xl text-sm font-semibold text-gray-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ligne produit dans la liste ──────────────────────────────────────────────

function ProductRow({ product, onEdit, onDelete }: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
}) {
  const stockVariant: BadgeVariant = product.stock === 0 ? "red" : product.stock < 10 ? "orange" : "green";
  const stockLabel = product.stock === 0 ? "Rupture" : product.stock < 10 ? `⚡ ${product.stock} restants` : `${product.stock} en stock`;

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 relative flex-shrink-0">
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">🖼️</div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 max-w-[180px]">
        <p className="font-semibold text-sm text-gray-800 line-clamp-2">{product.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-bold text-sm text-[#00A550]">{formatXAF(product.price)}</p>
        {product.originalPrice && (
          <p className="text-xs text-gray-400 line-through">{formatXAF(product.originalPrice)}</p>
        )}
        {product.unit && <p className="text-xs text-gray-400">/{product.unit}</p>}
      </td>
      <td className="px-4 py-3">
        <Badge variant={stockVariant}>{stockLabel}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">📍 {product.city}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(product)}
            className="flex items-center gap-1 text-xs font-semibold text-[#00A550] hover:bg-[#E8F7EE] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Supprimer
          </button>
        </div>
        <div className="flex items-center gap-2 group-hover:hidden">
          <span className="text-xs text-gray-300">—</span>
        </div>
      </td>
    </tr>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export default function VendorDashboard() {
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "analytics">("overview");
  const [myProducts, setMyProducts] = useState<Product[]>(vendorProducts);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const openAdd = () => { setEditingProduct(null); setShowForm(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingProduct(null); };

  const handleSave = (product: Product) => {
    if (editingProduct) {
      setMyProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      toast("Produit modifié avec succès ✓", "success");
    } else {
      setMyProducts((prev) => [product, ...prev]);
      toast(`"${product.name}" ajouté à votre boutique ✓`, "success");
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    const product = myProducts.find((p) => p.id === id);
    setMyProducts((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    toast(`"${product?.name}" supprimé`, "success");
  };

  const filteredProducts = myProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Modales */}
      {showForm && (
        <ProductFormModal product={editingProduct} onSave={handleSave} onClose={closeForm} />
      )}
      {deleteId && (
        <DeleteConfirm
          productName={myProducts.find((p) => p.id === deleteId)?.name ?? ""}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* En-tête vendeur */}
        <div className="bg-gradient-to-r from-[#00A550] to-[#007A3D] rounded-3xl p-6 text-white mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-white/30 overflow-hidden relative flex-shrink-0">
                <Image src={vendor.logo} alt={vendor.name} fill sizes="64px" className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black">{vendor.name}</h1>
                  {vendor.verified && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">✓ Vérifié</span>}
                </div>
                <p className="text-white/80 text-sm">📍 {vendor.city} · Membre depuis {new Date(vendor.joinedAt).getFullYear()}</p>
                <p className="text-white/70 text-xs mt-0.5">⭐ {vendor.rating} · {vendor.reviewCount} avis · {myProducts.length} produits</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={openAdd}>+ Ajouter un produit</Button>
              <Link href={`/vendeur/${vendor.slug}`}>
                <Button variant="ghost" size="sm" className="text-white border border-white/30 hover:bg-white/20">Voir ma boutique</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          {[
            { id: "overview", label: "📊 Vue d'ensemble" },
            { id: "products", label: `🛍️ Produits (${myProducts.length})` },
            { id: "orders", label: "📦 Commandes" },
            { id: "analytics", label: "📈 Analytiques" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t.id ? "bg-[#00A550] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Vue d'ensemble ── */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs font-semibold text-[#00A550] bg-[#E8F7EE] px-2 py-0.5 rounded-full">{s.change}</span>
                  </div>
                  <p className="text-xl font-black text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="flex items-center justify-between p-5 border-b">
                <h2 className="font-bold text-gray-800">Commandes récentes</h2>
                <button onClick={() => setTab("orders")} className="text-sm text-[#00A550] font-semibold hover:underline">Voir tout</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3 text-left">Commande</th>
                      <th className="px-5 py-3 text-left">Client</th>
                      <th className="px-5 py-3 text-left">Produit</th>
                      <th className="px-5 py-3 text-right">Montant</th>
                      <th className="px-5 py-3 text-center">Statut</th>
                      <th className="px-5 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-600">{o.id}</td>
                        <td className="px-5 py-3.5 font-medium">{o.client}</td>
                        <td className="px-5 py-3.5 text-gray-600 truncate max-w-[150px]">{o.product}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-[#00A550]">{formatXAF(o.amount)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <Badge variant={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#FFD100] to-[#FF8C00] rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-3">💡 Conseils pour booster vos ventes</h3>
              <ul className="space-y-2 text-sm">
                {[
                  "Ajoutez des photos de qualité — les produits avec 3+ photos se vendent 3× mieux",
                  "Répondez rapidement sur WhatsApp — les clients préfèrent les vendeurs réactifs",
                  "Proposez la livraison gratuite dès 20 000 FCFA d'achat pour augmenter le panier moyen",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">{i + 1}.</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* ── Produits ── */}
        {tab === "products" && (
          <div>
            {/* Barre d'outils */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#00A550] bg-white transition-colors"
                />
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-[#00A550] hover:bg-[#007A3D] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm active:scale-95 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau produit
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
                <div className="text-5xl mb-4">{search ? "🔍" : "🛍️"}</div>
                <h3 className="font-bold text-gray-800 mb-2">
                  {search ? "Aucun produit trouvé" : "Votre boutique est vide"}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  {search ? `Aucun résultat pour "${search}"` : "Commencez par ajouter votre premier produit."}
                </p>
                {!search && (
                  <button
                    onClick={openAdd}
                    className="bg-[#00A550] hover:bg-[#007A3D] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                  >
                    + Ajouter mon premier produit
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Résumé */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm text-gray-600 font-medium">
                    {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
                    {search && ` · résultats pour "${search}"`}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{filteredProducts.filter((p) => p.stock === 0).length} rupture(s)</span>
                    <span>·</span>
                    <span>{filteredProducts.filter((p) => p.stock > 0 && p.stock < 10).length} stock faible</span>
                  </div>
                </div>

                {/* Tableau */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left w-16">Photo</th>
                        <th className="px-4 py-3 text-left">Produit</th>
                        <th className="px-4 py-3 text-left">Prix</th>
                        <th className="px-4 py-3 text-left">Stock</th>
                        <th className="px-4 py-3 text-left">Ville</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredProducts.map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          onEdit={openEdit}
                          onDelete={(id) => setDeleteId(id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Alerte stock faible */}
            {myProducts.some((p) => p.stock > 0 && p.stock < 5) && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-semibold text-orange-700">Stock critique</p>
                  <p className="text-xs text-orange-600 mt-0.5">
                    {myProducts.filter((p) => p.stock > 0 && p.stock < 5).map((p) => p.name).join(", ")} — réapprovisionnez rapidement.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Commandes ── */}
        {tab === "orders" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">Toutes les commandes</h2>
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none bg-white">
                <option>Tous les statuts</option>
                <option>En attente</option>
                <option>Confirmée</option>
                <option>Expédiée</option>
                <option>Livrée</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">Commande</th>
                    <th className="px-5 py-3 text-left">Client</th>
                    <th className="px-5 py-3 text-left">Produit</th>
                    <th className="px-5 py-3 text-right">Montant</th>
                    <th className="px-5 py-3 text-center">Statut</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs">{o.id}</td>
                      <td className="px-5 py-3.5 font-medium">{o.client}</td>
                      <td className="px-5 py-3.5 text-gray-600">{o.product}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-[#00A550]">{formatXAF(o.amount)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge variant={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">{o.date}</td>
                      <td className="px-5 py-3.5 text-center">
                        <button className="text-xs text-[#00A550] hover:underline font-medium">Gérer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Analytiques ── */}
        {tab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 md:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4">Évolution des ventes (6 derniers mois)</h3>
              <div className="flex items-end gap-3 h-40">
                {[45000, 78000, 62000, 95000, 112000, 342500].map((v, i) => {
                  const months = ["Nov", "Déc", "Jan", "Fév", "Mar", "Avr"];
                  const height = Math.round((v / 342500) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-xs text-gray-500 font-medium">{formatXAF(v).replace(" FCFA", "")}</span>
                      <div className="w-full rounded-t-lg bg-[#00A550] hover:bg-[#007A3D] transition-colors" style={{ height: `${height}%` }} />
                      <span className="text-xs text-gray-500">{months[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Produits les plus vendus</h3>
              <div className="space-y-3">
                {myProducts.slice(0, 4).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="font-black text-gray-300 text-lg w-5">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg overflow-hidden relative flex-shrink-0 bg-gray-100">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">🖼️</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                        <div className="bg-[#00A550] h-1.5 rounded-full transition-all" style={{ width: `${100 - i * 20}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{28 - i * 5} ventes</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Modes de paiement utilisés</h3>
              <div className="space-y-3">
                {[
                  { name: "Airtel Money", pct: 55, color: "#FF0000" },
                  { name: "Moov Money", pct: 28, color: "#0066CC" },
                  { name: "Espèces", pct: 14, color: "#00A550" },
                  { name: "Carte bancaire", pct: 3, color: "#FFD100" },
                ].map((m) => (
                  <div key={m.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-gray-500">{m.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
