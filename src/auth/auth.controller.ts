import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorator/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password';
import { ResetPasswordDto } from './dto/reset-password';
import type { Admin } from '../../prisma/generated/prisma/client';
import { ChangePasswordDto } from './dto/change-password';
import { AuthUser } from 'types/auth';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Public()
  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.logout(res);
    return { message: 'Logged out' };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Patch('change-password')
  changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId } = req.user as { userId: string };
    return this.authService.changePassword(userId, dto, res);
  }

  @Get('me')
  me(@Req() req: Request) {
    const { userId, email, name, avatarUrl } = req.user as AuthUser;
    return { id: userId, email, name, avatarUrl };
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response) {
    if (!req.user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=unauthorized`,
      );
    }

    this.authService.googleLogin(req.user as Admin, res);
    return res.redirect(`${process.env.FRONTEND_URL}/admin`);
  }
}
