import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new user
   * @param createUserDto - User creation data transfer object
   * @returns User object without password field
   * @throws ConflictException if email or phone already exists
   * @throws NotFoundException if role or branch doesn't exist
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      // Validate business rules before creation
      // await this.validateCreateUser(createUserDto);

      const { password, ...userData } = createUserDto;

      // Hash password for secure storage
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
        include: {
          role: { select: { id: true, name: true, description: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
      });

      // Remove sensitive information from response
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      console.log(error);
      this.logger.error(`User creation failed: ${error.message}`, error.stack);

      // Handle specific database errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.handlePrismaError(error);
      }
      throw error;
    }
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

    try {
      // Build dynamic where clause based on filters
      const where: Prisma.UserWhereInput = this.buildUserWhereClause({
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
      const usersWithoutPassword = users.map((user) =>
        this.excludePassword(user),
      );

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
    } catch (error) {
      this.logger.error(`User retrieval failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve users');
    }
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

    try {
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

      return this.excludePassword(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `User retrieval failed for ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to retrieve user');
    }
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

    try {
      // Validate update constraints
      await this.validateUpdateUser(id, updateUserDto);

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

      return this.excludePassword(updatedUser);
    } catch (error) {
      this.logger.error(
        `User update failed for ID ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.handlePrismaError(error);
      }
      throw error;
    }
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

    try {
      // Validate if user can be deleted
      await this.validateUserDeletion(id);

      // Perform soft delete
      await this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.inactive },
      });

      return { message: 'User deactivated successfully' };
    } catch (error) {
      this.logger.error(
        `User deletion failed for ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
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

    const usersWithoutPassword = users.map((user) =>
      this.excludePassword(user),
    );

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
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      // Non-critical operation, log but don't throw
      this.logger.warn(`Last login update failed for user ${id}`, error);
    }
  }

  // ============ PRIVATE VALIDATION METHODS ============

  /**
   * Validates user creation constraints
   * @param createUserDto - User creation data
   * @private
   */
  private async validateCreateUser(
    createUserDto: CreateUserDto,
  ): Promise<void> {
    const { email, phone, roleId, branchId } = createUserDto;

    // Check for unique constraints
    const [existingEmail, existingPhone, roleExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { phone }, select: { id: true } }),
      this.prisma.role.findUnique({
        where: { id: roleId },
        select: { id: true },
      }),
    ]);

    if (existingEmail) throw new ConflictException('Email already exists');
    if (existingPhone)
      throw new ConflictException('Phone number already exists');
    if (!roleExists) throw new NotFoundException('Role not found');

    // Validate branch existence if provided
    if (branchId) {
      const branchExists = await this.prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      });
      if (!branchExists) throw new NotFoundException('Branch not found');
    }
  }

  /**
   * Validates user update constraints
   * @param id - User ID being updated
   * @param updateUserDto - Update data
   * @private
   */
  private async validateUpdateUser(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<void> {
    const { email, phone, roleId, branchId } = updateUserDto;

    // Verify user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, phone: true },
    });
    if (!existingUser)
      throw new NotFoundException(`User with ID ${id} not found`);

    // Check email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email },
      });
      if (emailExists) throw new ConflictException('Email already exists');
    }

    // Check phone uniqueness if changing phone
    if (phone && phone !== existingUser.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (phoneExists)
        throw new ConflictException('Phone number already exists');
    }

    // Validate role existence if changing role
    if (roleId) {
      const roleExists = await this.prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!roleExists) throw new NotFoundException('Role not found');
    }

    // Validate branch existence if changing branch
    if (branchId !== undefined) {
      if (branchId) {
        const branchExists = await this.prisma.branch.findUnique({
          where: { id: branchId },
        });
        if (!branchExists) throw new NotFoundException('Branch not found');
      }
    }
  }

  /**
   * Validates if user can be safely deleted
   * @param id - User ID to validate
   * @private
   */
  private async validateUserDeletion(id: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        managedBranch: { select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Prevent deletion of branch managers
    if (user.managedBranch) {
      throw new BadRequestException(
        'Cannot delete user who is managing a branch. Please reassign branch manager first.',
      );
    }
  }

  // ============ UTILITY METHODS ============

  /**
   * Builds WHERE clause for user queries based on filters
   * @param params - Filter parameters
   * @returns Prisma WHERE clause object
   * @private
   */
  private buildUserWhereClause(params: {
    search?: string;
    branchId?: number;
    roleId?: number;
    status?: UserStatus;
  }): Prisma.UserWhereInput {
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
  }

  /**
   * Removes password field from user object
   * @param user - User object with password
   * @returns User object without password
   * @private
   */
  private excludePassword<User>(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  /**
   * Handles specific Prisma database errors
   * @param error - Prisma error object
   * @private
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): void {
    this.logger.error(`Database error: ${error.code}`, error.message);

    switch (error.code) {
      case 'P2002':
        throw new ConflictException('Unique constraint violation');
      case 'P2025':
        throw new NotFoundException('Record not found');
      case 'P2003':
        throw new BadRequestException('Foreign key constraint failed');
      case 'P2014':
        throw new BadRequestException('Invalid ID provided');
      default:
        throw new InternalServerErrorException('Database operation failed');
    }
  }
}
