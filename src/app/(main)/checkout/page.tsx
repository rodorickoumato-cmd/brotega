"use client";
import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/store/cart";
import { formatXAF, PROVINCES_GABON } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useRouter } from "next/navigation";
import { fraisLivraison, AIRTEL_MONEY_ACTIF, MOOV_MONEY_ACTIF } from "@/lib/rules";
import { vers241 } from "@/lib/phone";

type Step = "address" | "payment" | "confirm";
type PayMethod = "airtel_money" | "moov_money" | "especes";

export default function CheckoutPage() {
  const { state, total, dispatch } = useCart();
  const router = useRouter();
  const [step, setStep] = useState<Step>("address");
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    city: "Libreville",
    district: "",
    details: "",
  });

  const validerAdresse = () => {
    if (!address.fullName.trim()) { toast("Entrez votre nom complet.", "error"); return false; }
    const phone = address.phone.replace(/\s/g, "");
    if (!phone) { toast("Entrez votre numéro de téléphone.", "error"); return false; }
    if (!/^\+?[0-9]{8,15}$/.test(phone)) { toast("Numéro de téléphone invalide. Exemple : 01 23 45 67", "error"); return false; }
    return true;
  };
  const [payMethod, setPayMethod] = useState<PayMethod>("airtel_money");

  const delivery = fraisLivraison(address.city);
  const grandTotal = total + delivery;

  const handleOrder = async () => {
    const phoneAdresse = vers241(address.phone);
    if (!phoneAdresse) { toast("Numéro de livraison invalide.", "error"); return; }

    setLoading(true);
    let res: { succes?: boolean; erreur?: string; code?: string; instructions?: string };
    try {
      const r = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: state.items.map((item) => ({
            produit_id: item.product.id,
            nom: item.product.name,
            prix_xaf: item.product.price,
            quantite: item.quantity,
            image: item.product.images[0] ?? null,
            vendeur_id: item.product.vendorId,
          })),
          adresse: {
            nom_complet: address.fullName,
            telephone: phoneAdresse,
            ville: address.city,
            quartier: address.district || undefined,
            details: address.details || undefined,
          },
          mode_paiement: payMethod,
          telephone_paiement: payMethod === "especes" ? undefined : phoneAdresse,
        }),
      });
      res = await r.json() as { succes?: boolean; erreur?: string; code?: string; instructions?: string };
    } catch {
      setLoading(false);
      toast("Erreur réseau. Vérifiez votre connexion.", "error");
      return;
    }
    setLoading(false);

    if (res.erreur) { toast(res.erreur, "error"); return; }

    dispatch({ type: "CLEAR" });
    toast(
      payMethod === "especes"
        ? "🎉 Commande créée ! Préparez l'argent pour la livraison."
        : "📲 Validez le paiement sur votre téléphone",
      "success"
    );
    router.push(`/commande/${res.code}`);
  };

  if (state.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 mb-6">Ajoutez des produits avant de commander.</p>
        <Button onClick={() => router.push("/catalogue")}>Continuer les achats</Button>
      </div>
    );
  }

  const payMethods = [
    ...(AIRTEL_MONEY_ACTIF ? [{ id: "airtel_money" as PayMethod, name: "Airtel Money", icon: "📱", desc: "Validation USSD sur votre téléphone" }] : []),
    ...(MOOV_MONEY_ACTIF   ? [{ id: "moov_money"   as PayMethod, name: "Moov Money",   icon: "📲", desc: "Validation USSD sur votre téléphone" }] : []),
    { id: "especes" as PayMethod, name: "Espèces à la livraison", icon: "💵", desc: "Vous payez cash au livreur" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-gray-800 mb-6">Finaliser la commande</h1>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        {(["address", "payment", "confirm"] as Step[]).map((s, i) => {
          const labels = ["Livraison", "Paiement", "Confirmation"];
          const idx = ["address", "payment", "confirm"].indexOf(step);
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i <= idx ? "bg-[#E63946] text-white" : "bg-gray-200 text-gray-500"}`}>
                {i < idx ? "✓" : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i <= idx ? "text-[#E63946]" : "text-gray-400"}`}>{labels[i]}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${i < idx ? "bg-[#E63946]" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          {step === "address" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-5">Adresse de livraison</h2>
              <div className="space-y-4">
                {/* Nom */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Votre nom complet <span className="text-red-500">*</span></label>
                  <input
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    placeholder="Jean-Pierre Mbourou"
                    autoComplete="name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all"
                  />
                </div>

                {/* Téléphone avec préfixe */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Téléphone <span className="text-red-500">*</span></label>
                  <div className="flex border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#E63946] focus-within:ring-2 focus-within:ring-[#E63946]/20 transition-all">
                    <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-600 border-r border-gray-200 font-medium whitespace-nowrap">🇬🇦 +241</span>
                    <input
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder="01 23 45 67"
                      inputMode="tel"
                      autoComplete="tel"
                      className="flex-1 px-3 py-3.5 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Ville */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Ville <span className="text-red-500">*</span></label>
                  <select
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all"
                  >
                    {Object.entries(PROVINCES_GABON).map(([province, villes]) => (
                      <optgroup key={province} label={province}>
                        {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Quartier — optionnel */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Quartier <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                  </label>
                  <input
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    placeholder="Nombakélé, PK5, Akanda..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all"
                  />
                </div>

                {/* Détails */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Indication pour trouver votre adresse <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                  </label>
                  <textarea
                    value={address.details}
                    onChange={(e) => setAddress({ ...address, details: e.target.value })}
                    placeholder="Près de la boulangerie, maison bleue, 2ème étage..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E63946] focus:ring-2 focus:ring-[#E63946]/20 transition-all resize-none"
                  />
                </div>

                <Button
                  fullWidth
                  size="lg"
                  onClick={() => { if (validerAdresse()) setStep("payment"); }}
                  className="py-4 text-base"
                >
                  Continuer vers le paiement →
                </Button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-1">Mode de paiement</h2>
              <p className="text-xs text-gray-500 mb-5">Sécurisé · Argent bloqué jusqu&apos;à livraison</p>

              {/* Avis clients Moov */}
              <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-semibold">Client Moov Money ?</span> Le paiement en ligne Moov n&apos;est pas encore disponible.
                  Choisissez <span className="font-semibold">Espèces à la livraison</span> — vous payez le livreur à la réception.
                </p>
              </div>

              <div className="space-y-3 mb-5">
                {payMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPayMethod(pm.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${payMethod === pm.id ? "border-[#E63946] bg-[#FEF2F2]" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="text-2xl">{pm.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-800">{pm.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pm.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${payMethod === pm.id ? "border-[#E63946] bg-[#E63946]" : "border-gray-300"}`}>
                      {payMethod === pm.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {payMethod === "airtel_money" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <p className="font-semibold text-blue-800 text-sm mb-2">Comment ça marche</p>
                  <ol className="text-blue-700 space-y-1.5 text-xs list-decimal list-inside">
                    <li>Vous confirmez la commande</li>
                    <li>Une demande USSD arrive sur votre téléphone Airtel</li>
                    <li>Saisissez votre code PIN Airtel Money</li>
                    <li>Montant débité : <strong>{formatXAF(grandTotal)}</strong></li>
                  </ol>
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-100">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-blue-700 text-xs">Votre argent est bloqué jusqu&apos;à confirmation de livraison. Si non livré : remboursement sous 48h.</p>
                  </div>
                </div>
              )}

              {payMethod === "especes" && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                  <p className="font-semibold text-amber-900 text-sm mb-2">Paiement à la livraison</p>
                  <ul className="text-amber-800 text-xs space-y-1.5">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      Préparez exactement <strong className="ml-1">{formatXAF(grandTotal)}</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      Le livreur ne rend pas la monnaie
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      Compatible Airtel Money, Moov Money et cash
                    </li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("address")}>← Retour</Button>
                <Button fullWidth size="lg" onClick={() => setStep("confirm")}>
                  Confirmer le paiement →
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-5">Récapitulatif de la commande</h2>

              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Livraison vers</span>
                  <span className="font-medium">{address.city}{address.district ? `, ${address.district}` : ""}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Destinataire</span>
                  <span className="font-medium">{address.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Téléphone</span>
                  <span className="font-medium">{address.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paiement</span>
                  <span className="font-medium">{payMethods.find((p) => p.id === payMethod)?.name}</span>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {state.items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0 bg-gray-100">
                      {item.product.images[0] ? (
                        <Image src={item.product.images[0]} alt={item.product.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Qté: {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-sm">{formatXAF(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("payment")}>← Retour</Button>
                <Button fullWidth size="lg" loading={loading} onClick={handleOrder}>
                  🎉 Confirmer la commande — {formatXAF(grandTotal)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-fit sticky top-24">
          <h3 className="font-bold text-gray-800 mb-4">Résumé</h3>
          <div className="space-y-3 mb-4">
            {state.items.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate mr-2 flex-1">{item.product.name} ×{item.quantity}</span>
                <span className="font-medium flex-shrink-0">{formatXAF(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Sous-total</span>
              <span>{formatXAF(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Livraison</span>
              <span>{formatXAF(delivery)}</span>
            </div>
            <div className="flex justify-between font-black text-base border-t pt-2">
              <span>Total</span>
              <span className="text-[#E63946]">{formatXAF(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
