import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { loginSchema } from './dto/login.schema';
import type { LoginDto } from './dto/login.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { RequestWithUser } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';

// Port 1:1 de inflacion_app_backend/routes/authRoutes.js + controllers/authController.js
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: RequestWithUser) {
    return request.user;
  }
}
