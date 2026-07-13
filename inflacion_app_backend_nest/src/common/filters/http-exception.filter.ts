import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '@prisma/client';

// Traduce errores a la misma forma { message, errors? } que devolvía
// inflacion_app_backend/middleware/errorHandler.js, mapeando los códigos de
// Prisma a los equivalentes de los códigos de Postgres (23505/23503) que
// manejaba el backend Express.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(typeof body === 'string' ? { message: body } : body);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        response
          .status(HttpStatus.CONFLICT)
          .json({ message: 'El registro ya existe' });
        return;
      }
      if (exception.code === 'P2003') {
        response
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Referencia inválida a otro registro' });
        return;
      }
      if (exception.code === 'P2025') {
        response
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Registro no encontrado' });
        return;
      }
    }

    // Sentry parity con errorHandler.js (Sentry.captureException en 5xx)
    // deliberadamente diferida — @sentry/node no está entre las deps de
    // este backend todavía; ver decisión de Fase F.
    console.error('Error:', exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Error interno del servidor' });
  }
}
