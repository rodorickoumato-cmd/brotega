"use client";

import { useState } from "react";
import Link from "next/link";

export default function SupportPage() {
  const [pseudo, setPseudo] = useState("");
  const [ticketType, setTicketType] = useState("forgotten_phrase");
  const [email, setEmail] = useState("");
  const [phraseFirstLetter, setPhraseFirstLetter] = useState("");
  const [phraseWordCount, setPhraseWordCount] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/support-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo,
          ticket_type: ticketType,
          email_provided: email || null,
          phrase_first_letter: phraseFirstLetter || null,
          phrase_word_count: phraseWordCount ? parseInt(phraseWordCount) : null,
          additional_info: additionalInfo || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erreur || "Erreur création ticket");
      }

      const result = await res.json();
      setTicketNumber(result.ticket_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (ticketNumber) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-4">✅ Ticket Créé</h1>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-3xl font-black text-[#E63946]">#{ticketNumber}</p>
            <p className="text-sm text-gray-600 mt-2">Numéro de ticket</p>
          </div>
          <p className="text-gray-700 mb-6">
            Merci! Notre équipe support vous répondra dans 24 heures. Veuillez consulter votre email.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-[#E63946] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#A4161A]"
          >
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#E63946] to-[#A4161A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <h1 className="text-2xl font-black text-gray-800 mb-2">Support</h1>
        <p className="text-gray-600 text-sm mb-6">Créez un ticket pour récupérer votre compte</p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pseudo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Pseudonyme</label>
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="votre_pseudo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
              required
            />
          </div>

          {/* Ticket Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Problème</label>
            <select
              value={ticketType}
              onChange={(e) => setTicketType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
            >
              <option value="forgotten_phrase">Oublié ma phrase secrète</option>
              <option value="forgotten_code">Oublié mon code de récupération</option>
              <option value="account_recovery">Autre problème d'accès</option>
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email (optionnel)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
            />
          </div>

          {/* Phrase Info */}
          {ticketType === "forgotten_phrase" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  1ère lettre de la phrase (optionnel)
                </label>
                <input
                  type="text"
                  value={phraseFirstLetter}
                  onChange={(e) => setPhraseFirstLetter(e.target.value.substring(0, 1))}
                  placeholder="M"
                  maxLength={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre de mots (optionnel)
                </label>
                <input
                  type="number"
                  value={phraseWordCount}
                  onChange={(e) => setPhraseWordCount(e.target.value)}
                  placeholder="4"
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
                />
              </div>
            </>
          )}

          {/* Additional Info */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Informations supplémentaires
            </label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Décrivez votre situation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E63946]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E63946] text-white font-bold py-2 rounded-lg hover:bg-[#A4161A] disabled:opacity-50"
          >
            {loading ? "Envoi..." : "Créer un ticket"}
          </button>
        </form>

        <Link
          href="/auth/login"
          className="block text-center text-[#E63946] font-semibold hover:underline mt-4"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
