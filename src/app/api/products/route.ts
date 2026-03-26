import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { FulfillmentStatus, Prisma } from "@/generated/prisma/client";

const createProductSchema = z.object({
  name: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  sku: z.string().min(1).max(120),
  price: z.number().finite().nonnegative(),
  categoryId: z.string().min(1),
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  const { name, slug, sku, price, categoryId } = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        price,
        categoryId,
        currency: "UAH",
        stock: 0,
        isActive: true,
        isFeatured: false,
        requiresShipping: true,
        trackInventory: false,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Product with this slug or SKU already exists" },
          { status: 400 },
        );
      }
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid category" },
          { status: 400 },
        );
      }
    }

    console.error("[POST /api/products]", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
