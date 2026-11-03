import { db } from "@/db";
import { news } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n)) return Response.json({ error: "bad id" }, { status: 400 });
  const rows = await db.select().from(news).where(eq(news.id, n)).limit(1);
  if (!rows[0]) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ item: rows[0] });
}
