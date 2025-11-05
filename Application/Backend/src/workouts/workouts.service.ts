import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { UpdatesetDto } from './dto/update-set.dto';


@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper : convertit string ISO en Date ou lance une erreur
  private toDateOrThrow(v?: string): Date | undefined {
    if (v === undefined) return undefined;
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(
        'La date doit être au format ISO (ex: 2025-01-15T10:00:00Z)'
      );
    }
    return d;
  }

  // Include standard pour toutes les requêtes
  private readonly includeRelations = {
    items: {
      include: {
        sets: true,
        exercise: true,
      },
      orderBy: { order: 'asc' as const },
    },
  };

  /**
   * Créer un workout avec items et sets
   */
  async create(dto: CreateWorkoutDto) {
    // Vérifier que tous les exercices existent AVANT de créer
    const exerciseIds = dto.items.map(i => i.exerciseId);
    const uniqueIds = [...new Set(exerciseIds)];

    const exercises = await this.prisma.exercise.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    if (exercises.length !== uniqueIds.length) {
      const foundIds = exercises.map(e => e.id);
      const missing = uniqueIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(
        `Exercice(s) introuvable(s): ${missing.join(', ')}`
      );
    }

    // Création
    return this.prisma.workout.create({
      data: {
        title: dto.title,
        note: dto.note,
        finishedAt: this.toDateOrThrow(dto.finishedAt),
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

  async updateSet(workoutId: string, setId: string, dto: UpdatesetDto) {
    const set = await this.prisma.workoutSet.findUnique({
      where: { id: setId },
      include: { item: { select: {workoutId: true } } },
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
  /**
   * Lister tous les workouts avec filtres temporels
   */
  async findAll(params?: { from?: string; to?: string; finished?: boolean }) {
    const where: any = {};

    // Filtre par date de création
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = this.toDateOrThrow(params.from);
      if (params.to) where.createdAt.lte = this.toDateOrThrow(params.to);
    }

    // Filtre par statut terminé/en cours
    if (params?.finished !== undefined) {
      where.finishedAt = params.finished
        ? { not: null }  // Terminés
        : null;          // En cours
    }

    const items = await this.prisma.workout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations,
    });

    return { items, total: items.length };
  }

  /**
   * Récupérer un workout par ID
   */
  async findOne(id: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id },
      include: this.includeRelations,
    });

    if (!workout) {
      throw new NotFoundException(`Entraînement "${id}" introuvable`);
    }

    return workout;
  }

  /**
   * Mettre à jour un workout (sans toucher aux items/sets)
   */
  async update(id: string, dto: UpdateWorkoutDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.finishedAt !== undefined) data.finishedAt = this.toDateOrThrow(dto.finishedAt);

    return this.prisma.workout.update({
      where: { id },
      data,
      include: this.includeRelations,
    });
  }

  /**
   * Supprimer un workout (cascade delete sur items/sets)
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.workout.delete({ where: { id } });
    return { ok: true, id };
  }

  /**
   * Marquer un workout comme terminé
   */
  async finish(id: string) {
    await this.findOne(id);
    return this.prisma.workout.update({
      where: { id },
      data: { finishedAt: new Date() },
      include: this.includeRelations, // ✅ CORRIGÉ
    });
  }

  async completeSet(workoutId: string, setId: string) {
    //1) on verife que le set existe
    const set = await this.prisma.workoutSet.findUnique({
      where: { id: setId },
      include: { item: { select: { workoutId: true } } },
    });
    if (!set) throw new NotFoundException('Set introuvable');
    if (set.item.workoutId !== workoutId) {
      throw new BadRequestException('Set non lié a ce workout');
    }

    //2) si deja termine en renvoie
    if (set.completed) return set;

    //3) termine
    return this.prisma.workoutSet.update({
      where: { id: setId },
      data: { completed: true },
    });
  }
}
