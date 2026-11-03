"use client";

import {
  CATEGORY_LABEL,
  DIRECTION_ICON,
  DIRECTION_LABEL,
  DIRECTION_STYLE,
  LEVEL_DOT,
  LEVEL_LABEL,
  LEVEL_STYLE,
  timeAgo,
  type NewsItem,
} from "./shared";

export function ImpactBadges({ item }: { item: NewsItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${LEVEL_STYLE[item.impactLevel]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${LEVEL_DOT[item.impactLevel]}`} />
        Влияние: {LEVEL_LABEL[item.impactLevel].toLowerCase()}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${DIRECTION_STYLE[item.direction]}`}
      >
        {DIRECTION_ICON[item.direction]} {DIRECTION_LABEL[item.direction]}
      </span>
    </div>
  );
}

export default function NewsCard({
  item,
  isNew,
  onOpen,
}: {
  item: NewsItem;
  isNew?: boolean;
  onOpen: (item: NewsItem) => void;
}) {
  const firstJobs = item.analysisJobs.split(". ")[0];
  return (
    <article
      onClick={() => onOpen(item)}
      className={`fade-anim cursor-pointer overflow-hidden rounded-2xl border bg-slate-900/70 shadow-lg shadow-black/20 transition active:scale-[0.99] ${
        item.impactLevel === "high" ? "border-rose-500/30" : "border-slate-800"
      }`}
    >
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-40 w-full object-cover"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-medium text-indigo-300">
            {CATEGORY_LABEL[item.category]}
          </span>
          <span className="truncate">{item.source}</span>
          <span>·</span>
          <span className="whitespace-nowrap">{timeAgo(item.publishedAt)}</span>
          {isNew && (
            <span className="ml-auto rounded-full bg-cyan-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">
              NEW
            </span>
          )}
        </div>

        <h2 className="text-[17px] leading-snug font-semibold text-white">{item.title}</h2>
        {item.summary && (
          <p className="clamp-3 text-sm leading-relaxed text-slate-400">{item.summary}</p>
        )}

        <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-cyan-300 uppercase">
              Анализ влияния
            </span>
          </div>
          <ImpactBadges item={item} />
          <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{firstJobs}.</p>
          <p className="mt-1.5 text-xs font-medium text-indigo-300">Читать анализ полностью →</p>
        </div>
      </div>
    </article>
  );
}
