import { AppDataSource } from '../data-source';
import { seedUsers } from './user.seed';

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');

    // 데이터베이스 연결
    await AppDataSource.initialize();
    console.log('📦 Database connected');

    // 시드 실행
    await seedUsers(AppDataSource);

    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    // 연결 종료
    await AppDataSource.destroy();
    console.log('Database connection closed');
    process.exit(0);
  }
}

runSeeds();
