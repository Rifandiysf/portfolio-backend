import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { Admin } from '../../prisma/generated/prisma/client';

const isProd = process.env.NODE_ENV === 'production';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async login(dto: LoginDto, res: Response) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
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

    let payload: { sub: string; v: number };
    try {
      payload = this.jwt.verify<{ sub: string; v: number }>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Session expired');
    }

    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || admin.tokenVersion !== payload.v)
      throw new UnauthorizedException('Session expired');

    this.issueTokens(admin, res);
    return { email: admin.email };
  }

  logout(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth' });
    res.clearCookie('csrf_token', { path: '/' });
  }

  async forgotPassword(email: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
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

  async validateGoogleUser(email: string): Promise<Admin> {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin)
      throw new ForbiddenException('This Google account is not authorized');
    return admin;
  }

  googleLogin(admin: Admin, res: Response) {
    this.issueTokens(admin, res);
  }

  private issueTokens(admin: Admin, res: Response) {
    const payload = {
      sub: admin.id,
      email: admin.email,
      v: admin.tokenVersion,
    };
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth',
    });
    res.cookie('csrf_token', randomBytes(24).toString('hex'), {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
