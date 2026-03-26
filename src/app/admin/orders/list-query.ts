import type { Prisma } from "@/generated/prisma/client";
import { $Enums } from "@/generated/prisma/client";

export type FilterSearchParams = {
  q?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
};

const SORT_FIELDS = ["createdAt", "totalAmount", "orderNumber"] as const;
export type SortField = (typeof SORT_FIELDS)[number];
export type SortDir = "asc" | "desc";

export const DEFAULT_SORT_FIELD: SortField = "createdAt";
export const DEFAULT_SORT_DIR: SortDir = "desc";

export type ListQueryParams = FilterSearchParams & {
  sort: SortField;
  dir: SortDir;
};

function parseEnumParam<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (typeof raw !== "string" || raw.trim() === "") {
    return undefined;
  }
  return allowed.includes(raw as T) ? (raw as T) : undefined;
}

export function buildOrdersWhere(sp: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  if (q.length > 0) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const status = parseEnumParam(sp.status, Object.values($Enums.OrderStatus));
  if (status) {
    where.status = status;
  }

  const paymentStatus = parseEnumParam(
    sp.paymentStatus,
    Object.values($Enums.PaymentStatus),
  );
  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  const fulfillmentStatus = parseEnumParam(
    sp.fulfillmentStatus,
    Object.values($Enums.FulfillmentStatus),
  );
  if (fulfillmentStatus) {
    where.fulfillmentStatus = fulfillmentStatus;
  }

  return where;
}

export function appendSortParams(
  params: URLSearchParams,
  sort: SortField,
  dir: SortDir,
): void {
  if (sort !== DEFAULT_SORT_FIELD || dir !== DEFAULT_SORT_DIR) {
    params.set("sort", sort);
    params.set("dir", dir);
  }
}

export function resolveOrderSort(
  sortRaw: string | undefined,
  dirRaw: string | undefined,
): { sort: SortField; dir: SortDir } {
  const s = typeof sortRaw === "string" ? sortRaw.trim() : "";
  const d = typeof dirRaw === "string" ? dirRaw.trim() : "";
  const sort = SORT_FIELDS.includes(s as SortField)
    ? (s as SortField)
    : DEFAULT_SORT_FIELD;
  const dir = d === "asc" || d === "desc" ? d : DEFAULT_SORT_DIR;
  return { sort, dir };
}

export function buildPrismaOrderBy(
  sort: SortField,
  dir: SortDir,
): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "createdAt":
      return { createdAt: dir };
    case "totalAmount":
      return { totalAmount: dir };
    case "orderNumber":
      return { orderNumber: dir };
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

/** Query string для списку / експорту (без page). */
export function listQueryToSearchParams(sp: ListQueryParams): URLSearchParams {
  const params = new URLSearchParams();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  if (q.length > 0) {
    params.set("q", q);
  }
  if (sp.status?.trim()) {
    params.set("status", sp.status.trim());
  }
  if (sp.paymentStatus?.trim()) {
    params.set("paymentStatus", sp.paymentStatus.trim());
  }
  if (sp.fulfillmentStatus?.trim()) {
    params.set("fulfillmentStatus", sp.fulfillmentStatus.trim());
  }
  appendSortParams(params, sp.sort, sp.dir);
  return params;
}
