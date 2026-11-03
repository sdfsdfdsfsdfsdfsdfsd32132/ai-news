import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSetting, setSetting } from "./settings";

type Vapid = { publicKey: string; privateKey: string };

const g = globalThis as typeof globalThis & { __vapid?: Vapid };

export async function getVapid(): Promise<Vapid> {
  if (g.__vapid) return g.__vapid;
  let publicKey = process.env.VAPID_PUBLIC_KEY ?? (await getSetting("vapid_public"));
  let privateKey = process.env.VAPID_PRIVATE_KEY ?? (await getSetting("vapid_private"));
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    await setSetting("vapid_public", publicKey);
    await setSetting("vapid_private", privateKey);
  }
  g.__vapid = { publicKey, privateKey };
  return g.__vapid;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export type SubRow = typeof pushSubscriptions.$inferSelect;

export async function sendPush(sub: SubRow, payload: PushPayload): Promise<boolean> {
  const vapid = await getVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      {
        TTL: 6 * 3600,
        urgency: "normal",
        vapidDetails: {
          subject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
          publicKey: vapid.publicKey,
          privateKey: vapid.privateKey,
        },
      },
    );
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
    return false;
  }
}
