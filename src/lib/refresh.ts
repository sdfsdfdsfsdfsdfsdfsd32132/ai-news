import { db } from "@/db";
import { news, pushSubscriptions } from "@/db/schema";
import { gte, inArray, lt } from "drizzle-orm";
import { FEEDS, fetchFeed, type RawItem } from "./feeds";
import { analyzeByRules, analyzeWithLlm, isRelevant, shortImpact, CATEGORY_LABEL } from "./analysis";
import { sendPush, type SubRow } from "./push";
import { setSetting } from "./settings";

type RefreshResult = {
  fetched: number;
  inserted: number;
  pushed: number;
  errors: string[];
};

const g = globalThis as typeof globalThis & {
  __refreshPromise?: Promise<RefreshResult> | null;
  __lastRefreshAt?: number;
};

const LEVEL_RANK = { low: 0, medium: 1, high: 2 } as const;
const MIN_RANK = { all: 0, medium: 1, high: 2 } as const;
const LEVEL_RU = { high: "Высокое", medium: "Среднее", low: "Низкое" } as const;

const normTitle = (t: string) => t.toLowerCase().replace(/[^\p{L}\d]+/gu, " ").trim();

export function lastRefreshAt(): number {
  return g.__lastRefreshAt ?? 0;
}

export function refreshNews(): Promise<RefreshResult> {
  if (g.__refreshPromise) return g.__refreshPromise;
  g.__refreshPromise = doRefresh().finally(() => {
    g.__refreshPromise = null;
  });
  return g.__refreshPromise;
}

async function doRefresh(): Promise<RefreshResult> {
  const errors: string[] = [];
  g.__lastRefreshAt = Date.now();

  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));
  type Candidate = RawItem & { source: string; mode: "all" | "it" | "general"; fallback?: (typeof FEEDS)[number]["category"] };
  const candidates: Candidate[] = [];
  let fetched = 0;
  results.forEach((r, i) => {
    const feed = FEEDS[i];
    if (r.status === "fulfilled") {
      fetched += r.value.length;
      for (const it of r.value) {
        if (isRelevant(it.title, it.text, feed.mode)) {
          candidates.push({ ...it, source: feed.name, mode: feed.mode, fallback: feed.category });
        }
      }
    } else {
      errors.push(String(r.reason?.message ?? r.reason));
    }
  });

  // Дедупликация внутри пачки (по url и заголовку)
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const unique = candidates.filter((c) => {
    const nt = normTitle(c.title);
    if (seenUrl.has(c.url) || seenTitle.has(nt)) return false;
    seenUrl.add(c.url);
    seenTitle.add(nt);
    return true;
  });

  if (unique.length === 0) {
    await setSetting("last_refresh", new Date().toISOString());
    return { fetched, inserted: 0, pushed: 0, errors };
  }

  // Уже сохранённые
  const existingUrls = new Set<string>();
  const urls = unique.map((u) => u.url);
  for (let i = 0; i < urls.length; i += 200) {
    const rows = await db
      .select({ url: news.url })
      .from(news)
      .where(inArray(news.url, urls.slice(i, i + 200)));
    rows.forEach((r) => existingUrls.add(r.url));
  }
  const recent = await db
    .select({ title: news.title })
    .from(news)
    .where(gte(news.publishedAt, new Date(Date.now() - 8 * 24 * 3600 * 1000)));
  const existingTitles = new Set(recent.map((r) => normTitle(r.title)));

  const fresh = unique
    .filter((u) => !existingUrls.has(u.url) && !existingTitles.has(normTitle(u.title)))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  // Анализ. LLM (если настроен) — только для самых свежих
  const llmEnabled = Boolean(process.env.OPENAI_API_KEY);
  const toInsert: (typeof news.$inferInsert)[] = [];
  for (let i = 0; i < fresh.length; i++) {
    const c = fresh[i];
    let a = analyzeByRules(c.title, c.text, c.fallback);
    if (llmEnabled && i < 20) a = await analyzeWithLlm(c.title, c.text, a);
    toInsert.push({
      url: c.url,
      title: c.title,
      summary: c.text,
      source: c.source,
      imageUrl: c.imageUrl,
      publishedAt: c.publishedAt,
      category: a.category,
      impactLevel: a.impactLevel,
      impactScore: a.impactScore,
      direction: a.direction,
      analysisSummary: a.analysisSummary,
      analysisJobs: a.analysisJobs,
      analysisAdvice: a.analysisAdvice,
      professions: a.professions,
      analysisMethod: a.analysisMethod,
    });
  }

  let inserted: (typeof news.$inferSelect)[] = [];
  for (let i = 0; i < toInsert.length; i += 50) {
    const rows = await db
      .insert(news)
      .values(toInsert.slice(i, i + 50))
      .onConflictDoNothing({ target: news.url })
      .returning();
    inserted = inserted.concat(rows);
  }

  // Чистка старых новостей
  await db.delete(news).where(lt(news.publishedAt, new Date(Date.now() - 30 * 24 * 3600 * 1000)));
  await setSetting("last_refresh", new Date().toISOString());

  const pushed = await notifySubscribers(inserted);
  return { fetched, inserted: inserted.length, pushed, errors };
}

async function notifySubscribers(inserted: (typeof news.$inferSelect)[]): Promise<number> {
  // Уведомляем только о действительно свежих новостях (не старше 12 часов)
  const cutoff = Date.now() - 12 * 3600 * 1000;
  const hot = inserted
    .filter((n) => n.publishedAt.getTime() >= cutoff)
    .sort((a, b) => b.impactScore - a.impactScore);
  if (hot.length === 0) return 0;

  const subs: SubRow[] = await db.select().from(pushSubscriptions);
  let sent = 0;
  for (const sub of subs) {
    if (!sub.active) continue;
    const min = MIN_RANK[sub.minLevel as keyof typeof MIN_RANK] ?? 1;
    const mine = hot.filter((n) => LEVEL_RANK[n.impactLevel as keyof typeof LEVEL_RANK] >= min);
    if (mine.length === 0) continue;
    const top = mine.slice(0, 3);
    for (const n of top) {
      const ok = await sendPush(sub, {
        title: `${CATEGORY_LABEL[n.category as keyof typeof CATEGORY_LABEL] ?? "Новости"} · влияние: ${LEVEL_RU[n.impactLevel as keyof typeof LEVEL_RU].toLowerCase()}`,
        body: `${n.title}\n${shortImpact(n)}`.slice(0, 280),
        url: `/?news=${n.id}`,
        tag: `news-${n.id}`,
      });
      if (ok) sent++;
    }
    if (mine.length > top.length) {
      await sendPush(sub, {
        title: "AI & IT Новости",
        body: `И ещё ${mine.length - top.length} новых материалов с анализом влияния`,
        url: "/",
        tag: "news-digest",
      });
    }
  }
  return sent;
}
