"use client";

import { useEffect, useState } from "react";

interface SupportTicket {
  id: string;
  ticket_number: number;
  pseudo: string;
  type: string;
  status: string;
  email_provided: string;
  phrase_first_letter: string;
  phrase_word_count: number;
  created_at: string;
  description: string;
}

export default function AdminSupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch tickets depuis DB
    setLoading(false);
  }, [filter]);

  const handleResolve = async () => {
    if (!selectedTicket) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Call API pour marquer comme résolu
      setSelectedTicket(null);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-gray-800 mb-6">🎫 Tickets Support</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {["open", "pending_verification", "resolved"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === status
                  ? "bg-[#E63946] text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {status === "open"
                ? "Ouverts"
                : status === "pending_verification"
                  ? "À vérifier"
                  : "Résolus"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Chargement...</div>
              ) : tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Aucun ticket</div>
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedTicket?.id === ticket.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            #{ticket.ticket_number} • {ticket.pseudo}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {ticket.type === "forgotten_phrase"
                              ? "🔑 Phrase oubliée"
                              : ticket.type === "forgotten_code"
                                ? "💾 Code oublié"
                                : "❓ Autre"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            ticket.status === "open"
                              ? "bg-yellow-100 text-yellow-800"
                              : ticket.status === "pending_verification"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {ticket.status === "open" ? "Ouvert" : ticket.status === "pending_verification" ? "À vérifier" : "Résolu"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          {selectedTicket && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                <h2 className="text-xl font-black text-gray-800 mb-4">
                  Ticket #{selectedTicket.ticket_number}
                </h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-600">Pseudonyme</p>
                    <p className="font-semibold text-gray-800">{selectedTicket.pseudo}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Type</p>
                    <p className="font-semibold text-gray-800">
                      {selectedTicket.type === "forgotten_phrase"
                        ? "Phrase secrète oubliée"
                        : selectedTicket.type === "forgotten_code"
                          ? "Code récupération oublié"
                          : "Autre"}
                    </p>
                  </div>

                  {selectedTicket.email_provided && (
                    <div>
                      <p className="text-xs text-gray-600">Email fourni</p>
                      <p className="font-semibold text-gray-800 break-all">
                        {selectedTicket.email_provided}
                      </p>
                    </div>
                  )}

                  {selectedTicket.phrase_first_letter && (
                    <div>
                      <p className="text-xs text-gray-600">1ère lettre phrase</p>
                      <p className="font-semibold text-gray-800">
                        {selectedTicket.phrase_first_letter}
                      </p>
                    </div>
                  )}

                  {selectedTicket.phrase_word_count && (
                    <div>
                      <p className="text-xs text-gray-600">Nombre de mots</p>
                      <p className="font-semibold text-gray-800">
                        {selectedTicket.phrase_word_count}
                      </p>
                    </div>
                  )}

                  {selectedTicket.description && (
                    <div>
                      <p className="text-xs text-gray-600">Description</p>
                      <p className="text-sm text-gray-800">{selectedTicket.description}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Notes de résolution
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes internes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#E63946]"
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {selectedTicket.status !== "resolved" && (
                    <button
                      onClick={handleResolve}
                      disabled={loading}
                      className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Résoudre
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="w-full bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-300"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
