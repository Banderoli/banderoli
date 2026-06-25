import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { PrismaExceptionFilter } from '@banderoli/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.enableShutdownHooks();

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  Logger.log(`API Gateway running on http://localhost:${port}/api`, 'Bootstrap');
}

void bootstrap();
