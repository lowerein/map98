import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// 避免 Next.js Hot Reload 產生過多 DB Connections
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// 1. 初始化 PostgreSQL Adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
})

// 2. 將 adapter 傳入 PrismaClient (Prisma 7 強制要求)
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma