import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  findAll(page = 1, limit = 10) {
    return this.prisma.project.findMany({
      where: { published: true },
      orderBy: { year: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(slug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: dto });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findById(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.project.delete({ where: { id } });
  }

  private async findById(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
