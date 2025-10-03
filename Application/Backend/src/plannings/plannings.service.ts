// le fichier sert à valider les dates en JS et on insère via Prisma dans la table Planning
import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerPlanningDto } from './dto/creer-planning.dto';
import { ListPlanningsQuery } from './dto/list-plannings.query';
import { AjouterJourDto } from './dto/ajouter-jour.dto';
import { decrypt } from 'dotenv';


/**
 * Service = logique métier : conversions, règles, appels DB (Prisma)
 * - Convertit les strings ISO en Date
 * - Vérifie les règles (début <= fin)
 * - Parle à la DB via Prisma
 */
@Injectable()
export class PlanningsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Création d'un planning : applique les règles puis écrit en DB.
   * Règles:
   *  - dates parsables (format ISO)
   *  - debut <= fin
   */
  async create(dto: CreerPlanningDto) {
    // 1) Convertir les strings ISO en Date JS
    const debut = new Date(dto.debut);
    const fin = new Date(dto.fin);

    // 2) Vérifs simples : formats + cohérence
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      throw new BadRequestException('Dates invalides (format ISO requis)');
    }
    if (debut > fin) {
      throw new BadRequestException('La date de début doit être ≤ à la date de fin');
    }

    // 3) Écriture DB via Prisma (await pour catcher les erreurs)
    try {
      return await this.prisma.planning.create({
        data: { nom: dto.nom, debut, fin },
      });
    } catch (e) {
      console.error('[PlanningsService.create] Prisma error:', e);
      throw new InternalServerErrorException('Erreur lors de la création du planning');
    }
  }

  /**
   * Liste paginée + filtres temporels (chevauchement de fenêtre)
   * - Si "from" ET "to" : on retient les plannings qui CHEVAUCHENT la fenêtre,
   *   i.e. (fin >= from) ET (debut <= to).
   * - Si "from" seul  : fin >= from
   * - Si "to" seul    : debut <= to
   * - Renvoie { items, total } (format homogène dans l'app)
   */
  async list(q: ListPlanningsQuery) {
    // Valeurs par défaut + bornage
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 100);

    // Parsing optionnel des bornes de dates
    const from = q.from ? new Date(q.from) : undefined;
    const to   = q.to   ? new Date(q.to)   : undefined;

    // Validation des bornes (si présentes)
    if (from && isNaN(from.getTime())) throw new BadRequestException('Paramètre "from" invalide');
    if (to   && isNaN(to.getTime()))   throw new BadRequestException('Paramètre "to" invalide');
    if (from && to && from > to)       throw new BadRequestException('"from" doit être ≤ "to"');

    // Construction dynamique du WHERE (chevauchement)
    const AND: any[] = [];
    if (from) AND.push({ fin:   { gte: from } }); // chevauche si la fin est après le début de fenêtre
    if (to)   AND.push({ debut: { lte: to }   }); // chevauche si le début est avant la fin de fenêtre
    const where = AND.length ? { AND } : {};

    try {
      // Requête paginée + total en parallèle
      const [items, total] = await Promise.all([
        this.prisma.planning.findMany({
          where,
          orderBy: { debut: 'asc' },  // tri lisible (du plus proche au plus lointain)
          skip: (page - 1) * limit,   // offset de pagination
          take: limit,                // taille de page
        }),
        this.prisma.planning.count({ where }),
      ]);
      // Format standardisé (facile à consommer côté front)
      return { items, total };
    } catch (e) {
      console.error('[PlanningsService.list] Prisma error:', e);
      throw new InternalServerErrorException('Erreur lors de la récupération des plannings');
    }
  }
  /**
 * Détail d'un planning par ID (inclut ses jours + workout de chaque jour).
 * - 404 si l'ID n'existe pas.
 */
  async findOne(id: string) {
    try {
      const planning = await this.prisma.planning.findUnique({
        where: { id },
        include: {
          jours: {
            orderBy: { date: 'asc' },
            include: { workout: true },
          },
        },
      });
      if (!planning) {
        throw new NotFoundException('Planning non trouvé');
      }
      return planning;
    } catch (e) {
      if (!(e instanceof NotFoundException)) {
        console.error('[PlanningService.findOne] Prisma error:', e);
        throw new InternalServerErrorException('Erreur lors de la récupération du planning');
      }
      throw e;
    }
  }

  /**
 * Ajoute un jour au planning.
 */
  async addJour(planningId: string, dto: AjouterJourDto) {
    // 1) le Planning dois exister
    const planning = await this.prisma.planning.findUnique({ where: { id: planningId } });
    if (!planning) throw new NotFoundException('Planning non trouvé');

    // 2) Parse date
    const date = new Date(dto.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Date invalide (format ISO Requis)');
    }
    // 3) Date [debut...fin]
    if (date < planning.debut || date > planning.fin) {
      throw new BadRequestException('La date dois etre dans la periode du planning');
    }
    // 4) Workout dois exister
    const workout = await this.prisma.workout.findUnique({ where: { id: dto.workoutId } });
    if (!workout) throw new NotFoundException('workout inexistant');

    // 5) insert
    try {
      return await this.prisma.planningJour.create({
        data: {
          date,
          note: dto.note ?? null,
          planningId,
          workoutId: dto.workoutId,
        },
        include: { workout:true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        //unique constraint (planning, date, workoutId)
        throw new ConflictException('Ce workout est deja planifié ce jour dans ce planning');
      }
      if (e?.code === 'P2003') {
        // foreign key
        throw new BadRequestException('Clé étrangère invalide (planningId ou workoutId)');
      }
      console.error('[PlanningService.addJour] Prisma error:', e);
      throw new InternalServerErrorException("Erruer lors de l'ajout du jour");
    }
  }
}
