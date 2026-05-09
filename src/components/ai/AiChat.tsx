"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

const QUESTIONS_RAPIDES = [
  "Comment passer une commande ?",
  "Comment devenir vendeur ?",
  "Quels sont les frais de livraison ?",
  "Comment fonctionne le paiement ?",
];

export function AiChat() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const basRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ouvert && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Bonjour ! Je suis Broto, l'assistant Brotega 🇬🇦\n\nComment puis-je vous aider aujourd'hui ?",
      }]);
    }
    if (ouvert) setTimeout(() => inputRef.current?.focus(), 300);
  }, [ouvert, messages.length]);

  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chargement]);

  const envoyer = async (texte: string) => {
    const msg = texte.trim();
    if (!msg || chargement) return;
    setSaisie("");
    setErreur("");

    const nvMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(nvMessages);
    setChargement(true);

    const placeholder: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, placeholder]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nvMessages }),
      });

      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        reponse += decoder.decode(value, { stream: true });
        const rep = reponse;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: rep },
        ]);
      }
    } catch {
      setMessages((prev) => prev.slice(0, -1));
      setErreur("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setChargement(false);
    }
  };

  const effacer = () => {
    setMessages([]);
    setErreur("");
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOuvert((o) => !o)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-[#00A550] rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all"
        aria-label="Assistant IA Brotega"
      >
        {ouvert ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <span className="text-2xl">🤖</span>
        )}
      </button>

      {/* Panel chat */}
      {ouvert && (
        <div className="fixed bottom-36 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
          style={{ maxHeight: "70vh" }}>

          {/* Header */}
          <div className="bg-[#00A550] px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-lg flex-shrink-0">
              🤖
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm">Broto</p>
              <p className="text-white/70 text-xs">Assistant Brotega · Toujours disponible</p>
            </div>
            <button
              onClick={effacer}
              className="text-white/60 text-xs font-medium hover:text-white transition-colors px-2 py-1"
              title="Effacer la conversation"
            >
              Effacer
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[#00A550] text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {m.content || (
                    <span className="flex gap-1 items-center py-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Questions rapides (seulement après le message d'accueil) */}
            {messages.length === 1 && !chargement && (
              <div className="space-y-2 pt-1">
                {QUESTIONS_RAPIDES.map((q) => (
                  <button key={q} onClick={() => envoyer(q)}
                    className="w-full text-left text-xs text-[#00A550] font-medium bg-[#E8F7EE] px-3 py-2.5 rounded-xl active:scale-98 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {erreur && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{erreur}</p>
            )}

            <div ref={basRef} />
          </div>

          {/* Saisie */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-gray-100">
            <form
              onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }}
              className="flex gap-2 items-center"
            >
              <input
                ref={inputRef}
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                placeholder="Posez votre question..."
                disabled={chargement}
                className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A550]/30 disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={!saisie.trim() || chargement}
                className="w-10 h-10 bg-[#00A550] rounded-xl flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all flex-shrink-0"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
