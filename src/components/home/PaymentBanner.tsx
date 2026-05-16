export function PaymentBanner() {
  return (
    <section className="bg-[#1A202C] text-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-bold mb-1">Moyens de paiement acceptés</h3>
            <p className="text-gray-400 text-sm">Transactions 100% sécurisées au Gabon</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {[
              { name: "Airtel Money", color: "#FF0000", icon: "📱", sub: "Paiement mobile" },
              { name: "Moov Money", color: "#0066CC", icon: "📲", sub: "Paiement mobile" },
              { name: "Espèces", color: "#E63946", icon: "💵", sub: "À la livraison" },
              { name: "Carte bancaire", color: "#FFD100", icon: "💳", sub: "Visa / Mastercard" },
            ].map((p) => (
              <div key={p.name} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                <span className="text-2xl">{p.icon}</span>
                <div>
                  <p className="text-sm font-bold leading-tight">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
