import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

export class UserValidation {
  /**
   * New User Create validation
   */
  static async validateCreateUser(
    prisma: PrismaService,
    createUserDto: CreateUserDto,
  ): Promise<void> {
    const { email, phone, roleId, branchId } = createUserDto;

    const [existingEmail, existingPhone, roleExists] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { phone }, select: { id: true } }),
      prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }),
    ]);

    if (existingEmail) throw new ConflictException('Email already exists');
    if (existingPhone)
      throw new ConflictException('Phone number already exists');
    if (!roleExists) throw new NotFoundException('Role not found');

    if (branchId) {
      const branchExists = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      });
      if (!branchExists) throw new NotFoundException('Branch not found');
    }
  }

  /**
   * User Update validation
   */
  static async validateUpdateUser(
    prisma: PrismaService,
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<void> {
    const { email, phone, roleId, branchId } = updateUserDto;

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, phone: true },
    });

    if (!existingUser)
      throw new NotFoundException(`User with ID ${id} not found`);

    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) throw new ConflictException('Email already exists');
    }

    if (phone && phone !== existingUser.phone) {
      const phoneExists = await prisma.user.findUnique({ where: { phone } });
      if (phoneExists)
        throw new ConflictException('Phone number already exists');
    }

    if (roleId) {
      const roleExists = await prisma.role.findUnique({
        where: { id: roleId },
      });
      if (!roleExists) throw new NotFoundException('Role not found');
    }

    if (branchId !== undefined) {
      if (branchId) {
        const branchExists = await prisma.branch.findUnique({
          where: { id: branchId },
        });
        if (!branchExists) throw new NotFoundException('Branch not found');
      }
    }
  }

  /**
   * Before Delete User validation
   */
  static async validateUserDeletion(
    prisma: PrismaService,
    id: number,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { managedBranch: { select: { id: true } } },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    if (user.managedBranch) {
      throw new BadRequestException(
        'Cannot delete user who is managing a branch. Please reassign the branch manager first.',
      );
    }
  }
}
