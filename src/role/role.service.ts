import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleValidationUtils } from './dto/role.validation';
import { QueryUtils } from 'src/common/utils/query.utils';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new role
   */
  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    await RoleValidationUtils.validateRoleNameUniqueness(
      this.prisma,
      createRoleDto.name,
    );

    const role = await this.prisma.role.create({
      data: {
        ...createRoleDto,
        permissions: createRoleDto.permissions ?? {},
      },
    });

    return role;
  }

  /**
   * Get all roles (paginated)
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    data: Role[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 10, search } = params;

    const where = QueryUtils.buildRoleWhereClause({ search });
    const { skip, take } = QueryUtils.buildPaginationParams(page, limit);

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: roles,
      meta: QueryUtils.buildPaginationMeta(page, limit, total),
    };
  }

  /**
   * Get a single role by ID
   */
  async findOne(id: number): Promise<Role & { _count?: { users: number } }> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);

    return role;
  }

  /**
   * Update a role
   */
  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    await RoleValidationUtils.validateRoleUpdate(
      this.prisma,
      id,
      updateRoleDto.name,
    );

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        ...updateRoleDto,
        permissions: updateRoleDto.permissions ?? undefined,
      },
    });

    return updatedRole;
  }

  /**
   * Delete a role
   */
  async remove(id: number): Promise<{ message: string }> {
    await RoleValidationUtils.validateRoleDeletion(this.prisma, id);
    await this.prisma.role.delete({ where: { id } });

    return { message: 'Role deleted successfully' };
  }

  /**
   * Common error handler
   */
  //   private handleError(context: string, error: any): never {
  //     this.logger.error(`${context}: ${error.message}`, error.stack);

  //     if (PrismaErrorUtils.isPrismaError(error)) {
  //       PrismaErrorUtils.handlePrismaError(error);
  //     }

  //     throw error;
  //   }
}
