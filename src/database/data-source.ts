import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// 환경변수 로드
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'collaboration_db',

  // CLI에서만 사용하는 최소한의 설정
  entities: [
    'src/users/entities/*.entity.ts',
    'src/documents/entities/*.entity.ts',
    'src/rooms/entities/*.entity.ts',
    'src/collaboration/entities/*.entity.ts',
  ],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
  logging: false,
});
