import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import type { EnvironmentVariables } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  setupSwagger(app);

  const port = app
    .get<ConfigService<EnvironmentVariables, true>>(ConfigService)
    .get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(
    `API ready on http://localhost:${port} (Swagger at /docs)`,
    'Bootstrap',
  );
}

void bootstrap();
