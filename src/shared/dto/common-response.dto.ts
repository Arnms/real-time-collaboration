import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto<T = any> {
  @ApiProperty({ example: true, description: '성공 여부' })
  success: boolean;

  @ApiProperty({ description: '응답 데이터' })
  data: T;

  @ApiProperty({ example: '성공적으로 처리되었습니다.', description: '메시지' })
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false, description: '성공 여부' })
  success: boolean;

  @ApiProperty({ example: 'Bad Request', description: '에러 타입' })
  error: string;

  @ApiProperty({ example: '잘못된 요청입니다.', description: '에러 메시지' })
  message: string;

  @ApiProperty({ example: 400, description: 'HTTP 상태 코드' })
  statusCode: number;

  @ApiProperty({
    example: ['email must be a valid email'],
    description: '상세 에러 정보',
    required: false,
  })
  details?: string[];
}

export class PaginationResponseDto<T = any> {
  @ApiProperty({ description: '데이터 목록' })
  items: T[];

  @ApiProperty({ example: 100, description: '전체 아이템 수' })
  total: number;

  @ApiProperty({ example: 1, description: '현재 페이지' })
  page: number;

  @ApiProperty({ example: 10, description: '페이지 크기' })
  limit: number;

  @ApiProperty({ example: 10, description: '전체 페이지 수' })
  totalPages: number;
}
