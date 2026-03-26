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
  const id = orderId.trim();
  if (!next || !id) {
    return;
  }

  const current = await prisma.order.findUnique({
    where: { id },
    select: { paidAt: true },
  });
  if (!current) {
    return;
  }

  await prisma.order.update({
    where: { id },
    data: {
      paymentStatus: next,
      ...(next === $Enums.PaymentStatus.PAID && current.paidAt == null
        ? { paidAt: new Date() }
        : {}),
    },
  });

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function updateOrderFulfillmentStatus(
  orderId: string,
  formData: FormData,
): Promise<void> {
  const next = parseFulfillmentStatus(formData.get("fulfillmentStatus"));
  const id = orderId.trim();
  if (!next || !id) {
    return;
  }

  const current = await prisma.order.findUnique({
    where: { id },
    select: { fulfilledAt: true },
  });
  if (!current) {
    return;
  }

  await prisma.order.update({
    where: { id },
    data: {
      fulfillmentStatus: next,
      ...(next === $Enums.FulfillmentStatus.FULFILLED &&
      current.fulfilledAt == null
        ? { fulfilledAt: new Date() }
        : {}),
    },
  });

  revalidatePath(`/admin/orders/${id}`);
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
