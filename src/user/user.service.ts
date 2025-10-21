import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { UserValidation } from './dto/user.validation';
import { buildUserWhereClause, excludePassword } from './user.utils';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  /**
   * Creates a new user
   * @param createUserDto - User creation data transfer object
   * @returns User object without password field
   * @throws ConflictException if email or phone already exists
   * @throws NotFoundException if role or branch doesn't exist
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    // Validate business rules before creation
    await UserValidation.validateCreateUser(this.prisma, createUserDto);

    const { password, ...userData } = createUserDto;

    // Hash password for secure storage

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
      // include: {
      //   role: { select: { id: true, name: true, description: true } },
      //   branch: { select: { id: true, name: true, code: true } },
      // },
    });

    // Remove sensitive information from response
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Retrieves paginated list of users with filtering options
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated user data with metadata
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: number;
    roleId?: number;
    status?: UserStatus;
  }): Promise<{
    data: Omit<User, 'password'>[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 10, search, branchId, roleId, status } = params;

    const skip = (page - 1) * limit;

    // Build dynamic where clause based on filters
    const where: Prisma.UserWhereInput = buildUserWhereClause({
      search,
      branchId,
      roleId,
      status,
    });

    // Execute parallel queries for data and count
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: { select: { id: true, name: true, description: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove passwords from all user objects
    const usersWithoutPassword = users.map((user) => excludePassword(user));

    return {
      data: usersWithoutPassword,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Retrieves a single user by ID with related entities
   * @param id - User ID to retrieve
   * @returns User object without password
   * @throws NotFoundException if user doesn't exist
   */
  async findOne(id: number): Promise<Omit<User, 'password'>> {
    // Validate input parameter
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
        branch: {
          select: { id: true, name: true, code: true, address: true },
        },
        managedBranch: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return excludePassword(user);
  }

  /**
   * Updates an existing user's information
   * @param id - User ID to update
   * @param updateUserDto - Partial user data for update
   * @returns Updated user object without password
   */
  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // Validate input parameter
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // Validate update constraints
    await UserValidation.validateUpdateUser(this.prisma, id, updateUserDto);

    const { ...updateData } = updateUserDto;

    // Hash new password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true, description: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    return excludePassword(updatedUser);
  }

  /**
   * Soft deletes a user by setting status to inactive
   * @param id - User ID to deactivate
   * @returns Success message
   */
  async remove(id: number): Promise<{ message: string }> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    // Validate if user can be deleted
    await UserValidation.validateUserDeletion(this.prisma, id);

    // Perform soft delete
    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.inactive },
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Retrieves users filtered by branch with pagination
   * @param branchId - Branch ID to filter by
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Paginated users from specific branch
   */
  async getUsersByBranch(
    branchId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { branchId },
        skip,
        take: limit,
        include: {
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { branchId } }),
    ]);

    const usersWithoutPassword = users.map((user) => excludePassword(user));

    return {
      data: usersWithoutPassword,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Updates user's last login timestamp
   * @param id - User ID to update
   */
  async updateLastLogin(id: number): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
