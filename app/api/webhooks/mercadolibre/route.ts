import { NextResponse } from "next/server";
import { processMLWebhook } from "@/lib/sync/mercadolibre";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, resource, user_id } = body;
    if (topic && resource) {
      const resourceId = resource.replace("/orders/v2/", "").replace("/orders/", "");
      await processMLWebhook(topic, resourceId, user_id?.toString());
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
