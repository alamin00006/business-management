import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Utility functions for role validation
 */
export class RoleValidationUtils {
  /**
   * Validates role name uniqueness
   */
  static async validateRoleNameUniqueness(
    prisma: PrismaService,
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const where: Prisma.RoleWhereInput = {
      name: {
        equals: name.trim(),
        mode: 'insensitive',
      },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingRole = await prisma.role.findFirst({
      where,
      select: { id: true, name: true },
    });

    if (existingRole) {
      throw new ConflictException(`Role name '${name}' already exists`);
    }
  }

  /**
   * Validates if role exists
   */
  static async validateRoleExists(
    prisma: PrismaService,
    id: number,
  ): Promise<{ id: number; name: string }> {
    const role = await prisma.role.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  /**
   * Validates if role can be safely deleted
   */
  static async validateRoleDeletion(
    prisma: PrismaService,
    id: number,
  ): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    // Prevent deletion of roles with associated users
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it has ${role._count.users} associated user(s). Reassign users before deletion.`,
      );
    }

    // Prevent deletion of system-critical roles
    const systemRoles = ['admin', 'super_admin'];
    if (systemRoles.includes(role.name.toLowerCase())) {
      throw new BadRequestException(`Cannot delete system role '${role.name}'`);
    }
  }

  /**
   * Validates role update constraints
   */
  static async validateRoleUpdate(
    prisma: PrismaService,
    id: number,
    name?: string,
  ): Promise<void> {
    const existingRole = await this.validateRoleExists(prisma, id);

    // Validate name uniqueness if name is being changed
    if (name && name !== existingRole.name) {
      await this.validateRoleNameUniqueness(prisma, name, id);
    }
  }
}
