import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['query'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export async function withDbFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    await Promise.resolve();
    return await fn();
  } catch (error) {
    console.warn('Database unavailable, using fallback behavior:', error);
    return fallback;
  }
}