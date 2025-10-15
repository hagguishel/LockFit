//Fichier couche métier, qui parle à la base de données via Prisma. Ce fichier sert juste a executé l'action demandée, il ne gère pas les validations

import { Injectable, NotFoundException, BadRequestException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto, CreateWorkoutItemDto, CreateWorkoutSetDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';

@Injectable() //Cette classe devient injectable
export class WorkoutsService {
    constructor (private readonly prisma: PrismaService) {}

    private toDateOrThrow(v?: string) { //Converti une String en Date (sinon 404)
        if (v === undefined) return undefined;
        const d = new Date(v);
        if (isNaN(d.getTime())) throw new BadRequestException('La date doit être au format ISO (ex : 2025-09-30T10:00:00Z)')
        return d;
    }

    async create(dto: CreateWorkoutDto) {        // Ici, on créer une ligne dans la table Workout
        return this.prisma.workout.create({      //Correspond au modele Workout definit dans schema.prisma
            data: {                              //avec create, prisma commence a insérer en base
                title: dto.title,
                note: dto.note,
                finishedAt: this.toDateOrThrow(dto.finishedAt),
                // id, created at et update at sont remplis automatiquement par Prisma
                items : {
                  create: dto.items.map((i) => ({
                    order: i.order,
                    exercise: { connect: { id: i.exerciseId } },
                    sets: {
                      create: i.sets.map((s) => ({
                        reps: s.reps,
                        weight: s.weight,
                        rest: s.rest,
                        rpe: s.rpe,
                      })),
                    },
                  })),
                },
            },
            include: { items: { include: { sets: true, exercise: true } } },
        });
    }

    async findAll(params?: { from?: string; to?: string}) {
        const where: any = {};
        if (params?.from || params?.to) {
            where.createdAt = {};
            if (params.from) where.createdAt.gte = this.toDateOrThrow(params.from);
            if (params.to) where.createdAt.lte = this.toDateOrThrow(params.to);
        }
        const items = await this.prisma.workout.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { sets: true, exercise: true } } },
        });                           //On liste toutes les séances
        return { items, total: items.length };
    }

    async findOne(id: string) {
        const w = await this.prisma.workout.findUnique({
        where: { id },
        include: { items: { include: { sets: true, exercise:true } } } },
      ); //chercher par id dans la base de données
        if (!w) throw new NotFoundException('Entraînement introuvable');
        return w
    }

    async update(id: string, dto: UpdateWorkoutDto) { //update un entraineùent, tous les champs peuvent ne pas être tous modifiés
        await this.findOne(id);
        return this.prisma.workout.update({
            where: { id },
            data: {
                ...(dto.title !== undefined ? { title: dto.title } : {}), //Ici, on change la date suivant la date de l'update
                ...(dto.note !== undefined ? { note: dto.note } :  {}),
                ...(dto.finishedAt !== undefined
                    ? { finishedAt: this.toDateOrThrow(dto.finishedAt) }
                    : {}),
            },
        });
    }

    async remove(id: string) {      //fonction asynchrone qui permet de supprimer un entrainement
        await this.findOne(id);
        await this.prisma.workout.delete({ where: { id } });
        return { ok: true, id};
    }

    async finish(id: string) {      //fonction qui marque un entrainement comme terminé
        await this.findOne(id);
        return this.prisma.workout.update({
            where: { id },
            data: {
                finishedAt: new Date() }
        });
    }
}
