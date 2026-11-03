import { refreshNews } from "./refresh";

const g = globalThis as typeof globalThis & { __schedulerStarted?: boolean };

export function startScheduler() {
  if (g.__schedulerStarted) return;
  g.__schedulerStarted = true;
  const run = () => {
    refreshNews().catch((e) => console.error("[news] refresh failed", e));
  };
  setTimeout(run, 15_000);
  setInterval(run, 10 * 60 * 1000);
}
