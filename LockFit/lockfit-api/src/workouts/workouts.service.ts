//Fichier couche métier, qui parle à la base de données via Prisma. Ce fichier sert juste a executé l'action demandée, il ne gère pas les validations

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';

@Injectable() //Cette classe devient injectable
export class WorkoutsService {
    constructor (private readonly prisma: PrismaService) {}

    async create(dto: CreateWorkoutDto) {        // Ici, on créer une ligne dans la table Workout
        return this.prisma.workout.create({      //Correspond au modele Workout definit dans schema.prisma
            data: {                              //avec create, prisma commence a insérer en base
                title: dto.title,
                // id, created at et update at sont remplis automatiquement par Prisma
            },
        });
    }

    async findAll() {                             //On liste toutes les séances
        return this.prisma.workout.findMany({
            orderBy: { createdAt: 'desc'},        //Les plus récentes d'abord
        });
    }

    async findOne(id: string) {
        const w = await this.prisma.workout.findUnique({ where: { id } }); //chercher par id dans la base de données
        if (!w) throw new NotFoundException('Entrainement introuvable');
        return w
    }

    async update(id: string, dto: UpdateWorkoutDto) { //update un entraineùent, tous les champs peuvent ne pas être tous modifiés
        await this.findOne(id);
        return this.prisma.workout.update({
            where: { id },
            data: {
                ...(dto.title !== undefined ? { title: dto.title } : {}), //Ici, on change la date suivant la date de l'update
                ...(dto.finishedAt !== undefined ? { finishedAt: new Date(dto.finishedAt) } : {}),
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