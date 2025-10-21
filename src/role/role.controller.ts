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
import { RoleService } from './role.service';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
// @ApiBearerAuth()
@Controller('roles')
@UseInterceptors(ClassSerializerInterceptor)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * Creates a new role in the system
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create role',
    description: 'Creates a new role with specified permissions',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role successfully created',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role name already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  /**
   * Retrieves paginated list of all roles
   */
  @Get()
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Retrieves paginated list of roles with search capabilities',
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
    description: 'Search term for role name or description',
  })
  @ApiQuery({
    name: 'includeUserCount',
    required: false,
    description: 'Include user counts in response',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('includeUserCount') includeUserCount?: boolean,
  ) {
    return this.roleService.findAll({
      page,
      limit,
      search,
      // includeUserCount: includeUserCount === 'true',
    });
  }

  /**
   * Retrieves a specific role by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get role by ID',
    description:
      'Retrieves detailed information for a specific role including user count',
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid role ID',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  /**
   * Retrieves a role by name
   */
  // @Get('name/:name')
  // @ApiOperation({
  //   summary: 'Get role by name',
  //   description: 'Retrieves role information by role name',
  // })
  // @ApiParam({ name: 'name', description: 'Role name', type: String })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Role retrieved successfully',
  // })
  // @ApiResponse({
  //   status: HttpStatus.NOT_FOUND,
  //   description: 'Role not found',
  // })
  // findByName(@Param('name') name: string) {
  //   return this.roleService.findByName(name);
  // }

  /**
   * Updates an existing role's information
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update role',
    description: 'Updates information for an existing role',
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role name already exists',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto);
  }

  /**
   * Deletes a role from the system
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete role',
    description:
      'Deletes a role from the system (only if no users are assigned)',
  })
  @ApiParam({ name: 'id', description: 'Role ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete role with assigned users',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
