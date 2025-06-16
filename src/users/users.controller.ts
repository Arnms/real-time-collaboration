import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, AdminUpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { UserRole } from '../shared/enums/user-role.enum';
import { User } from './entities/user.entity';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import {
  PaginationResponseDto,
  ErrorResponseDto,
} from '../shared/dto/common-response.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '사용자 생성 (관리자 전용)',
    description: '관리자가 새로운 사용자를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '사용자 생성 성공',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음',
    type: ErrorResponseDto,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, ...result } = user;
    return result;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '사용자 목록 조회 (관리자 전용)',
    description: '모든 사용자의 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: 200,
    description: '사용자 목록 조회 성공',
    type: PaginationResponseDto,
  })
  async findAll(@Query() paginationQuery: PaginationQueryDto) {
    return this.usersService.findAll(paginationQuery);
  }

  @Get('me')
  @ApiOperation({
    summary: '내 정보 조회',
    description: '현재 로그인한 사용자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '내 정보 조회 성공',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        role: { type: 'string' },
        avatarUrl: { type: 'string' },
        isActive: { type: 'boolean' },
        lastLoginAt: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  async findMe(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: '사용자 정보 조회',
    description: '특정 사용자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({
    summary: '내 정보 수정',
    description: '현재 로그인한 사용자의 정보를 수정합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '내 정보 수정 성공',
  })
  async updateMe(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(user.id, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '사용자 정보 수정 (관리자 전용)',
    description: '관리자가 특정 사용자의 정보를 수정합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 수정 성공',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: AdminUpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '사용자 삭제 (관리자 전용)',
    description: '관리자가 특정 사용자를 삭제합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 삭제 성공',
  })
  @ApiResponse({
    status: 403,
    description: '권한 없음',
    type: ErrorResponseDto,
  })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: '사용자가 삭제되었습니다.' };
  }
}
