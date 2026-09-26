import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async handle(dto: CreateContactDto) {
    await this.prisma.contactMessage.create({ data: dto });
    await this.mail.sendContactEmail(dto);
  }
}
