import { Prisma } from '@prisma/client';

/**
 * Utility functions for building database queries
 */
export class QueryUtils {
  /**
   * Builds WHERE clause for role queries
   */
  static buildRoleWhereClause(params: {
    search?: string;
  }): Prisma.RoleWhereInput {
    const { search } = params;
    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Builds pagination parameters
   */
  static buildPaginationParams(
    page: number = 1,
    limit: number = 10,
  ): {
    skip: number;
    take: number;
  } {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
  }

  /**
   * Builds pagination metadata
   */
  static buildPaginationMeta(
    page: number,
    limit: number,
    total: number,
  ): {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };
  }
}
