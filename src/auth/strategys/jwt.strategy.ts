import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from 'types/auth';

interface JwtPayload {
  sub: string;
  email: string;
  v: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const cookies = req.cookies as
            Record<string, string | undefined> | undefined;
          return cookies?.access_token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || admin.tokenVersion !== payload.v) {
      throw new UnauthorizedException('Session expired');
    }
    return {
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      avatarUrl: admin.avatarUrl,
    };
  }
}
