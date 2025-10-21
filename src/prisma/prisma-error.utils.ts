import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Utility functions for handling Prisma errors
 */
export class PrismaErrorUtils {
  /**
   * Handles specific Prisma database errors
   */
  static handlePrismaError(error: Prisma.PrismaClientKnownRequestError): void {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(this.getUniqueConstraintMessage(error));
      case 'P2025':
        throw new NotFoundException('Record not found');
      case 'P2003':
        throw new BadRequestException('Foreign key constraint failed');
      case 'P2014':
        throw new BadRequestException('Invalid ID provided');
      case 'P2016':
        throw new NotFoundException('Record not found');
      case 'P2015':
        throw new NotFoundException('Related record not found');
      default:
        throw new InternalServerErrorException('Database operation failed');
    }
  }

  /**
   * Extracts meaningful message from unique constraint violation
   */
  private static getUniqueConstraintMessage(
    error: Prisma.PrismaClientKnownRequestError,
  ): string {
    const meta = error.meta as { target?: string[] };

    if (meta?.target?.includes('name')) {
      return 'Role name already exists';
    }
    if (meta?.target?.includes('email')) {
      return 'Email already exists';
    }
    if (meta?.target?.includes('phone')) {
      return 'Phone number already exists';
    }

    return 'Unique constraint violation';
  }

  /**
   * Checks if error is a Prisma known request error
   */
  static isPrismaError(
    error: any,
  ): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
  }
}
