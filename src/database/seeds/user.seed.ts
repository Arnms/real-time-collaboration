import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../shared/enums/user-role.enum';

export const seedUsers = async (dataSource: DataSource) => {
  const userRepository = dataSource.getRepository(User);

  // 관리자 계정 생성
  const adminExists = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123!@#', 10);
    const admin = userRepository.create({
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepository.save(admin);
    console.log('✅ Admin user created');
  }

  // 테스트 사용자 생성
  const testUserExists = await userRepository.findOne({
    where: { email: 'user@example.com' },
  });

  if (!testUserExists) {
    const hashedPassword = await bcrypt.hash('user123!@#', 10);
    const testUser = userRepository.create({
      email: 'user@example.com',
      username: 'testuser',
      password: hashedPassword,
      role: UserRole.USER,
      isActive: true,
    });
    await userRepository.save(testUser);
    console.log('✅ Test user created');
  }

  // 게스트 사용자 생성
  const guestExists = await userRepository.findOne({
    where: { email: 'guest@example.com' },
  });

  if (!guestExists) {
    const hashedPassword = await bcrypt.hash('guest123!@#', 10);
    const guest = userRepository.create({
      email: 'guest@example.com',
      username: 'guest',
      password: hashedPassword,
      role: UserRole.GUEST,
      isActive: true,
    });
    await userRepository.save(guest);
    console.log('✅ Guest user created');
  }
};
