import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// ttl/limit igual que inflacion_app_backend/middleware/rateLimiter.js
// (windowMs: 15 * 60 * 1000, max: 10).
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 15 * 60 * 1000, limit: 10 }])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
