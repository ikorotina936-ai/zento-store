import { prisma } from "@/lib/db/prisma";

const PLACEHOLDER_EMAIL = "stripe-pending@orders.local";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function storeName(): string {
  const n = process.env.NEXT_PUBLIC_STORE_NAME?.trim();
  return n && n.length > 0 ? n : "Store";
}

function appOrigin(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
  if (u.length === 0) {
    return "";
  }
  return u.replace(/\/+$/, "");
}

/**
 * Order confirmation via Resend HTTP API (no extra npm package).
 * Set RESEND_API_KEY and a verified RESEND_FROM (e.g. `ZENTO <orders@yourdomain.com>`).
 * Without API key, skips and returns { sent: false }.
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
): Promise<{ sent: boolean; reason?: string }> {
  console.log("[sendOrderConfirmationEmail] start", { orderId });

  try {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY not set" };
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    `${storeName()} <onboarding@resend.dev>`;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      email: true,
      customerName: true,
      totalAmount: true,
      currency: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          productName: true,
          quantity: true,
          price: true,
        },
      },
    },
  });

  if (!order) {
    return { sent: false, reason: "order not found" };
  }

  const email = order.email.trim().toLowerCase();
  if (
    email.length === 0 ||
    email === PLACEHOLDER_EMAIL.toLowerCase()
  ) {
    return { sent: false, reason: "no customer email" };
  }

  const origin = appOrigin();
  const orderUrl =
    origin.length > 0 ? `${origin}/order/${order.id}` : "";

  const currency = order.currency.trim().toUpperCase() || "USD";
  const total = Number.parseFloat(order.totalAmount.toString());
  const totalLabel = Number.isFinite(total)
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(total)
    : `${order.totalAmount.toString()} ${currency}`;

  const linesHtml = order.items
    .map((row) => {
      const line = Number.parseFloat(row.price.toString()) * row.quantity;
      const lineLabel = Number.isFinite(line)
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          }).format(line)
        : "";
      return `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">${escapeHtml(row.productName)}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;text-align:center;">${row.quantity}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;text-align:right;">${lineLabel}</td>
</tr>`;
    })
    .join("");

  const greeting = order.customerName?.trim()
    ? `Hi ${escapeHtml(order.customerName.trim())},`
    : "Hi,";

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#18181b;max-width:560px;">
  <p>${greeting}</p>
  <p>Thank you for your order from <strong>${escapeHtml(storeName())}</strong>.</p>
  <p><strong>Order</strong>: ${escapeHtml(order.orderNumber)}<br/>
  <strong>Total</strong>: ${escapeHtml(totalLabel)}</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px 0;border-bottom:2px solid #18181b;">Item</th>
        <th style="text-align:center;padding:8px 0;border-bottom:2px solid #18181b;">Qty</th>
        <th style="text-align:right;padding:8px 0;border-bottom:2px solid #18181b;">Line</th>
      </tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>
  ${
    orderUrl
      ? `<p><a href="${escapeHtml(orderUrl)}" style="color:#4f46e5;">View order status</a></p>`
      : ""
  }
  <p style="font-size:12px;color:#71717a;">If you did not place this order, you can ignore this email.</p>
</body>
</html>`;

  const to = order.email.trim();
  const subject = `${storeName()} — Order confirmed (${order.orderNumber})`;
  const payload = {
    from,
    to: [to],
    subject,
    html,
  };

  console.log("[sendOrderConfirmationEmail] before Resend fetch", {
    from,
    to,
    subject,
    apiKeyLength: apiKey.length,
    htmlLength: html.length,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const bodyText = await res.text().catch(() => "");
  console.log("[sendOrderConfirmationEmail] Resend response", {
    status: res.status,
    body: bodyText,
  });

  if (!res.ok) {
    return {
      sent: false,
      reason: `Resend API ${res.status}: ${bodyText.slice(0, 200)}`,
    };
  }

  return { sent: true };
  } catch (err) {
    console.error("[sendOrderConfirmationEmail] caught error", err);
    if (err instanceof Error && err.stack) {
      console.error("[sendOrderConfirmationEmail] error.stack", err.stack);
    }
    return {
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
