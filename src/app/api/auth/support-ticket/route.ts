// API: Créer ticket de support pour récupération

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pseudo,
      ticket_type,
      email_provided,
      phrase_first_letter,
      phrase_word_count,
      additional_info,
    } = body;

    // 1. Validation
    if (!pseudo || !ticket_type) {
      return NextResponse.json(
        { erreur: "Pseudo et type ticket requis" },
        { status: 400 }
      );
    }

    if (!["forgotten_phrase", "forgotten_code", "account_recovery"].includes(ticket_type)) {
      return NextResponse.json(
        { erreur: "Type ticket invalide" },
        { status: 400 }
      );
    }

    // 2. Récupérer l'utilisateur
    const admin = createAdminClient();
    const { data: user } = await (admin
      .from("utilisateurs_auth_v2" as any)
      .select("id")
      .eq("pseudo", pseudo)
      .maybeSingle()) as any;

    if (!user) {
      return NextResponse.json(
        { erreur: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // 3. Créer le ticket de support
    const { data: ticket, error: insertError } = await (admin
      .from("support_tickets" as any)
      .insert({
        user_id: user.id,
        pseudo,
        type: ticket_type,
        subject: `Récupération: ${ticket_type}`,
        email_provided,
        phrase_first_letter: phrase_first_letter || null,
        phrase_word_count: phrase_word_count || null,
        additional_info,
        status: "open",
        created_at: new Date().toISOString(),
      })
      .select("id, ticket_number")) as any;

    if (insertError || !ticket || ticket.length === 0) {
      console.error("Insert Error:", insertError);
      return NextResponse.json(
        { erreur: "Erreur création ticket" },
        { status: 500 }
      );
    }

    const ticketData = ticket[0];

    // 4. Log attempt
    await (admin
      .from("recovery_attempts" as any)
      .insert({
        user_id: user.id,
        action: "support_ticket_created",
        success: true,
        recovery_method_used: "support",
        ip_address: (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"),
        user_agent: req.headers.get("user-agent"),
      })) as any;

    return NextResponse.json(
      {
        succes: true,
        ticket_id: ticketData.id,
        ticket_number: ticketData.ticket_number,
        message: `Ticket #${ticketData.ticket_number} créé. Support vous répondra dans 24h.`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/auth/support-ticket]", err);
    return NextResponse.json({ erreur: "Erreur serveur" }, { status: 500 });
  }
}
