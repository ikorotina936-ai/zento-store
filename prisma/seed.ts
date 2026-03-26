import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "seed-test" },
    create: { name: "Seed test", slug: "seed-test" },
    update: {},
  });

  await prisma.product.upsert({
    where: { slug: "test-product-alpha" },
    create: {
      name: "Test Product Alpha",
      slug: "test-product-alpha",
      sku: "SEED-SKU-ALPHA-001",
      description: "Перший тестовий товар (seed).",
      price: "19.99",
      categoryId: category.id,
    },
    update: {
      name: "Test Product Alpha",
      description: "Перший тестовий товар (seed).",
      price: "19.99",
    },
  });

  await prisma.product.upsert({
    where: { slug: "test-product-beta" },
    create: {
      name: "Test Product Beta",
      slug: "test-product-beta",
      sku: "SEED-SKU-BETA-002",
      description: "Другий тестовий товар (seed).",
      price: "29.50",
      categoryId: category.id,
    },
    update: {
      name: "Test Product Beta",
      description: "Другий тестовий товар (seed).",
      price: "29.50",
    },
  });

  console.log("Seed: 2 test products upserted (slug: test-product-alpha, test-product-beta).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
