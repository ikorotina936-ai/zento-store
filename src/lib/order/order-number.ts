/** Унікальний номер замовлення для відображення клієнту. */
export function generateOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `ORD-${t}-${r}`;
}
