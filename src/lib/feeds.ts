import { XMLParser } from "fast-xml-parser";
import type { Category } from "./analysis";

export type FeedConfig = {
  name: string;
  url: string;
  // all — вся лента тематическая, it — IT-лента, general — общая лента (фильтруем строго)
  mode: "all" | "it" | "general";
  category?: Category;
};

export const FEEDS: FeedConfig[] = [
  { name: "Хабр · ИИ", url: "https://habr.com/ru/rss/hub/artificial_intelligence/all/", mode: "all", category: "ai" },
  { name: "Хабр · Карьера", url: "https://habr.com/ru/rss/hub/career/all/", mode: "all", category: "careers" },
  { name: "Хабр Новости", url: "https://habr.com/ru/rss/news/", mode: "it" },
  { name: "Tproger", url: "https://tproger.ru/feed", mode: "it" },
  { name: "OpenNet", url: "https://www.opennet.ru/opennews/opennews_all.rss", mode: "it" },
  { name: "vc.ru", url: "https://vc.ru/rss", mode: "general" },
  { name: "3DNews", url: "https://3dnews.ru/news/rss/", mode: "general" },
  { name: "CNews", url: "https://www.cnews.ru/inc/rss/news.xml", mode: "general" },
];

export type RawItem = {
  url: string;
  title: string;
  text: string;
  imageUrl: string | null;
  publishedAt: Date;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: true,
});

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&laquo;": "«",
  "&raquo;": "»",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

export function cleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? " ")
    .replace(/Читать далее|Читать дальше|Комментарии\s*\d*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return o["#text"];
  }
  return "";
}

function firstImage(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

export async function fetchFeed(feed: FeedConfig, maxAgeDays = 7): Promise<RawItem[]> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AINewsRu/1.0)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${feed.name}: HTTP ${res.status}`);
  const xml = await res.text();
  const doc = parser.parse(xml);
  const items = asArray<Record<string, unknown>>(doc?.rss?.channel?.item);
  const minTime = Date.now() - maxAgeDays * 24 * 3600 * 1000;
  const out: RawItem[] = [];

  for (const it of items.slice(0, 60)) {
    const url = str(it.link).trim() || str(it.guid).trim();
    const title = cleanText(str(it.title));
    if (!url || !title || !/^https?:\/\//.test(url)) continue;
    const published = new Date(str(it.pubDate) || str(it["dc:date"]) || Date.now());
    const publishedAt = isNaN(published.getTime()) ? new Date() : published;
    if (publishedAt.getTime() < minTime) continue;

    const rawDesc = str(it["content:encoded"]) || str(it.description);
    const text = cleanText(rawDesc).slice(0, 4000);

    let imageUrl: string | null = null;
    const enclosure = it.enclosure as Record<string, string> | undefined;
    if (enclosure?.["@_url"] && /image|\.(jpe?g|png|webp)/i.test(`${enclosure["@_type"] ?? ""}${enclosure["@_url"]}`)) {
      imageUrl = enclosure["@_url"];
    }
    if (!imageUrl) {
      const media = asArray<Record<string, string>>(it["media:content"] as never)[0];
      if (media?.["@_url"]) imageUrl = media["@_url"];
    }
    if (!imageUrl) imageUrl = firstImage(rawDesc) ?? firstImage(str(it.description));
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) imageUrl = null;

    out.push({ url, title, text, imageUrl, publishedAt });
  }
  return out;
}
