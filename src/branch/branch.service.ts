import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new branch
  async create(data: Prisma.BranchCreateInput) {
    return this.prisma.branch.create({
      data,
      include: { manager: true },
    });
  }

  // Get all branches
  async findAll() {
    return this.prisma.branch.findMany({
      include: {
        manager: true,
        users: true,
        stocks: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get a single branch by ID
  async findOne(id: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        manager: true,
        users: true,
        stocks: true,
        expenses: true,
      },
    });

    if (!branch) throw new NotFoundException(`Branch with ID ${id} not found`);
    return branch;
  }

  // Update branch details
  async update(id: number, data: Prisma.BranchUpdateInput) {
    const branchExists = await this.prisma.branch.findUnique({ where: { id } });
    if (!branchExists)
      throw new NotFoundException(`Branch with ID ${id} not found`);

    return this.prisma.branch.update({
      where: { id },
      data,
      include: { manager: true },
    });
  }

  // Optional: Delete branch
  async remove(id: number) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException(`Branch with ID ${id} not found`);

    return this.prisma.branch.delete({ where: { id } });
  }
}
