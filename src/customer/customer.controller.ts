import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Prisma } from '@prisma/client';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  create(
    @Body()
    data: {
      customerCode: string;
      name: string;
      email: string;
      phone: string;
      password: string;
      address?: any;
      profilePicture?: string;
      profileCloudinaryId?: string;
      customerType?: string;
    },
  ) {
    return this.customerService.create(data);
  }

  @Post('login')
  login(@Body() data: { email: string; password: string }) {
    return this.customerService.login(data.email, data.password);
  }

  @Get()
  findAll(
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
    @Query('status') status?: string,
    @Query('customerType') customerType?: string,
    @Query('search') search?: string,
  ) {
    const where: Prisma.CustomerWhereInput = {};

    if (status) where.status = status as any;
    if (customerType) where.customerType = customerType as any;

    if (search) {
      return this.customerService.search(search, { skip, take, where });
    }

    return this.customerService.findAll({
      skip,
      take,
      where,
    });
  }

  @Get('stats')
  getStats() {
    return this.customerService.getStats();
  }

  @Get('top-customers')
  getTopCustomersBySales(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.customerService.getTopCustomersBySales(
      limit,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take?: number,
  ) {
    return this.customerService.search(query, { skip, take });
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.customerService.findByEmail(email);
  }

  @Get('phone/:phone')
  findByPhone(@Param('phone') phone: string) {
    return this.customerService.findByPhone(phone);
  }

  @Get('code/:customerCode')
  findByCustomerCode(@Param('customerCode') customerCode: string) {
    return this.customerService.findByCustomerCode(customerCode);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: any;
      profilePicture?: string;
      profileCloudinaryId?: string;
      customerType?: string;
      status?: string;
    },
  ) {
    return this.customerService.update(id, data);
  }

  @Patch(':id/password')
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { currentPassword: string; newPassword: string },
  ) {
    return this.customerService.updatePassword(
      id,
      data.currentPassword,
      data.newPassword,
    );
  }

  @Patch(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { newPassword: string },
  ) {
    return this.customerService.resetPassword(id, data.newPassword);
  }

  @Patch(':id/verify-email')
  verifyEmail(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.verifyEmail(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.remove(id);
  }
}
