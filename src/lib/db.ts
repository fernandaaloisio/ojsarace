import { PrismaClient } from "@prisma/client";

/**
 * Em produção a Netlify injeta a string de conexão do banco provisionado
 * em NETLIFY_DB_URL (NETLIFY_DATABASE_URL é o nome legado). Localmente vale
 * DATABASE_URL do .env. A resolução fica aqui para que nenhum outro arquivo
 * precise saber em que ambiente está rodando.
 */
export function stringDeConexao(): string | undefined {
  return (
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    process.env.DATABASE_URL ||
    undefined
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: stringDeConexao(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
