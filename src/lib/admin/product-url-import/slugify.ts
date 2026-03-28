/** Slug з назви: літери/цифри різних алфавітів та дефіс. */
export function slugifyFromName(name: string): string {
  const t = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/gu, "");
  const s = t.slice(0, 480);
  return s.length > 0 ? s : "product";
}
