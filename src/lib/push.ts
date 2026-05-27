import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL ?? "admin@jadoelafamille.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(`mailto:${ADMIN_EMAIL}`, VAPID_PUBLIC, VAPID_PRIVATE);
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function envoyerPushUtilisateurs(
  utilisateurIds: string[],
  payload: PushPayload
) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !utilisateurIds.length) return;

  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("utilisateur_id", utilisateurIds);

    if (!subs?.length) return;

    const message = JSON.stringify(payload);
    const expirees: string[] = [];

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message
          );
        } catch (e) {
          // 410 Gone = subscription expirée → supprimer
          if ((e as { statusCode?: number }).statusCode === 410) {
            expirees.push(s.endpoint);
          }
        }
      })
    );

    if (expirees.length) {
      await admin.from("push_subscriptions").delete().in("endpoint", expirees);
    }
  } catch { /* never crash the caller */ }
}
