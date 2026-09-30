import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { Admin } from '../../prisma/generated/prisma/client';
import { ChangePasswordDto } from './dto/change-password';
import { TokenPayload } from 'types/auth';

const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly baseCookie: CookieOptions;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not set');
    }
    this.refreshSecret = refreshSecret;

    this.baseCookie = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    };
  }

  async login(dto: LoginDto, res: Response) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, admin.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    this.issueTokens(admin, res);
    return { email: admin.email };
  }

  async refresh(req: Request, res: Response) {
    const cookies = req.cookies as
      Record<string, string | undefined> | undefined;
    const token = cookies?.refresh_token;
    if (!token) throw new UnauthorizedException('No refresh token');

    let payload: TokenPayload;
    try {
      payload = this.jwt.verify<TokenPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Session expired');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || admin.tokenVersion !== payload.v) {
      throw new UnauthorizedException('Session expired');
    }

    this.issueTokens(admin, res);
    return { email: admin.email };
  }

  logout(res: Response) {
    res.clearCookie('access_token', {
      ...this.baseCookie,
      httpOnly: true,
      path: '/',
    });
    res.clearCookie('refresh_token', {
      ...this.baseCookie,
      httpOnly: true,
      path: '/auth',
    });
    res.clearCookie('csrf_token', {
      ...this.baseCookie,
      httpOnly: false,
      path: '/',
    });
  }

  async forgotPassword(email: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizeEmail(email) },
    });

    if (admin) {
      const rawToken = randomBytes(32).toString('hex');
      const hashed = createHash('sha256').update(rawToken).digest('hex');
      await this.prisma.admin.update({
        where: { id: admin.id },
        data: {
          resetToken: hashed,
          resetTokenExpiry: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await this.mail.sendPasswordResetEmail(admin.email, rawToken);
    }

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, password: string) {
    const hashed = createHash('sha256').update(token).digest('hex');
    const admin = await this.prisma.admin.findFirst({
      where: { resetToken: hashed, resetTokenExpiry: { gt: new Date() } },
    });
    if (!admin) throw new BadRequestException('Invalid or expired reset link');

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Password has been reset. Please log in again.' };
  }

  async changePassword(adminId: string, dto: ChangePasswordDto, res: Response) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, admin.password);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword, tokenVersion: { increment: 1 } },
    });

    this.issueTokens(updated, res);
    return { message: 'Password updated' };
  }

  async validateGoogleUser(data: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<Admin> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: normalizeEmail(data.email) },
    });
    if (!admin) {
      throw new ForbiddenException('This Google account is not authorized');
    }

    return this.prisma.admin.update({
      where: { id: admin.id },
      data: {
        name: data.name ?? admin.name,
        avatarUrl: data.avatarUrl ?? admin.avatarUrl,
      },
    });
  }

  googleLogin(admin: Admin, res: Response) {
    this.issueTokens(admin, res);
  }

  private issueTokens(admin: Admin, res: Response) {
    const payload: TokenPayload = {
      sub: admin.id,
      email: admin.email,
      v: admin.tokenVersion,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: this.refreshSecret,
    });

    res.cookie('access_token', accessToken, {
      ...this.baseCookie,
      httpOnly: true,
      path: '/',
      maxAge: ACCESS_TTL_MS,
    });
    res.cookie('refresh_token', refreshToken, {
      ...this.baseCookie,
      httpOnly: true,
      path: '/auth',
      maxAge: REFRESH_TTL_MS,
    });
    res.cookie('csrf_token', randomBytes(24).toString('hex'), {
      ...this.baseCookie,
      httpOnly: false,
      path: '/',
      maxAge: REFRESH_TTL_MS,
    });
  }
}
