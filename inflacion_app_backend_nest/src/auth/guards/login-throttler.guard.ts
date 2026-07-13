import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

// Mismo mensaje que inflacion_app_backend/middleware/rateLimiter.js para
// mantener paridad de respuesta entre ambos backends mientras conviven.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new ThrottlerException(
      'Demasiados intentos de inicio de sesión. Intente nuevamente en unos minutos.',
    );
  }
}
