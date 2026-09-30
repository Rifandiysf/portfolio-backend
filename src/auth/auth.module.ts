import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategys/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { MailModule } from '../mail/mail.module';
import { GoogleStrategy } from './strategys/google.strategy';

@Module({
  imports: [
    PassportModule,
    MailModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AuthModule {}
