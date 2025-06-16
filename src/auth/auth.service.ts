import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      user,
      password,
    );

    if (!isPasswordValid) {
      return null;
    }

    // 마지막 로그인 시간 업데이트
    await this.usersService.updateLastLogin(user.id);

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';

    // 비밀번호 제외한 사용자 정보 반환
    const { password, ...userInfo } = user;

    return {
      accessToken,
      user: userInfo,
      expiresIn: this.getExpiresInSeconds(expiresIn),
    };
  }

  async register(registerDto: RegisterDto) {
    try {
      const user = await this.usersService.create(registerDto);

      // 생성된 사용자로 자동 로그인
      return this.login({
        email: user.email,
        password: registerDto.password,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('회원가입 중 오류가 발생했습니다.');
    }
  }

  async getProfile(user: User) {
    return this.usersService.findOne(user.id);
  }

  async refreshToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';

    return {
      accessToken,
      expiresIn: this.getExpiresInSeconds(expiresIn),
    };
  }

  private getExpiresInSeconds(expiresIn: string): number {
    // "24h", "7d", "60s" 등의 형식을 초 단위로 변환
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 24 * 60 * 60; // 기본값: 24시간
    }
  }
}
