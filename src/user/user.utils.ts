import { Prisma, UserStatus } from '@prisma/client';

/**
 * Builds WHERE clause for user queries based on filters
 * @param params - Filter parameters
 * @returns Prisma WHERE clause object
 */
export const buildUserWhereClause = (params: {
  search?: string;
  branchId?: number;
  roleId?: number;
  status?: UserStatus;
}): Prisma.UserWhereInput => {
  const { search, branchId, roleId, status } = params;
  const where: Prisma.UserWhereInput = {};

  // Add search condition across multiple fields
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Add filter conditions
  if (branchId) where.branchId = branchId;
  if (roleId) where.roleId = roleId;
  if (status) where.status = status;

  return where;
};

/**
 * Removes password field from user object
 * @param user - User object with password
 * @returns User object without password
 */
export const excludePassword = <T>(user: T): Omit<T, 'password'> => {
  const { password, ...userWithoutPassword } = user as any;
  return userWithoutPassword;
};
