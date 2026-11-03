import { db } from "@/db";
import { news, pushSubscriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!body.endpoint) return Response.json({ error: "endpoint required" }, { status: 400 });
  const rows = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint))
    .limit(1);
  if (!rows[0]) return Response.json({ error: "subscription not found" }, { status: 404 });

  const top = await db
    .select()
    .from(news)
    .where(eq(news.impactLevel, "high"))
    .orderBy(desc(news.publishedAt))
    .limit(1);
  const ok = await sendPush(rows[0], {
    title: "Уведомления включены ✅",
    body: top[0] ? `Пример: ${top[0].title}` : "Вы будете получать важные новости об ИИ и IT-профессиях.",
    url: top[0] ? `/?news=${top[0].id}` : "/",
    tag: "test",
  });
  return Response.json({ ok });
}
