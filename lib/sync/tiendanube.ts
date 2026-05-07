import prisma from "@/lib/prisma";

const TN_API = "https://api.tiendanube.com/v1";

export async function syncTNOrders(orgId: string): Promise<number> {
  const integration = await prisma.integration.findFirst({
    where: { platform: "TIENDANUBE", organizationId: orgId, isActive: true },
  });
  if (!integration?.accessToken || !integration.shopId) return 0;

  const sinceDate = integration.lastSync
    ? integration.lastSync.toISOString()
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `${TN_API}/${integration.shopId}/orders?created_at_min=${sinceDate}&per_page=50`,
    {
      headers: {
        Authentication: `bearer ${integration.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": "GestionStock/1.0",
      },
    }
  );
  if (!res.ok) throw new Error("Error al obtener órdenes Tiendanube");
  const orders = await res.json();

  let newCount = 0;
  for (const order of orders) {
    const externalId = `TN-${order.id}`;
    const existing = await prisma.sale.findFirst({ where: { externalId, organizationId: orgId } });
    if (existing) continue;

    const items = (order.products || []).map((item: any) => ({
      productName: item.name,
      sku: item.sku || item.product_id?.toString() || "",
      quantity: item.quantity,
      unitPrice: parseFloat(item.price),
      total: parseFloat(item.price) * item.quantity,
    }));

    const subtotal = items.reduce((acc: number, i: any) => acc + i.total, 0);
    const discount = parseFloat(order.discount) || 0;
    const shipping = parseFloat(order.shipping_cost_owner) || 0;
    const total = subtotal - discount + shipping;

    await prisma.sale.create({
      data: {
        organizationId: orgId,
        channel: "TIENDANUBE",
        externalId,
        externalOrderId: order.id.toString(),
        status: mapTNStatus(order.payment_status),
        buyerName: order.contact_name || null,
        buyerEmail: order.contact_email || null,
        subtotal,
        discount,
        shipping,
        commission: 0,
        total,
        netAmount: total,
        currency: order.currency || "ARS",
        syncedAt: new Date(),
        items: { create: items },
      },
    });

    for (const item of items) {
      if (!item.sku) continue;
      const product = await prisma.product.findFirst({ where: { sku: item.sku, organizationId: orgId, isActive: true } });
      if (product) {
        await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity } } });
        await prisma.stockMovement.create({
          data: {
            organizationId: orgId,
            productId: product.id,
            type: "OUT",
            quantity: item.quantity,
            reason: `Venta TN #${order.id}`,
            referenceId: externalId,
            referenceType: "SALE",
          },
        });
      }
    }

    newCount++;
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSync: new Date() },
  });

  return newCount;
}

function mapTNStatus(status: string) {
  const map: Record<string, string> = {
    pending: "pending", authorized: "confirmed", paid: "paid",
    refunded: "cancelled", voided: "cancelled",
  };
  return map[status] || "pending";
}

export async function processTNWebhook(event: string, storeId: string, orderId: number) {
  if (!event.startsWith("order/")) return;

  const integration = await prisma.integration.findFirst({
    where: { platform: "TIENDANUBE", shopId: storeId, isActive: true },
  });
  if (!integration?.accessToken) return;

  const orgId = integration.organizationId;
  const externalId = `TN-${orderId}`;
  const existing = await prisma.sale.findFirst({ where: { externalId, organizationId: orgId } });
  if (existing) return;

  const res = await fetch(`${TN_API}/${storeId}/orders/${orderId}`, {
    headers: {
      Authentication: `bearer ${integration.accessToken}`,
      "User-Agent": "GestionStock/1.0",
    },
  });
  if (!res.ok) return;
  const order = await res.json();

  const items = (order.products || []).map((item: any) => ({
    productName: item.name,
    sku: item.sku || item.product_id?.toString() || "",
    quantity: item.quantity,
    unitPrice: parseFloat(item.price),
    total: parseFloat(item.price) * item.quantity,
  }));

  const subtotal = items.reduce((acc: number, i: any) => acc + i.total, 0);
  const discount = parseFloat(order.discount) || 0;
  const shipping = parseFloat(order.shipping_cost_owner) || 0;
  const total = subtotal - discount + shipping;

  await prisma.sale.create({
    data: {
      organizationId: orgId,
      channel: "TIENDANUBE",
      externalId,
      externalOrderId: orderId.toString(),
      status: mapTNStatus(order.payment_status),
      buyerName: order.contact_name || null,
      subtotal, discount, shipping, commission: 0, total, netAmount: total,
      currency: order.currency || "ARS",
      syncedAt: new Date(),
      items: { create: items },
    },
  });

  for (const item of items) {
    if (!item.sku) continue;
    const product = await prisma.product.findFirst({ where: { sku: item.sku, organizationId: orgId, isActive: true } });
    if (product) {
      await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity } } });
      await prisma.stockMovement.create({
        data: {
          organizationId: orgId,
          productId: product.id,
          type: "OUT",
          quantity: item.quantity,
          reason: `Webhook TN #${orderId}`,
          referenceId: externalId,
          referenceType: "SALE",
        },
      });
    }
  }
}
