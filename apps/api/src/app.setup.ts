import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import {
  type EnvironmentVariables,
  corsOrigins,
} from './config/env.validation';
import { SocketIoAdapter } from './realtime/socket-io.adapter';

/** Global HTTP setup shared by main.ts and the e2e tests. */
export function configureApp(app: NestExpressApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const origins = corsOrigins(
    config.get('CORS_ORIGINS', { infer: true }),
    config.get('NODE_ENV', { infer: true }),
  );

  app.set(
    'trust proxy',
    parseTrustProxy(config.get('TRUST_PROXY', { infer: true })),
  );
  app.use(helmet());
  app.enableCors({ origin: origins, credentials: true });
  app.useWebSocketAdapter(new SocketIoAdapter(app, origins));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('District VIII API')
      .setDescription(
        'Bookings for 8-ball pool tables and PS5 stations, the food menu, and the admin panel. ' +
          'Times are Asia/Kolkata; a business date covers 12 PM to 4 AM the next morning by default.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/json' });
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value;
}
