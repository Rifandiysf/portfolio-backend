import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Admin } from '../../../prisma/generated/prisma/client';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser = Admin>(
    err: unknown,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const res = context.switchToHttp().getResponse<Response>();
      res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized`);
      return null as unknown as TUser;
    }
    return user;
  }
}
