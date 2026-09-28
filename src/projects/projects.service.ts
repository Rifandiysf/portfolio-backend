import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Prisma } from '../../prisma/generated/prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll(page = 1, limit = 50) {
    return this.prisma.project.findMany({
      where: { published: true },
      orderBy: { year: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllAdmin() {
    return this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, published: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(dto: CreateProjectDto) {
    return this.prisma.project
      .create({ data: dto })
      .catch((err) => this.handleError(err));
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findById(id);
    return this.prisma.project
      .update({ where: { id }, data: dto })
      .catch((err) => this.handleError(err));
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.project.delete({ where: { id } });
  }

  private handleError(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictException('Slug is already used by another project');
    }
    throw err;
  }

  private async findById(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
