import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

import {
  buildOrdersWhere,
  buildPrismaOrderBy,
  resolveOrderSort,
} from "../list-query";

export const dynamic = "force-dynamic";

const CSV_COLUMNS = [
  "id",
  "orderNumber",
  "email",
  "status",
  "paymentStatus",
  "fulfillmentStatus",
  "totalAmount",
  "currency",
  "customerName",
  "phone",
  "city",
  "line1",
  "trackingNumber",
  "createdAt",
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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filterSp = {
    q: sp.get("q") ?? undefined,
    status: sp.get("status") ?? undefined,
    paymentStatus: sp.get("paymentStatus") ?? undefined,
    fulfillmentStatus: sp.get("fulfillmentStatus") ?? undefined,
  };
  const { sort, dir } = resolveOrderSort(
    sp.get("sort") ?? undefined,
    sp.get("dir") ?? undefined,
  );
  const where = buildOrdersWhere(filterSp);
  const orderBy = buildPrismaOrderBy(sort, dir);

  const orders = await prisma.order.findMany({
    where,
    orderBy,
    select: {
      id: true,
      orderNumber: true,
      email: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      totalAmount: true,
      currency: true,
      customerName: true,
      phone: true,
      city: true,
      line1: true,
      trackingNumber: true,
      createdAt: true,
    },
  });

  let body = "\uFEFF";
  body += csvLine([...CSV_COLUMNS]);
  for (const o of orders) {
    body += csvLine([
      o.id,
      o.orderNumber,
      o.email,
      o.status,
      o.paymentStatus,
      o.fulfillmentStatus,
      o.totalAmount.toString(),
      o.currency.trim(),
      o.customerName ?? "",
      o.phone ?? "",
      o.city ?? "",
      o.line1 ?? "",
      o.trackingNumber ?? "",
      o.createdAt.toISOString(),
    ]);
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="orders-export.csv"',
    },
  });
}
