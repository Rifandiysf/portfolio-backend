import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async sendContactEmail(data: {
    name: string;
    email: string;
    service?: string;
    message: string;
  }) {
    await this.resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: process.env.CONTACT_RECEIVER_EMAIL!,
      replyTo: data.email,
      subject: `New message from ${data.name} (${data.service ?? 'General'})`,
      text: data.message,
    });
  }

  async sendPasswordResetEmail(to: string, rawToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await this.resend.emails.send({
      from: 'Portfolio Admin <onboarding@resend.dev>',
      to,
      subject: 'Reset your admin password',
      text: `Click the link below to reset your password. This link expires in 30 minutes.\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    });
  }
}
