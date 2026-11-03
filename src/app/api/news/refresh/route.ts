import { refreshNews } from "@/lib/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle() {
  try {
    const result = await refreshNews();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ ok: false, error: String((e as Error).message) }, { status: 500 });
  }
}

export const POST = handle;
export const GET = handle;
