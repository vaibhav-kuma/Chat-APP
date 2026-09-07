import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface Pagination {
  page: number;
  limit: number;
}

export function getPagination(query: unknown): Pagination {
  const parsed = paginationSchema.safeParse(query);
  return parsed.success ? { page: parsed.data.page, limit: parsed.data.limit } : { page: 1, limit: 20 };
}

export interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function paginate<T>(
  model: { count: (args: { where: Prisma.VideoWhereInput }) => Promise<number> } & Record<string, unknown>,
  findMany: (args: { skip: number; take: number; orderBy?: unknown; where?: unknown; include?: unknown }) => Promise<T[]>,
  where: Prisma.VideoWhereInput,
  { page, limit }: Pagination,
  orderBy: unknown = { createdAt: "desc" }
): Promise<Paginated<T>> {
  const [total, items] = await Promise.all([
    model.count({ where }),
    findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
