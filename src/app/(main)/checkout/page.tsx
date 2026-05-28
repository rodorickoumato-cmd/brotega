"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useCart } from "@/store/cart";
import { formatXAF, PROVINCES_GABON } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toaster";
import { useRouter } from "next/navigation";
import { fraisLivraison, libelleTrajetLivraison, AIRTEL_MONEY_ACTIF, MOOV_MONEY_ACTIF, FRAIS_MOBILE_MONEY_TAUX } from "@/lib/rules";
import { vers241 } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";

type Step = "address" | "payment" | "confirm";
type PayMethod = "airtel_money" | "moov_money" | "especes";

const ZONE_STYLE = {
  locale: "text-green-700 bg-green-50",
  intra:  "text-blue-700 bg-blue-50",
  inter:  "text-orange-700 bg-orange-50",
};

export default function CheckoutPage() {
  const { state, total, dispatch } = useCart();
  const router = useRouter();
  const [step,    setStep]    = useState<Step>("address");
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    city: "Libreville",
    district: "",
    details: "",
  });

  const [payMethod,    setPayMethod]    = useState<PayMethod>("airtel_money");
  const [villeVendeur, setVilleVendeur] = useState<string>("Libreville");
  const [vendeurNom,   setVendeurNom]   = useState<string>("");

  // Vérifier disponibilité des produits au chargement
  useEffect(() => {
    if (!state.items.length) return;
    const ids = state.items.map((i) => i.product.id).join(",");
    fetch(`/api/produits/check?ids=${ids}`)
      .then((r) => r.json())
      .then((data: { indisponibles?: { id: string; nom: string }[] }) => {
        if (!data.indisponibles?.length) return;
        data.indisponibles.forEach(({ id, nom }) => {
          dispatch({ type: "REMOVE", id });
          toast(`"${nom}" n'est plus disponible et a été retiré du panier.`, "error");
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Charger la ville du vendeur depuis Supabase
  useEffect(() => {
    if (!state.items.length) return;
    const vendeurId = state.items[0].product.vendorId;
    if (!vendeurId) return;
    const supabase = createClient();
    supabase.from("vendeurs").select("ville, nom").eq("id", vendeurId).single()
      .then(({ data }) => {
        if (data?.ville) setVilleVendeur(data.ville);
        if (data?.nom)   setVendeurNom(data.nom);
      });
  }, [state.items]);

  const delivery   = fraisLivraison(villeVendeur, address.city);
  const trajet     = libelleTrajetLivraison(villeVendeur, address.city);
  const isMobileMoney = payMethod === "airtel_money" || payMethod === "moov_money";
  const fraisMM    = isMobileMoney ? Math.round((total + delivery) * FRAIS_MOBILE_MONEY_TAUX) : 0;
  const grandTotal = total + delivery + fraisMM;

  const validerAdresse = () => {
    if (!address.fullName.trim()) { toast("Entrez votre nom complet.", "error"); return false; }
    const phone = address.phone.replace(/\s/g, "");
    if (!phone) { toast("Entrez votre numéro de téléphone.", "error"); return false; }
    if (!/^\+?[0-9]{8,15}$/.test(phone)) { toast("Numéro de téléphone invalide. Exemple : 01 23 45 67", "error"); return false; }
    return true;
  };

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
        ? "Commande créée ! Préparez l'argent pour la livraison."
        : "Validez le paiement sur votre téléphone",
      "success"
    );
    router.push(`/commande/${res.code}`);
  };

  if (state.items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 mb-6">Ajoutez des produits avant de commander.</p>
        <Button onClick={() => router.push("/catalogue")}>Continuer les achats</Button>
      </div>
    );
  }

  const payMethods = [
    ...(AIRTEL_MONEY_ACTIF ? [{ id: "airtel_money" as PayMethod, name: "Airtel Money", desc: "Validation USSD immédiate sur votre téléphone Airtel" }] : []),
    ...(MOOV_MONEY_ACTIF   ? [{ id: "moov_money"   as PayMethod, name: "Moov Money",   desc: "Validation USSD immédiate sur votre téléphone Moov"  }] : []),
    { id: "especes" as PayMethod, name: "Espèces à la livraison", desc: "Vous payez le livreur à la réception" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-gray-800 mb-6">Finaliser la commande</h1>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2 mb-8">
        {(["address", "payment", "confirm"] as Step[]).map((s, i) => {
          const labels = ["Livraison", "Paiement", "Confirmation"];
          const idx    = ["address", "payment", "confirm"].indexOf(step);
          const done   = i < idx;
          const actif  = i === idx;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
                done ? "bg-green-500 text-white" : actif ? "bg-[#E63946] text-white" : "bg-gray-200 text-gray-400"
              }`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block transition-colors ${actif ? "text-[#E63946] font-black" : done ? "text-green-600" : "text-gray-400"}`}>
                {labels[i]}
              </span>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mx-1 rounded transition-all ${done ? "bg-green-400" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Formulaire principal ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* ÉTAPE 1 : Adresse */}
          {step === "address" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-black text-lg mb-5 flex items-center gap-2">
                <div className="w-7 h-7 bg-[#E63946] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                Adresse de livraison
              </h2>
              <div className="space-y-4">

                {/* Nom complet */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Votre nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    placeholder="Jean-Pierre Mbourou"
                    autoComplete="name"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#E63946] transition-all"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#E63946] transition-all">
                    <span className="bg-gray-50 px-3 flex items-center text-sm text-gray-600 border-r border-gray-200 font-medium whitespace-nowrap">
                      🇬🇦 +241
                    </span>
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

                {/* Ville avec frais en temps réel */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Ville de livraison <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#E63946] transition-all"
                  >
                    {Object.entries(PROVINCES_GABON).map(([province, villes]) => (
                      <optgroup key={province} label={province}>
                        {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                      </optgroup>
                    ))}
                  </select>

                  {/* Indicateur frais de livraison en temps réel */}
                  <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2.5 ${ZONE_STYLE[trajet.zone]}`}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-xs font-black">{trajet.label}</p>
                        {vendeurNom && (
                          <p className="text-[10px] opacity-70">Expédié depuis : {vendeurNom} ({villeVendeur})</p>
                        )}
                      </div>
                    </div>
                    <p className="font-black text-sm flex-shrink-0 ml-3">{formatXAF(delivery)}</p>
                  </div>
                </div>

                {/* Quartier */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Quartier <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                  </label>
                  <input
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    placeholder="Nombakélé, PK5, Akanda..."
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#E63946] transition-all"
                  />
                </div>

                {/* Indications */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">
                    Indications pour vous trouver <span className="text-gray-400 font-normal text-xs">(facultatif)</span>
                  </label>
                  <textarea
                    value={address.details}
                    onChange={(e) => setAddress({ ...address, details: e.target.value })}
                    placeholder="Près de la boulangerie, maison bleue, 2ème étage..."
                    rows={2}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E63946] transition-all resize-none"
                  />
                </div>

                <Button fullWidth size="lg" onClick={() => { if (validerAdresse()) setStep("payment"); }}>
                  Continuer vers le paiement →
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Paiement */}
          {step === "payment" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-black text-lg mb-1 flex items-center gap-2">
                <div className="w-7 h-7 bg-[#E63946] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                Mode de paiement
              </h2>
              <p className="text-xs text-gray-500 mb-5 pl-9">Sécurisé · Argent bloqué jusqu&apos;à livraison</p>

              {/* Info Moov */}
              <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-600">
                  <span className="font-bold">Client Moov Money ?</span>{" "}
                  Le paiement Moov en ligne n&apos;est pas disponible actuellement.
                  Choisissez <span className="font-bold">Espèces à la livraison</span>.
                </p>
              </div>

              <div className="space-y-3 mb-5">
                {payMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPayMethod(pm.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      payMethod === pm.id
                        ? "border-[#E63946] bg-[#FEF2F2]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      payMethod === pm.id ? "bg-[#E63946]" : "bg-gray-100"
                    }`}>
                      {pm.id === "airtel_money" && (
                        <svg className={`w-5 h-5 ${payMethod === pm.id ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      {pm.id === "especes" && (
                        <svg className={`w-5 h-5 ${payMethod === pm.id ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm text-gray-800">{pm.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{pm.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      payMethod === pm.id ? "border-[#E63946] bg-[#E63946]" : "border-gray-300"
                    }`}>
                      {payMethod === pm.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Explication Airtel Money */}
              {payMethod === "airtel_money" && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <p className="font-black text-blue-800 text-sm mb-3">Comment ça se passe</p>
                  <div className="space-y-2.5">
                    {[
                      { n: "1", t: "Vous confirmez la commande" },
                      { n: "2", t: "Une demande USSD arrive sur votre téléphone Airtel" },
                      { n: "3", t: "Saisissez votre code PIN Airtel Money" },
                      { n: "4", t: `Montant débité : ${formatXAF(grandTotal)}` },
                    ].map((s) => (
                      <div key={s.n} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          {s.n}
                        </span>
                        <p className="text-xs text-blue-700 leading-snug">{s.t}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-blue-700 text-xs">Argent bloqué jusqu&apos;à confirmation de livraison. Non livré = remboursé sous 48h.</p>
                  </div>
                </div>
              )}

              {/* Explication Espèces */}
              {payMethod === "especes" && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
                  <p className="font-black text-amber-900 text-sm mb-3">Paiement à la livraison</p>
                  <div className="space-y-2">
                    {[
                      `Préparez exactement ${formatXAF(grandTotal)}`,
                      "Remettez l'argent au livreur contre votre colis",
                      "Vérifiez votre colis avant de signer",
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-800">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("address")}>← Retour</Button>
                <Button fullWidth size="lg" onClick={() => setStep("confirm")}>
                  Confirmer →
                </Button>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Récapitulatif */}
          {step === "confirm" && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-black text-lg mb-5 flex items-center gap-2">
                <div className="w-7 h-7 bg-[#E63946] rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                Récapitulatif
              </h2>

              {/* Infos livraison */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Destinataire</span>
                  <span className="font-semibold text-gray-800">{address.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="font-semibold text-gray-800">{address.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Adresse</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {address.city}{address.district ? `, ${address.district}` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paiement</span>
                  <span className="font-semibold text-gray-800">{payMethods.find((p) => p.id === payMethod)?.name}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Livraison</span>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ZONE_STYLE[trajet.zone]}`}>
                      {trajet.label}
                    </span>
                  </div>
                </div>
                {fraisMM > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Frais Mobile Money</span>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      +{formatXAF(fraisMM)} (3%)
                    </span>
                  </div>
                )}
              </div>

              {/* Articles */}
              <div className="space-y-3 mb-5">
                {state.items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden relative flex-shrink-0 bg-gray-100">
                      {item.product.images[0] ? (
                        <Image src={item.product.images[0]} alt={item.product.name} fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-1 text-gray-800">{item.product.name}</p>
                      <p className="text-xs text-gray-400">Qté : {item.quantity}</p>
                    </div>
                    <span className="font-black text-sm text-gray-700 flex-shrink-0">{formatXAF(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("payment")}>← Retour</Button>
                <Button fullWidth size="lg" loading={loading} onClick={handleOrder}>
                  Commander — {formatXAF(grandTotal)}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Résumé latéral sticky ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-fit sticky top-24">
          <h3 className="font-black text-gray-800 mb-4">Résumé</h3>

          <div className="space-y-2.5 mb-4">
            {state.items.map((item) => (
              <div key={item.product.id} className="flex items-center justify-between text-sm gap-2">
                <span className="text-gray-600 truncate flex-1">{item.product.name} ×{item.quantity}</span>
                <span className="font-semibold flex-shrink-0">{formatXAF(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Sous-total</span>
              <span>{formatXAF(total)}</span>
            </div>

            {/* Livraison avec trajet */}
            <div className="flex justify-between text-gray-500">
              <div>
                <p>Livraison</p>
                <p className={`text-[10px] font-bold mt-0.5 ${
                  trajet.zone === "locale" ? "text-green-600" :
                  trajet.zone === "intra"  ? "text-blue-600"  : "text-orange-600"
                }`}>
                  {trajet.label}
                </p>
              </div>
              <span className="font-semibold">{formatXAF(delivery)}</span>
            </div>

            {/* Frais Mobile Money */}
            {fraisMM > 0 && (
              <div className="flex justify-between text-gray-500">
                <div>
                  <p>Traitement Mobile Money</p>
                  <p className="text-[10px] font-bold mt-0.5 text-blue-600">{(FRAIS_MOBILE_MONEY_TAUX * 100).toFixed(0)}% · Airtel Money</p>
                </div>
                <span className="font-semibold">{formatXAF(fraisMM)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-base border-t pt-2 mt-1">
              <span>Total</span>
              <span className="text-[#E63946]">{formatXAF(grandTotal)}</span>
            </div>
          </div>

          {/* Garantie */}
          <div className="mt-4 flex items-start gap-2 bg-green-50 rounded-xl p-3">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-xs text-green-700 font-medium">Argent sécurisé jusqu&apos;à livraison confirmée</p>
          </div>
        </div>
      </div>
    </div>
  );
}
