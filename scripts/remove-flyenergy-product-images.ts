/**
 * Одноразово видаляє рядки ProductImage, у яких URL містить flyenergy.com.ua.
 * Запуск: pnpm db:remove-flyenergy-images (потрібен DATABASE_URL).
 */
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const result = await prisma.productImage.deleteMany({
    where: {
      url: { contains: "flyenergy.com.ua", mode: "insensitive" },
    },
  });
  console.log(
    `Deleted ${result.count} product image row(s) containing flyenergy.com.ua.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
