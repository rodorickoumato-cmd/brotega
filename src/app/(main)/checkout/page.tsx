"use client";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { formatXAF } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useRouter } from "next/navigation";
import { CITIES_GABON } from "@/lib/utils";

type Step = "address" | "payment" | "confirm";
type PayMethod = "airtel_money" | "moov_money" | "cash" | "card";

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
  const [payMethod, setPayMethod] = useState<PayMethod>("airtel_money");

  const delivery = 2500;
  const grandTotal = total + delivery;

  const handleOrder = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    dispatch({ type: "CLEAR" });
    toast("🎉 Commande confirmée ! Vous allez recevoir un SMS de confirmation.", "success");
    router.push("/");
    setLoading(false);
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
    { id: "airtel_money" as PayMethod, name: "Airtel Money", icon: "📱", desc: "Paiement via votre numéro Airtel", color: "red" },
    { id: "moov_money" as PayMethod, name: "Moov Money", icon: "📲", desc: "Paiement via votre numéro Moov", color: "blue" },
    { id: "cash" as PayMethod, name: "Espèces à la livraison", icon: "💵", desc: "Payez cash lors de la réception", color: "green" },
    { id: "card" as PayMethod, name: "Carte bancaire", icon: "💳", desc: "Visa / Mastercard sécurisé", color: "yellow" },
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i <= idx ? "bg-[#00A550] text-white" : "bg-gray-200 text-gray-500"}`}>
                {i < idx ? "✓" : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i <= idx ? "text-[#00A550]" : "text-gray-400"}`}>{labels[i]}</span>
              {i < 2 && <div className={`flex-1 h-0.5 ${i < idx ? "bg-[#00A550]" : "bg-gray-200"}`} />}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Nom complet *</label>
                    <input
                      value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      placeholder="Jean-Pierre Mbourou"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Téléphone *</label>
                    <input
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder="+241 01 23 45 67"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Ville *</label>
                    <select
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                    >
                      {CITIES_GABON.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Quartier *</label>
                    <input
                      value={address.district}
                      onChange={(e) => setAddress({ ...address, district: e.target.value })}
                      placeholder="Nombakélé, PK5, Akanda..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Détails / Indication</label>
                  <textarea
                    value={address.details}
                    onChange={(e) => setAddress({ ...address, details: e.target.value })}
                    placeholder="Près de la boulangerie, maison bleue, 2ème étage..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30 resize-none"
                  />
                </div>
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => setStep("payment")}
                  disabled={!address.fullName || !address.phone || !address.city || !address.district}
                >
                  Continuer vers le paiement →
                </Button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-5">Mode de paiement</h2>
              <div className="space-y-3 mb-6">
                {payMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPayMethod(pm.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${payMethod === pm.id ? "border-[#00A550] bg-[#E8F7EE]" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="text-3xl">{pm.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{pm.name}</p>
                      <p className="text-xs text-gray-500">{pm.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${payMethod === pm.id ? "border-[#00A550] bg-[#00A550]" : "border-gray-300"}`}>
                      {payMethod === pm.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {(payMethod === "airtel_money" || payMethod === "moov_money") && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm">
                  <p className="font-semibold text-blue-800 mb-1">Comment payer avec {payMethod === "airtel_money" ? "Airtel Money" : "Moov Money"}</p>
                  <ol className="text-blue-700 space-y-1 text-xs list-decimal list-inside">
                    <li>Composez {payMethod === "airtel_money" ? "*555#" : "*111#"} sur votre téléphone</li>
                    <li>Sélectionnez "Paiement de facture"</li>
                    <li>Entrez le code marchand : <strong>BROTEGA</strong></li>
                    <li>Montant : {formatXAF(grandTotal)}</li>
                    <li>Validez avec votre code secret</li>
                  </ol>
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
                  <span className="font-medium">{address.city}, {address.district}</span>
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
                    <img src={item.product.images[0]} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover" />
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
              <span className="text-[#00A550]">{formatXAF(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
