import { NextResponse } from "next/server";
import { processMLWebhook } from "@/lib/sync/mercadolibre";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, resource } = body;
    if (topic && resource) {
      const resourceId = resource.replace("/orders/v2/", "").replace("/orders/", "");
      await processMLWebhook(topic, resourceId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
