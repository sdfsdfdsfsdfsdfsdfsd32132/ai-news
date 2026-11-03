"use client";

import { CATEGORY_LABEL, timeAgo, type NewsItem } from "./shared";
import { ImpactBadges } from "./NewsCard";

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
      <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-white">
        <span>{icon}</span>
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-slate-300">{children}</p>
    </section>
  );
}

export default function DetailSheet({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const jobsText = item.analysisJobs;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fade-anim absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet-anim relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl border-t border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-700" />
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute top-3 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-medium text-indigo-300">
              {CATEGORY_LABEL[item.category]}
            </span>
            <span>{item.source}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </div>
          <h2 className="text-xl leading-snug font-bold text-white">{item.title}</h2>
          {item.summary && <p className="text-sm leading-relaxed text-slate-400">{item.summary}</p>}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-wider text-cyan-300 uppercase">
                Анализ влияния на индустрию
              </h3>
              <span className="text-[10px] text-slate-500">
                {item.analysisMethod === "llm" ? "ИИ-анализ" : "Экспертные правила"}
              </span>
            </div>
            <ImpactBadges item={item} />
            <Section icon="🏭" title="Что это значит для индустрии">
              {item.analysisSummary}
            </Section>
            <Section icon="👩‍💻" title="Влияние на профессии">
              {jobsText}
            </Section>
            {item.professions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.professions.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-slate-700"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
            <Section icon="🎯" title="Что делать специалистам">
              {item.analysisAdvice}
            </Section>
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 active:opacity-90"
          >
            Читать оригинал · {item.source} ↗
          </a>
        </div>
      </div>
    </div>
  );
}
