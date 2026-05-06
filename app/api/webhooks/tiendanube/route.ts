import { NextResponse } from "next/server";
import { processTNWebhook } from "@/lib/sync/tiendanube";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event, store_id, id } = body;
    if (event && store_id && id) {
      await processTNWebhook(event, store_id.toString(), parseInt(id));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
