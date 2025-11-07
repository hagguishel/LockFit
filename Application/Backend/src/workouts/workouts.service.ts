import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { UpdatesetDto } from './dto/update-set.dto';



@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDateOrThrow(v?: string): Date | undefined {
    if (v === undefined) return undefined;
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(
        'La date doit être au format ISO (ex: 2025-01-15T10:00:00Z)',
      );
    }
    return d;
  }

  private readonly includeRelations = {
    items: {
      include: {
        sets: true,
        exercise: true,
      },
      orderBy: { order: 'asc' as const },
    },
  };

  // vérifie que le workout appartient bien au user
  private async assertOwned(workoutId: string, userId: string) {
    const w = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, utilisateurId: true },
    });

    if (!w) {
      throw new NotFoundException(`Entraînement "${workoutId}" introuvable`);
    }
    if (!w.utilisateurId || w.utilisateurId !== userId) {
      throw new ForbiddenException('Tu ne peux pas accéder à cet entraînement.');
    }
    return w;
  }

  /**
   * Créer un workout avec items et sets
   */
  async create(dto: CreateWorkoutDto, userId: string) {
    // 1) vérifier les exos
    const exerciseIds = dto.items.map((i) => i.exerciseId);
    const uniqueIds = [...new Set(exerciseIds)];

    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    if (exercises.length !== uniqueIds.length) {
      const foundIds = exercises.map((e) => e.id);
      const missing = uniqueIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Exercice(s) introuvable(s): ${missing.join(', ')}`,
      );
    }

    // 2) créer en liant le user PAR RELATION (pas par FK directe)
    return this.prisma.workout.create({
      data: {
        title: dto.title,
        note: dto.note,
        finishedAt: this.toDateOrThrow(dto.finishedAt),
        utilisateur: { connect: { id: userId } }, // 👈 la ligne qui change tout
        items: {
          create: dto.items.map((item) => ({
            order: item.order,
            exercise: { connect: { id: item.exerciseId } },
            sets: {
              create: item.sets.map((set) => ({
                reps: set.reps,
                weight: set.weight,
                rest: set.rest,
                rpe: set.rpe,
              })),
            },
          })),
        },
      },
      include: this.includeRelations,
    });
  }

  /**
   * Lister tous les workouts de l'utilisateur
   */
  async findAll(
    userId: string,
    params?: { from?: string; to?: string; finished?: boolean },
  ) {
    const where: any = {
      utilisateurId: userId,
    };

    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = this.toDateOrThrow(params.from);
      if (params.to) where.createdAt.lte = this.toDateOrThrow(params.to);
    }

    if (params?.finished !== undefined) {
      where.finishedAt = params.finished ? { not: null } : null;
    }

    const items = await this.prisma.workout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations,
    });

    return { items, total: items.length };
  }

  async findOne(id: string, userId: string) {
    await this.assertOwned(id, userId);
    return this.prisma.workout.findUnique({
      where: { id },
      include: this.includeRelations,
    });
  }

  async update(id: string, dto: UpdateWorkoutDto, userId: string) {
    await this.assertOwned(id, userId);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.finishedAt !== undefined)
      data.finishedAt = this.toDateOrThrow(dto.finishedAt);

    return this.prisma.workout.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  async remove(id: string, userId: string) {
    await this.assertOwned(id, userId);
    await this.prisma.workout.delete({ where: { id } });
    return { ok: true, id };
  }

  async finish(id: string, userId: string) {
    await this.assertOwned(id, userId);
    return this.prisma.workout.update({
      where: { id },
      data: { finishedAt: new Date() },
      include: this.includeRelations,
    });
  }

  async updateSet(
    workoutId: string,
    setId: string,
    dto: UpdatesetDto,
    userId: string,
  ) {
    await this.assertOwned(workoutId, userId);

    const set = await this.prisma.workoutSet.findUnique({
      where: { id: setId },
      include: { item: { select: { workoutId: true } } },
    });
    if (!set) throw new NotFoundException('Set introuvable');
    if (set.item.workoutId !== workoutId) {
      throw new BadRequestException('Set non lié à ce workout');
    }

    return this.prisma.workoutSet.update({
      where: { id: setId },
      data: {
        ...(dto.reps !== undefined ? { reps: dto.reps } : {}),
        ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        ...(dto.rest !== undefined ? { rest: dto.rest } : {}),
        ...(dto.rpe !== undefined ? { rpe: dto.rpe } : {}),
      },
    });
  }

  async completeSet(workoutId: string, setId: string, userId: string) {
    await this.assertOwned(workoutId, userId);

    const set = await this.prisma.workoutSet.findUnique({
      where: { id: setId },
      include: { item: { select: { workoutId: true } } },
    });
    if (!set) throw new NotFoundException('Set introuvable');
    if (set.item.workoutId !== workoutId) {
      throw new BadRequestException('Set non lié a ce workout');
    }

    // on force le type ici pour laisser passer "completed"
    return this.prisma.workoutSet.update({
      where: { id: setId },
      data: { completed: true },
    });
  }

  // dupliquer un workout (copier coller sans jamais completed)
  async duplicateWorkout(id: string) {
    const src = await this.prisma.workout.findUnique({
      where: { id },
      include: { items: { include: { sets: true } } },
    });
    if (!src) throw new NotFoundException('Workout introuvable');

    const created = await this.prisma.$transaction(async (tx) => {
      const newWork = await tx.workout.create({
        data: {
          title: src.title,
          note: src.note,
          isTemplate: false,
          scheduledFor: null,
          finishedAt: null,
        },
      });

      for (const it of src.items) {
        const newItem = await tx.workoutItem.create({
          data: {
            order: it.order,
            workoutId: newWork.id,
            exerciseId: it.exerciseId,
          },
        });
        for (const s of it.sets) {
          await tx.workoutSet.create({
            data: {
              reps: s.reps,
              weight: s.weight,
              rest: s.rest,
              rpe: s.rpe,
              workoutItemId: newItem.id,
              completed: false,
            },
          });
        }
      }
      return newWork;
    });
    return this.findOne(created.id);
  }
  // Planifier un workout: scheduledFor = date ISO
  async scheduleWorkout(id: string, scheduledForISO: string) {
    const w = await this.prisma.workout.findUnique({ where: { id } });
    if (!w) throw new NotFoundException('Workout introuvable');

    const when = this.toDateOrThrow(scheduledForISO);
    return this.prisma.workout.update({
      where: { id },
      data: { scheduledFor: when },
      include: this.includeRelations,
    });
  }
  // Lister leq workout planifier entre from/to (ISO)
  async listScheduled(params?: {from?: string; to?: string }) {
    const where: any = { scheduledFor: { not: null } };

    if (params?.from || params?.to) {
      where.scheduledFor = {
      ...(params.from ? { gte: this.toDateOrThrow(params.from) } : {}),
      ...(params.to ? { lte: this.toDateOrThrow(params.to) } : {}),
    };
  }

  return this.prisma.workout.findMany({
    where,
    orderBy: {scheduledFor: 'asc' },
    select: {
      id: true,
      title: true,
      scheduledFor: true,
      finishedAt: true,
      isTemplate: true,
    },
  });
}
}
