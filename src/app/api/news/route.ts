import { db } from "@/db";
import { news } from "@/db/schema";
import { and, desc, eq, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { lastRefreshAt, refreshNews } from "@/lib/refresh";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const level = url.searchParams.get("level");
  const q = url.searchParams.get("q")?.trim();
  const before = url.searchParams.get("before");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);

  // Ленивое обновление, если планировщик давно не запускался
  if (Date.now() - lastRefreshAt() > 10 * 60 * 1000) {
    refreshNews().catch(() => {});
  }

  const conds: SQL[] = [];
  if (category && ["ai", "careers", "dev", "security"].includes(category)) {
    conds.push(eq(news.category, category));
  }
  if (level === "high") conds.push(eq(news.impactLevel, "high"));
  if (level === "medium") conds.push(inArray(news.impactLevel, ["high", "medium"]));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const c = or(ilike(news.title, like), ilike(news.summary, like));
    if (c) conds.push(c);
  }
  if (before) {
    const d = new Date(before);
    if (!isNaN(d.getTime())) conds.push(lt(news.publishedAt, d));
  }

  const rows = await db
    .select()
    .from(news)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(news.publishedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  const lastRefresh = await getSetting("last_refresh");
  return Response.json({ items, hasMore, lastRefresh });
}
