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
}
