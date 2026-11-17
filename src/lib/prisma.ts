import { PrismaClient } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          noStore();
          return query(args);
        },
      },
    },
  });
}

type PrismaClientWithExtensions = ReturnType<typeof createPrismaClient>;

function getPrismaClient(): PrismaClientWithExtensions {
  const cached = globalForPrisma.prisma as PrismaClientWithExtensions | undefined;

  if (cached) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client as unknown as PrismaClient;
  }
  return client;
}

export const prisma = getPrismaClient();
