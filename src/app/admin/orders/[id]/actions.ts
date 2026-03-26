"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { $Enums } from "@/generated/prisma/client";

function parseOrderStatus(
  raw: FormDataEntryValue | null,
): $Enums.OrderStatus | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  const values = Object.values($Enums.OrderStatus) as string[];
  return values.includes(raw) ? (raw as $Enums.OrderStatus) : null;
}

function parseFulfillmentStatus(
  raw: FormDataEntryValue | null,
): $Enums.FulfillmentStatus | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  const values = Object.values($Enums.FulfillmentStatus) as string[];
  return values.includes(raw) ? (raw as $Enums.FulfillmentStatus) : null;
}

function parsePaymentStatus(
  raw: FormDataEntryValue | null,
): $Enums.PaymentStatus | null {
  if (typeof raw !== "string" || raw.length === 0) {
    return null;
  }
  const values = Object.values($Enums.PaymentStatus) as string[];
  return values.includes(raw) ? (raw as $Enums.PaymentStatus) : null;
}

export async function updateOrderStatus(
  orderId: string,
  formData: FormData,
): Promise<void> {
  const next = parseOrderStatus(formData.get("status"));
  if (!next || !orderId.trim()) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId.trim() },
    data: { status: next },
  });

  revalidatePath(`/admin/orders/${orderId.trim()}`);
  revalidatePath("/admin/orders");
}

export async function updateOrderPaymentStatus(
  orderId: string,
  formData: FormData,
): Promise<void> {
  const next = parsePaymentStatus(formData.get("paymentStatus"));
  if (!next || !orderId.trim()) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId.trim() },
    data: { paymentStatus: next },
  });

  revalidatePath(`/admin/orders/${orderId.trim()}`);
  revalidatePath("/admin/orders");
}

export async function updateOrderFulfillmentStatus(
  orderId: string,
  formData: FormData,
): Promise<void> {
  const next = parseFulfillmentStatus(formData.get("fulfillmentStatus"));
  if (!next || !orderId.trim()) {
    return;
  }

  await prisma.order.update({
    where: { id: orderId.trim() },
    data: { fulfillmentStatus: next },
  });

  revalidatePath(`/admin/orders/${orderId.trim()}`);
  revalidatePath("/admin/orders");
}

const TRACKING_MAX_LEN = 120;

export async function updateOrderTrackingNumber(
  orderId: string,
  formData: FormData,
): Promise<void> {
  if (!orderId.trim()) {
    return;
  }

  const raw = formData.get("trackingNumber");
  const trimmed =
    typeof raw === "string" ? raw.trim().slice(0, TRACKING_MAX_LEN) : "";
  const trackingNumber = trimmed.length > 0 ? trimmed : null;

  await prisma.order.update({
    where: { id: orderId.trim() },
    data: { trackingNumber },
  });

  revalidatePath(`/admin/orders/${orderId.trim()}`);
  revalidatePath("/admin/orders");
}
