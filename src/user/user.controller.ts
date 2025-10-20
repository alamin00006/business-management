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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Creates a new user account
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create user',
    description: 'Creates a new user account with the provided information',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or phone number already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or branch not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  /**
   * Retrieves paginated list of users with optional filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieves paginated list of users with search and filter capabilities',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for name, email, or phone',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'Filter by branch ID',
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    description: 'Filter by role ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('branchId', ParseIntPipe) branchId?: number,
    @Query('roleId', ParseIntPipe) roleId?: number,
  ) {
    return this.userService.findAll({ page, limit, search, branchId, roleId });
  }

  /**
   * Retrieves users by specific branch
   */
  @Get('branch/:branchId')
  @ApiOperation({
    summary: 'Get users by branch',
    description: 'Retrieves users associated with a specific branch',
  })
  @ApiParam({ name: 'branchId', description: 'Branch ID', type: Number })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Branch users retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Branch not found',
  })
  getUsersByBranch(
    @Param('branchId', ParseIntPipe) branchId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.userService.getUsersByBranch(branchId, page, limit);
  }

  /**
   * Retrieves a specific user by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves detailed information for a specific user',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  /**
   * Updates an existing user's information
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates information for an existing user',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or phone already exists',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  /**
   * Deactivates a user account (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deactivates a user account (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User deactivated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete user with active relations',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
