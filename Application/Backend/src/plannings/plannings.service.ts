// le ficher sert à valide les dates en JS et On insère via Prisma dans la table Planning
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // adapte le chemin
import { CreerPlanningDto } from './dto/creer-planning.dto';
/**
 * Service = logique métier : conversions, règles, appels DB (Prisma)
 * - Convertit les strings ISO en Date
 * - Vérifie les règles (début <= fin)
 * - Parle à la DB via Prisma
 */
@Injectable()
export class PlanningsService {
	constructor(private readonly prisma: PrismaService) {}          // Injection du client Prisma
		async create(dto: CreerPlanningDto) {			// 1) Convertir les strings ISO en Date JS
			const debut = new Date(dto.debut);
			const fin = new Date(dto.fin);

		if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {  // 2) Vérifs simples : formats + cohérence
			throw new BadRequestException('Dates invalides (format ISO requis)');
		}
		if (debut > fin) {                                     // Règle métier : la période doit être cohérente
			throw new BadRequestException('La date de début doit etre <= a la date de fin');
		}
		return this.prisma.planning.create({		       // 3) Écriture DB via Prisma
			data: {
				nom: dto.nom,
				debut,
				fin,
			},
		});
	} catch (e: any) {
		console.error('[PlanningService.create] Prisma error:', e);
		throw new InternalServerErrorException('Erreur lors de la creation du planning');
	}
}
