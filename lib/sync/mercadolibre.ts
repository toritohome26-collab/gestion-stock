import prisma from "@/lib/prisma";

const ML_API = "https://api.mercadolibre.com";

export async function refreshMLToken(integration: any) {
  const res = await fetch(`${ML_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ML_APP_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      refresh_token: integration.refreshToken,
    }),
  });
  if (!res.ok) throw new Error("Error al refrescar token de ML");
  const data = await res.json();
  return prisma.integration.update({
    where: { platform: "MERCADOLIBRE" },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
}

export async function syncMLOrders(): Promise<number> {
  const integration = await prisma.integration.findUnique({ where: { platform: "MERCADOLIBRE" } });
  if (!integration?.isActive || !integration.accessToken) return 0;

  if (integration.expiresAt && integration.expiresAt < new Date()) {
    await refreshMLToken(integration);
    const refreshed = await prisma.integration.findUnique({ where: { platform: "MERCADOLIBRE" } });
    if (refreshed) Object.assign(integration, refreshed);
  }

  const sinceDate = integration.lastSync
    ? integration.lastSync.toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const sellerRes = await fetch(`${ML_API}/users/me`, {
    headers: { Authorization: `Bearer ${integration.accessToken}` },
  });
  if (!sellerRes.ok) throw new Error("Error al obtener usuario ML");
  const seller = await sellerRes.json();

  const ordersRes = await fetch(
    `${ML_API}/orders/search?seller=${seller.id}&sort=date_asc&order.date_created.from=${sinceDate}&limit=50`,
    { headers: { Authorization: `Bearer ${integration.accessToken}` } }
  );
  if (!ordersRes.ok) throw new Error("Error al obtener órdenes ML");
  const ordersData = await ordersRes.json();
  const orders = ordersData.results || [];

  let newCount = 0;
  for (const order of orders) {
    const externalId = `ML-${order.id}`;
    const existing = await prisma.sale.findUnique({ where: { externalId } });
    if (existing) continue;

    const items = (order.order_items || []).map((item: any) => ({
      productName: item.item?.title || "Producto ML",
      sku: item.item?.seller_sku || item.item?.id?.toString() || "",
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.unit_price * item.quantity,
    }));

    const subtotal = items.reduce((acc: number, i: any) => acc + i.total, 0);
    const commission = order.payments?.[0]?.marketplace_fee || subtotal * 0.18;

    await prisma.sale.create({
      data: {
        channel: "MERCADOLIBRE",
        externalId,
        externalOrderId: order.id.toString(),
        status: mapMLStatus(order.status),
        buyerName: order.buyer?.nickname || null,
        subtotal,
        commission,
        shipping: order.shipping?.cost || 0,
        discount: 0,
        total: subtotal,
        netAmount: subtotal - commission,
        currency: order.currency_id || "ARS",
        syncedAt: new Date(),
        items: {
          create: items.map((item: any) => {
            const product = null;
            return {
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            };
          }),
        },
      },
    });

    for (const item of items) {
      if (!item.sku) continue;
      const product = await prisma.product.findFirst({
        where: { OR: [{ sku: item.sku }, { name: { contains: item.productName } }], isActive: true },
      });
      if (product) {
        await prisma.saleItem.updateMany({
          where: { sku: item.sku, productId: null },
          data: { productId: product.id },
        });
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            type: "OUT",
            quantity: item.quantity,
            reason: `Venta ML #${order.id}`,
            referenceId: externalId,
            referenceType: "SALE",
          },
        });
      }
    }

    newCount++;
  }

  await prisma.integration.update({
    where: { platform: "MERCADOLIBRE" },
    data: { lastSync: new Date() },
  });

  return newCount;
}

function mapMLStatus(status: string) {
  const map: Record<string, string> = {
    confirmed: "confirmed", payment_required: "pending", payment_in_process: "pending",
    paid: "paid", cancelled: "cancelled", invalid: "cancelled",
  };
  return map[status] || "pending";
}

export async function processMLWebhook(topic: string, resourceId: string) {
  const integration = await prisma.integration.findUnique({ where: { platform: "MERCADOLIBRE" } });
  if (!integration?.isActive || !integration.accessToken) return;

  if (topic !== "orders_v2" && topic !== "orders") return;

  const externalId = `ML-${resourceId}`;
  const existing = await prisma.sale.findUnique({ where: { externalId } });
  if (existing) return;

  const orderRes = await fetch(`${ML_API}/orders/${resourceId}`, {
    headers: { Authorization: `Bearer ${integration.accessToken}` },
  });
  if (!orderRes.ok) return;
  const order = await orderRes.json();

  const items = (order.order_items || []).map((item: any) => ({
    productName: item.item?.title || "Producto ML",
    sku: item.item?.seller_sku || item.item?.id?.toString() || "",
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.unit_price * item.quantity,
  }));

  const subtotal = items.reduce((acc: number, i: any) => acc + i.total, 0);
  const commission = subtotal * 0.18;

  const sale = await prisma.sale.create({
    data: {
      channel: "MERCADOLIBRE",
      externalId,
      externalOrderId: order.id.toString(),
      status: mapMLStatus(order.status),
      buyerName: order.buyer?.nickname || null,
      subtotal,
      commission,
      shipping: order.shipping?.cost || 0,
      total: subtotal,
      netAmount: subtotal - commission,
      currency: order.currency_id || "ARS",
      syncedAt: new Date(),
      items: { create: items },
    },
  });

  for (const item of items) {
    if (!item.sku) continue;
    const product = await prisma.product.findFirst({
      where: { sku: item.sku, isActive: true },
    });
    if (product) {
      await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity } } });
      await prisma.stockMovement.create({
        data: {
          productId: product.id, type: "OUT", quantity: item.quantity,
          reason: `Webhook ML #${order.id}`, referenceId: externalId, referenceType: "SALE",
        },
      });
    }
  }
}
