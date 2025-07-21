import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

// ✅ 类型定义：过滤器 & 排序
type Filter = {
  columnId: string;
  operator: "equals" | "contains";
  value: string;
};

type Sort = {
  columnId: string;
  direction: "asc" | "desc";
};

// ✅ 构建 where 语句
function buildWhereFromFilters(filters: Filter[] = []) {
  if (filters.length === 0) return undefined;

  return {
    cells: {
      some: {
        AND: filters.map((f) => ({
          columnId: f.columnId,
          value: {
            [f.operator === "contains" ? "contains" : "equals"]: f.value,
          },
        })),
      },
    },
  };
}

// ✅ 构建排序语句（默认用 createdAt 排序）
function buildOrderByFromSorts(_sorts: Sort[] = []) {
  return { createdAt: "asc" as const };
}

export const rowRouter = createTRPCRouter({
  getByTable: publicProcedure
    .input(
      z.object({
        tableId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
        filters: z
          .array(
            z.object({
              columnId: z.string(),
              operator: z.enum(["equals", "contains"]),
              value: z.string(),
            })
          )
          .optional(),
        sorts: z
          .array(
            z.object({
              columnId: z.string(),
              direction: z.enum(["asc", "desc"]),
            })
          )
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { tableId, limit, cursor, filters = [], sorts = [] } = input;

      const rows = await ctx.prisma.row.findMany({
        where: {
          tableId,
          isDeleted: false,
          ...buildWhereFromFilters(filters),
        },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: buildOrderByFromSorts(sorts),
        include: {
          cells: {
            include: {
              column: true,
            },
          },
        },
      });

      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, -1) : rows;

      return {
        rows: items,
        nextCursor: hasNextPage ? items[items.length - 1]!.id : null,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.row.update({
        where: { id: input.rowId },
        data: { isDeleted: true },
      });
    }),

  add: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const columns = await ctx.prisma.column.findMany({
        where: {
          tableId: input.tableId,
          isDeleted: false,
        },
      });

      const row = await ctx.prisma.row.create({
        data: { tableId: input.tableId },
      });

      const cells = await ctx.prisma.$transaction(
        columns.map((col) =>
          ctx.prisma.cell.create({
            data: {
              rowId: row.id,
              columnId: col.id,
              value: "",
            },
          })
        )
      );

      return { ...row, cells };
    }),
});
