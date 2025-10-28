import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaErrorHandler } from 'src/prisma/prisma-error.utils';

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errorHandler: PrismaErrorHandler,
  ) {}

  // Branch-specific error configuration
  private readonly branchErrorOptions = {
    entity: 'branch',
    uniqueFieldMap: {
      name: 'Branch name already exists',
      code: 'Branch code already exists',
      email: 'Branch email already exists',
      phone: 'Branch phone number already exists',
    },
    foreignKeyMap: {
      managerId: 'Assigned manager does not exist',
    },
    customMessages: {
      P2003: 'The assigned manager does not exist',
    },
  };

  // Create a new branch
  async create(data: Prisma.BranchCreateInput) {
    try {
      return await this.prisma.branch.create({
        data,
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.branchErrorOptions,
        'Failed to create branch',
      );
    }
  }

  // Get all branches
  async findAll() {
    try {
      return await this.prisma.branch.findMany({
        include: {
          manager: true,
          users: true,
          stocks: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.errorHandler.handleError(
        error,
        this.branchErrorOptions,
        'Failed to fetch branches',
      );
    }
  }

  // Get a single branch by ID
  async findOne(id: number) {
    try {
      const branch = await this.prisma.branch.findUnique({
        where: { id },
        include: {
          manager: true,
          users: true,
          stocks: true,
          expenses: true,
        },
      });

      if (!branch) {
        throw new NotFoundException(`Branch with ID ${id} not found`);
      }

      return branch;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.branchErrorOptions,
        `Failed to fetch branch with ID ${id}`,
      );
    }
  }

  // Update branch details
  async update(id: number, data: Prisma.BranchUpdateInput) {
    try {
      // Check if branch exists
      const branchExists = await this.prisma.branch.findUnique({
        where: { id },
      });

      if (!branchExists) {
        throw new NotFoundException(`Branch with ID ${id} not found`);
      }

      return await this.prisma.branch.update({
        where: { id },
        data,
        include: { manager: true },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.branchErrorOptions,
        `Failed to update branch with ID ${id}`,
      );
    }
  }

  // Delete branch
  async remove(id: number) {
    try {
      // Check if branch exists
      const branch = await this.prisma.branch.findUnique({
        where: { id },
      });

      if (!branch) {
        throw new NotFoundException(`Branch with ID ${id} not found`);
      }

      return await this.prisma.branch.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.errorHandler.handleError(
        error,
        this.branchErrorOptions,
        `Failed to delete branch with ID ${id}`,
      );
    }
  }
}
