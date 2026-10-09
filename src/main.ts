import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ACCESS_TOKEN_COOKIE } from './auth/auth.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Required for JwtAuthGuard to read request.cookies.access_token.
  // Must be registered before the routes are hit.
  app.use(cookieParser());

  // The browser front-end runs on a different port, so it is a cross-origin
  // caller. `credentials: true` is what lets the access_token cookie travel;
  // it also means the origin must be explicit (never `*`). `FRONTEND_ORIGIN`
  // may be a comma-separated list; the default covers the local dev servers.
  app.enableCors({
    origin: (process.env.FRONTEND_ORIGIN ??
      'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('Backend API endpoints')
    .setVersion('1.0')
    .addBearerAuth()
    // Matches the cookie set by POST /user/sign-in. Without this the
    // @ApiCookieAuth() on the route references a scheme that does not exist,
    // and Swagger UI has no field to send the cookie from.
    .addCookieAuth(ACCESS_TOKEN_COOKIE)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}
bootstrap();
