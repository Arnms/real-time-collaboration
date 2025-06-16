import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // CORS 설정
  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger 설정
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Real-time Collaboration API')
      .setDescription('실시간 협업 도구 API 문서')
      .setVersion('1.0')
      .addTag('auth', '인증 관련 API')
      .addTag('users', '사용자 관리 API')
      .addTag('documents', '문서 관리 API')
      .addTag('rooms', '룸 관리 API')
      .addTag('collaboration', '실시간 협업 API')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'JWT 토큰을 입력하세요',
          in: 'header',
        },
        'access-token',
      )
      .addServer('http://localhost:3001', '로컬 개발 서버')
      .addServer('https://api.your-domain.com', '프로덕션 서버')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Real-time Collaboration API Docs',
    });

    console.log('Swagger UI available at: http://localhost:3001/api/docs');
  }

  const port = configService.get('PORT') || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
