import { inspect } from "node:util";

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().max(10_000).optional(),
});

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(categories, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/categories]", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  const { name, slug, description } = parsed.data;

  const data: Prisma.CategoryCreateInput = {
    name,
    slug,
  };
  if (description !== undefined) {
    data.description = description;
  }

  try {
    const category = await prisma.category.create({ data });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    console.error(
      "[POST /api/categories] raw error:",
      inspect(error, { depth: 8, colors: true }),
    );

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[POST /api/categories] Prisma known request", {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Category with this slug already exists" },
          { status: 400 },
        );
      }
    } else if (error instanceof Error) {
      console.error("[POST /api/categories] Error", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
