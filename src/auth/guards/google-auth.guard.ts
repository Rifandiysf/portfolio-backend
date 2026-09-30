import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Admin } from '../../../prisma/generated/prisma/client';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions() {
    return { session: false };
  }

  handleRequest<TUser = Admin>(err: unknown, user: TUser | false): TUser {
    return (err || !user ? null : user) as TUser;
  }
}
