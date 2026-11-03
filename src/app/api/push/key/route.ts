import { getVapid } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const { publicKey } = await getVapid();
  return Response.json({ publicKey });
}
