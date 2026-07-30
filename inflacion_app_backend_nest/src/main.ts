import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// CORS y prefijo /api replican inflacion_app_backend/server.js para que el
// frontend no necesite cambios mientras conviven ambos backends.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ipc-portal.vercel.app',
    process.env.FRONTEND_URL,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('No permitido por CORS'));
    },
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`🚀 Servidor NestJS corriendo en http://localhost:${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Error al iniciar el servidor:', error);
  process.exit(1);
});
