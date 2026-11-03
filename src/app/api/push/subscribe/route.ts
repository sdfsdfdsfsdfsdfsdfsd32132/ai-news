import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  minLevel?: string;
  endpoint?: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ error: "invalid subscription" }, { status: 400 });
  }
  const minLevel = ["all", "medium", "high"].includes(body.minLevel ?? "") ? body.minLevel! : "medium";
  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      minLevel,
      active: true,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, minLevel, active: true },
    });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.endpoint) return Response.json({ error: "endpoint required" }, { status: 400 });
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, body.endpoint));
  return Response.json({ ok: true });
}
