import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app/app.module';
import { getEnv, getEnvList } from './app/config/env';

function expandCorsOrigins(origins: string[]): string[] {
  const normalized = new Set(
    origins.map(origin => origin.trim()).filter(Boolean),
  );

  for (const origin of Array.from(normalized)) {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost') {
        url.hostname = '127.0.0.1';
        normalized.add(url.origin);
      } else if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost';
        normalized.add(url.origin);
      }
    } catch {
      // Ignore malformed origin values and keep original behavior.
    }
  }

  return Array.from(normalized);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const globalPrefix = 'api';
  const port = Number(getEnv('PORT'));
  const backendUrl = getEnv('BACKEND_URL');
  const corsOrigins = expandCorsOrigins(getEnvList('CORS_ORIGINS'));

  app.enableShutdownHooks();

  app.setGlobalPrefix(globalPrefix);

  // Security headers — CSP disabled (API-only server; nginx handles frontend headers).
  // crossOriginResourcePolicy set to cross-origin so SVG badges are embeddable on GitHub.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(port);
  Logger.log(`Application is running on ${backendUrl}/${globalPrefix}`);
}

bootstrap();
