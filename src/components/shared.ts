export type NewsItem = {
  id: number;
  url: string;
  title: string;
  summary: string;
  source: string;
  imageUrl: string | null;
  publishedAt: string;
  category: "ai" | "careers" | "dev" | "security";
  impactLevel: "high" | "medium" | "low";
  impactScore: number;
  direction: "positive" | "negative" | "mixed" | "neutral";
  analysisSummary: string;
  analysisJobs: string;
  analysisAdvice: string;
  professions: string[];
  analysisMethod: string;
};

export const CATEGORIES = [
  { key: "", label: "Все" },
  { key: "ai", label: "ИИ" },
  { key: "careers", label: "Профессии" },
  { key: "dev", label: "Разработка" },
  { key: "security", label: "Безопасность" },
] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  ai: "ИИ",
  careers: "Профессии",
  dev: "Разработка",
  security: "Безопасность",
};

export const LEVEL_LABEL = { high: "Высокое", medium: "Среднее", low: "Низкое" } as const;

export const LEVEL_STYLE = {
  high: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  low: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
} as const;

export const LEVEL_DOT = {
  high: "bg-rose-400",
  medium: "bg-amber-400",
  low: "bg-slate-400",
} as const;

export const DIRECTION_LABEL = {
  positive: "Возможности",
  negative: "Риски",
  mixed: "Неоднозначно",
  neutral: "Нейтрально",
} as const;

export const DIRECTION_STYLE = {
  positive: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  negative: "bg-red-500/15 text-red-300 ring-red-500/30",
  mixed: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  neutral: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
} as const;

export const DIRECTION_ICON = {
  positive: "↗",
  negative: "↘",
  mixed: "⇅",
  neutral: "→",
} as const;

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн назад`;
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
