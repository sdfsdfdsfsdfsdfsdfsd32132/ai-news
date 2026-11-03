"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NewsCard from "./NewsCard";
import DetailSheet from "./DetailSheet";
import SettingsSheet from "./SettingsSheet";
import { CATEGORIES, timeAgo, type NewsItem } from "./shared";

type Level = "" | "medium" | "high";
const LEVEL_FILTERS: { key: Level; label: string }[] = [
  { key: "", label: "Любое влияние" },
  { key: "medium", label: "Значимые" },
  { key: "high", label: "Важные 🔥" },
];

type ApiResponse = { items: NewsItem[]; hasMore: boolean; lastRefresh: string | null };

export default function NewsApp() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<Level>("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [pending, setPending] = useState<NewsItem[]>([]);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [bellOn, setBellOn] = useState(false);

  const itemsRef = useRef<NewsItem[]>([]);
  itemsRef.current = items;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const buildUrl = useCallback(
    (before?: string) => {
      const p = new URLSearchParams();
      if (category) p.set("category", category);
      if (level) p.set("level", level);
      if (debouncedQuery) p.set("q", debouncedQuery);
      if (before) p.set("before", before);
      p.set("limit", "20");
      return `/api/news?${p.toString()}`;
    },
    [category, level, debouncedQuery],
  );

  // debounce поиска
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Первая загрузка / смена фильтров
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setPending([]);
      try {
        let res = await fetch(buildUrl());
        let data = (await res.json()) as ApiResponse;
        const noFilters = !category && !level && !debouncedQuery;
        if (data.items.length === 0 && noFilters && !data.lastRefresh) {
          // База пуста — подтягиваем новости первый раз
          await fetch("/api/news/refresh", { method: "POST" }).catch(() => {});
          res = await fetch(buildUrl());
          data = (await res.json()) as ApiResponse;
        }
        if (cancelled) return;
        setItems(data.items);
        setHasMore(data.hasMore);
        setLastRefresh(data.lastRefresh);
      } catch {
        if (!cancelled) setError("Не удалось загрузить новости. Проверьте соединение.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, category, level, debouncedQuery]);

  // Периодический опрос новых новостей
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(buildUrl());
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;
        setLastRefresh(data.lastRefresh);
        const known = new Set(itemsRef.current.map((i) => i.id));
        const fresh = data.items.filter((i) => !known.has(i.id));
        if (itemsRef.current.length > 0) setPending(fresh);
      } catch {
        /* офлайн — молча */
      }
    };
    const id = setInterval(tick, 60_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [buildUrl]);

  // Бесконечная прокрутка
  const loadMore = useCallback(async () => {
    const last = itemsRef.current[itemsRef.current.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(last.publishedAt));
      const data = (await res.json()) as ApiResponse;
      setItems((prev) => {
        const ids = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !ids.has(i.id))];
      });
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, items.length]);

  // Service worker, install prompt, открытие новости по ссылке/пушу
  const openById = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/news/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { item: NewsItem };
      setSelected(data.item);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "open-url") {
          const m = String(e.data.url).match(/news=(\d+)/);
          if (m) openById(Number(m[1]));
        }
      };
      navigator.serviceWorker.addEventListener("message", onMsg);
      const onBip = (e: Event) => {
        e.preventDefault();
        (window as unknown as { __bip?: Event }).__bip = e;
      };
      window.addEventListener("beforeinstallprompt", onBip);

      const params = new URLSearchParams(window.location.search);
      const id = params.get("news");
      if (id) openById(Number(id));
      const lvl = params.get("level");
      if (lvl === "high") setLevel("high");

      if ("PushManager" in window) {
        navigator.serviceWorker.ready
          .then((reg) => reg.pushManager.getSubscription())
          .then((s) => setBellOn(Boolean(s)))
          .catch(() => {});
      }
      return () => {
        navigator.serviceWorker.removeEventListener("message", onMsg);
        window.removeEventListener("beforeinstallprompt", onBip);
      };
    }
  }, [openById]);

  function closeDetail() {
    setSelected(null);
    if (window.location.search.includes("news=")) {
      window.history.replaceState(null, "", "/");
    }
  }

  async function manualRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch("/api/news/refresh", { method: "POST" });
      const res = await fetch(buildUrl());
      const data = (await res.json()) as ApiResponse;
      const known = new Set(itemsRef.current.map((i) => i.id));
      const fresh = data.items.filter((i) => !known.has(i.id));
      setItems(data.items);
      setHasMore(data.hasMore);
      setLastRefresh(data.lastRefresh);
      setPending([]);
      setNewIds(new Set(fresh.map((i) => i.id)));
    } catch {
      setError("Не удалось обновить ленту");
    } finally {
      setRefreshing(false);
    }
  }

  function showPending() {
    setNewIds(new Set(pending.map((i) => i.id)));
    setItems((prev) => {
      const ids = new Set(prev.map((i) => i.id));
      return [...pending.filter((i) => !ids.has(i.id)), ...prev].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    });
    setPending([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
      active ? "bg-indigo-500 text-white shadow shadow-indigo-500/30" : "bg-slate-800/80 text-slate-300"
    }`;

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0b1020]/90 pt-[env(safe-area-inset-top)] backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-lg shadow-lg shadow-indigo-500/30">
            🤖
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base leading-tight font-bold text-white">AI &amp; IT Новости</h1>
            <p className="truncate text-[11px] text-slate-400">
              {lastRefresh ? `Обновлено ${timeAgo(lastRefresh)}` : "Обновление ленты…"}
            </p>
          </div>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Поиск"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-lg"
          >
            🔍
          </button>
          <button
            onClick={manualRefresh}
            aria-label="Обновить"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-lg"
          >
            <span className={refreshing ? "animate-spin" : ""}>⟳</span>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Уведомления и настройки"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-lg"
          >
            🔔
            {bellOn && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />}
          </button>
        </div>

        {searchOpen && (
          <div className="px-4 pb-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по новостям…"
              className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none ring-1 ring-slate-700 focus:ring-indigo-400"
            />
          </div>
        )}

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={chip(category === c.key)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {LEVEL_FILTERS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                level === l.key
                  ? "bg-cyan-400/15 text-cyan-300 ring-cyan-400/50"
                  : "text-slate-400 ring-slate-700"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {pending.length > 0 && (
          <div className="absolute inset-x-0 top-full flex justify-center pt-3">
            <button
              onClick={showPending}
              className="fade-anim rounded-full bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-500/30"
            >
              ↑ Новых: {pending.length}
            </button>
          </div>
        )}
      </header>

      <main className="space-y-4 px-4 pt-4">
        {loading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-900/70" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-500/10 p-4 text-center text-sm text-red-200 ring-1 ring-red-500/30">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <div className="mb-2 text-4xl">🗞️</div>
            <p className="text-sm">Ничего не найдено. Попробуйте изменить фильтры или обновить ленту.</p>
          </div>
        )}

        {!loading &&
          items.map((item) => (
            <NewsCard key={item.id} item={item} isNew={newIds.has(item.id)} onOpen={setSelected} />
          ))}

        {!loading && hasMore && (
          <div ref={sentinelRef} className="py-6 text-center text-xs text-slate-500">
            {loadingMore ? "Загрузка…" : "Ещё новости"}
          </div>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <p className="py-6 text-center text-xs text-slate-600">Это всё на сегодня 👌</p>
        )}
      </main>

      {selected && <DetailSheet item={selected} onClose={closeDetail} />}
      {settingsOpen && (
        <SettingsSheet
          onClose={() => {
            setSettingsOpen(false);
            if ("serviceWorker" in navigator && "PushManager" in window) {
              navigator.serviceWorker.ready
                .then((reg) => reg.pushManager.getSubscription())
                .then((s) => setBellOn(Boolean(s)))
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
