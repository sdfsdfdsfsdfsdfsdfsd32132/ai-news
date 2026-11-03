"use client";

import { useCallback, useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "./shared";

type Level = "all" | "medium" | "high";
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const LEVELS: { key: Level; title: string; hint: string }[] = [
  { key: "all", title: "Все новости", hint: "Каждая новая публикация" },
  { key: "medium", title: "Значимые", hint: "Среднее и высокое влияние" },
  { key: "high", title: "Только важное", hint: "Высокое влияние на индустрию" },
];

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [level, setLevel] = useState<Level>("medium");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(false);

  const getSub = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }, []);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const saved = localStorage.getItem("pushLevel") as Level | null;
    if (saved) setLevel(saved);
    if (ok) {
      setPermission(Notification.permission);
      getSub().then((s) => setSubscribed(Boolean(s)));
    }
    const w = window as unknown as { __bip?: BIPEvent };
    if (w.__bip) setInstallEvt(w.__bip);
    const handler = (e: Event) => {
      e.preventDefault();
      w.__bip = e as BIPEvent;
      setInstallEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [getSub]);

  async function save(sub: PushSubscription, lvl: Level) {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), minLevel: lvl }),
    });
    if (!res.ok) throw new Error("Не удалось сохранить подписку");
  }

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMsg("Разрешение на уведомления не выдано. Включите его в настройках браузера.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { publicKey } = (await (await fetch("/api/push/key")).json()) as { publicKey: string };
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await save(sub, level);
      setSubscribed(true);
      setMsg("Готово! Уведомления включены.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка подключения уведомлений");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await getSub();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Уведомления отключены.");
    } finally {
      setBusy(false);
    }
  }

  async function changeLevel(l: Level) {
    setLevel(l);
    localStorage.setItem("pushLevel", l);
    if (subscribed) {
      const sub = await getSub();
      if (sub) await save(sub, l).catch(() => {});
    }
  }

  async function sendTest() {
    setBusy(true);
    setMsg(null);
    try {
      const sub = await getSub();
      if (!sub) return;
      await save(sub, level);
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      const data = (await res.json()) as { ok?: boolean };
      setMsg(data.ok ? "Тестовое уведомление отправлено." : "Не удалось отправить уведомление.");
    } finally {
      setBusy(false);
    }
  }

  async function install() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="fade-anim absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="sheet-anim relative z-10 max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-t border-slate-700 bg-slate-900 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Настройки</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-300"
          >
            ✕
          </button>
        </div>

        <section className="space-y-3 rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white">🔔 Push-уведомления</h3>
              <p className="text-xs text-slate-400">
                {subscribed ? "Включены на этом устройстве" : "Узнавайте о важных событиях первыми"}
              </p>
            </div>
            {supported &&
              (subscribed ? (
                <button
                  disabled={busy}
                  onClick={disable}
                  className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 disabled:opacity-50"
                >
                  Выключить
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={enable}
                  className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Включить
                </button>
              ))}
          </div>

          {!supported && (
            <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
              Ваш браузер не поддерживает push-уведомления. На Android откройте приложение в Chrome.
            </p>
          )}
          {permission === "denied" && (
            <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-200">
              Уведомления заблокированы. Разрешите их в настройках сайта в браузере.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">О чём уведомлять</p>
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => changeLevel(l.key)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ring-1 transition ${
                  level === l.key
                    ? "bg-indigo-500/15 ring-indigo-400/50"
                    : "bg-slate-900 ring-slate-800"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium text-white">{l.title}</span>
                  <span className="block text-xs text-slate-400">{l.hint}</span>
                </span>
                <span
                  className={`h-4 w-4 rounded-full ring-2 ${
                    level === l.key ? "bg-indigo-400 ring-indigo-300" : "ring-slate-600"
                  }`}
                />
              </button>
            ))}
          </div>

          {subscribed && (
            <button
              disabled={busy}
              onClick={sendTest}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-100 disabled:opacity-50"
            >
              Отправить тестовое уведомление
            </button>
          )}
          {msg && <p className="text-center text-xs text-cyan-300">{msg}</p>}
        </section>

        <section className="mt-4 space-y-2 rounded-2xl bg-slate-950/60 p-4 ring-1 ring-slate-800">
          <h3 className="font-semibold text-white">📱 Приложение на Android</h3>
          {standalone ? (
            <p className="text-xs text-slate-400">Приложение установлено и запущено в полноэкранном режиме.</p>
          ) : installEvt ? (
            <button
              onClick={install}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-sm font-semibold text-white"
            >
              Установить на главный экран
            </button>
          ) : (
            <p className="text-xs leading-relaxed text-slate-400">
              В Chrome откройте меню ⋮ → «Установить приложение» (или «Добавить на главный экран»).
              Иконка появится на рабочем столе, а новости будут открываться как в обычном приложении.
            </p>
          )}
        </section>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Источники: Хабр, vc.ru, 3DNews, CNews, Tproger, OpenNet. Лента обновляется каждые 10 минут.
        </p>
      </div>
    </div>
  );
}
