import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT 액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '사용자 정보',
    example: {
      id: 'uuid-string',
      email: 'user@example.com',
      username: 'johndoe',
      role: 'user',
      avatarUrl: 'https://example.com/avatar.jpg',
    },
  })
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    avatarUrl?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };

  @ApiProperty({
    description: '토큰 만료 시간 (초)',
    example: 86400,
  })
  expiresIn: number;
}
