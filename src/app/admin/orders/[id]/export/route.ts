import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const HEADERS = [
  "id",
  "orderNumber",
  "email",
  "customerName",
  "phone",
  "city",
  "line1",
  "comment",
  "status",
  "paymentStatus",
  "fulfillmentStatus",
  "totalAmount",
  "currency",
  "trackingNumber",
  "stripeSessionId",
  "stripePaymentIntentId",
  "createdAt",
  "productName",
  "quantity",
  "price",
  "supplierSku",
  "lineTotal",
] as const;

function escapeCsvCell(raw: string): string {
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function csvLine(cells: string[]): string {
  return `${cells.map(escapeCsvCell).join(",")}\r\n`;
}

function filenameForOrder(orderNumber: string): string {
  const safe = orderNumber.replace(/[^\w.-]+/g, "_").replace(/^\.+/, "") || "order";
  return `order-${safe}.csv`;
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteCtx) {
  const { id: rawId } = await context.params;
  const id = typeof rawId === "string" ? rawId.trim() : "";
  if (!id) {
    return new NextResponse(null, { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      customerName: true,
      phone: true,
      city: true,
      line1: true,
      comment: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalAmount: true,
      currency: true,
      trackingNumber: true,
      stripeSessionId: true,
      stripePaymentIntentId: true,
      createdAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          productName: true,
          quantity: true,
          price: true,
          supplierSku: true,
        },
      },
    },
  });

  if (!order) {
    return new NextResponse(null, { status: 404 });
  }

  const orderBase = [
    order.id,
    order.orderNumber,
    order.email,
    order.customerName ?? "",
    order.phone ?? "",
    order.city ?? "",
    order.line1 ?? "",
    order.comment ?? "",
    order.status,
    order.paymentStatus,
    order.fulfillmentStatus,
    order.totalAmount.toString(),
    order.currency.trim(),
    order.trackingNumber ?? "",
    order.stripeSessionId ?? "",
    order.stripePaymentIntentId ?? "",
    order.createdAt.toISOString(),
  ];

  let body = "\uFEFF";
  body += csvLine([...HEADERS]);

  if (order.items.length === 0) {
    body += csvLine([...orderBase, "", "", "", "", ""]);
  } else {
    for (const item of order.items) {
      const priceStr = item.price.toString();
      const lineTotal = (
        Number.parseFloat(priceStr) * item.quantity
      ).toFixed(2);
      body += csvLine([
        ...orderBase,
        item.productName,
        String(item.quantity),
        priceStr,
        item.supplierSku ?? "",
        lineTotal,
      ]);
    }
  }

  const filename = filenameForOrder(order.orderNumber);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
