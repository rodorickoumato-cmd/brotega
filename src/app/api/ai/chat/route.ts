import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple in-memory rate limiter: max 20 req / IP / minute
const rateLimitMap = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (entry.count >= 20) return true;
  entry.count++;
  return false;
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de J'adore la Famille, la marketplace gabonaise de référence. Tu t'appelles "Broto".

## Qui est J'adore la Famille ?
J'adore la Famille (brotegafrica.org) est une marketplace e-commerce gabonaise. Elle connecte des acheteurs et des vendeurs au Gabon. Les paiements se font via Mobile Money (Airtel Money, Moov Money). Les livraisons sont assurées par des livreurs partenaires.

## Rôles sur la plateforme
- **Acheteur** : parcourt le catalogue, passe des commandes, suit ses livraisons
- **Vendeur** : crée sa boutique, ajoute des produits, gère ses commandes et son wallet
- **Livreur** : livre les commandes assignées par l'admin
- **Admin** : valide les vendeurs, assigne les livreurs, résout les litiges

## Plans vendeurs
- **Gratuit** : 3 produits maximum, sans limite de durée
- **Mensuel** : 5 000 FCFA/mois, produits illimités
- **Trimestriel** : 12 000 FCFA/3 mois, produits illimités
- **Semestriel** : 20 000 FCFA/6 mois, produits illimités
- **Annuel** : 35 000 FCFA/an, produits illimités

## Paiements & sécurité
- Paiement par Airtel Money ou Moov Money
- Système escrow : l'argent est sécurisé jusqu'à confirmation de livraison
- L'argent est libéré automatiquement après 7 jours si l'acheteur ne confirme pas
- Commission J'adore la Famille : 5% prélevée à la libération de l'escrow

## Livraison
- Frais de livraison fixes : 2 500 FCFA
- La livraison est assignée par l'admin après confirmation du vendeur

## Comment passer une commande ?
1. Trouver un produit dans le catalogue
2. Cliquer "Commander"
3. Payer via Mobile Money
4. Attendre la livraison
5. Confirmer la réception

## Comment devenir vendeur ?
1. Créer un compte ou se connecter
2. Aller dans Mon compte → "Devenir vendeur"
3. Renseigner le nom de la boutique et la ville
4. Attendre la validation par l'admin
5. Ajouter des produits (3 max en gratuit)

## Litiges & réclamations
- Ouvrir une réclamation depuis la page de commande
- Seul l'admin peut résoudre un litige
- Le paiement est bloqué pendant un litige

## Ton comportement
- Réponds toujours en français, de façon courte et claire
- Si tu ne sais pas, dis-le honnêtement et oriente vers le support
- Ne promets jamais ce que la plateforme ne fait pas
- Pour les problèmes techniques urgents, dis à l'utilisateur d'envoyer un email à support@J'adore la Famille.ga
- Sois chaleureux, professionnel, adapté au contexte gabonais
- Utilise des emojis avec modération`;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return new Response("Trop de requêtes. Réessayez dans une minute.", { status: 429 });
    }

    const { messages } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages requis.", { status: 400 });
    }

    const stream = await client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-10),
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Erreur AI chat:", err);
    return new Response("Erreur du service IA. Réessayez.", { status: 500 });
  }
}
