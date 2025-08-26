export * from '../dist/client'
export { PrismaClient } from '../dist/client'

// Create and export a singleton Prisma client instance
import { PrismaClient as PrismaClientType } from '../dist/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClientType()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Re-export commonly used types
export type {
  Analytics,
  Category,
  Count,
  CountItem,
  CountStatus,
  InventoryItem,
  Location,
  LocationType,
  MetricType,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ProductSupplier,
  Recipe,
  RecipeItem,
  Sale,
  SaleItem,
  Supplier,
  User,
  UserRole,
} from '../dist/client'
