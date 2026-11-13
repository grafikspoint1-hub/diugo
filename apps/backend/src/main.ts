import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { RequestIdMiddleware } from './common/request-id.middleware';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.OTP_HASH_SECRET || process.env.OTP_HASH_SECRET.length < 32)) {
    throw new Error('Production requires JWT_SECRET and OTP_HASH_SECRET with at least 32 characters each.');
  }
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const requestIdMiddleware = new RequestIdMiddleware();
  app.setGlobalPrefix('api/v1');
  if (process.env.TRUST_PROXY_HOPS) {
    const hops = Number(process.env.TRUST_PROXY_HOPS);
    if (!Number.isInteger(hops) || hops < 0) throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
    (app.getHttpAdapter().getInstance() as { set: (key: string, value: number) => void }).set('trust proxy', hops);
  }
  app.use(helmet());
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  if (process.env.NODE_ENV === 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.secure) return res.status(400).json({ statusCode: 400, message: 'HTTPS is required.' });
      next();
    });
  }
  app.enableCors({
    origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT || 4000, '0.0.0.0');
}
bootstrap();
