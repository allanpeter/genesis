import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prefix = process.env.API_GLOBAL_PREFIX ?? 'api';
  app.setGlobalPrefix(`${prefix}/v1`);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true });
  // Validação é feita por rota via ZodValidationPipe (@genesis/shared).

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Genesis API')
    .setDescription('API multi-tenant da plataforma Genesis')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Genesis API em http://localhost:${port}/${prefix}/v1`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger em http://localhost:${port}/${prefix}/docs`);
}

void bootstrap();
