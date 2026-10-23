import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para clientes móviles y web
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Prefijo global de la API
  app.setGlobalPrefix('api/v1');

  // Interceptor global para respuestas uniformes ApiResponse<T>
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Validación estricta global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Documentación OpenAPI (Swagger)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SayNative API')
    .setDescription(
      'API REST y WebSockets de SayNative - Intercambio de idiomas 1-a-1 en vivo',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `🚀 SayNativae Backend corriendo en: http://localhost:${port}/api/v1`,
  );
  console.log(
    `📚 Swagger Docs disponible en: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
