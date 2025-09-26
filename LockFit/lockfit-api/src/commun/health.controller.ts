//Fichier test pour vérifier que l'API tourne bien; Controller = définir une route pour tester

import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  ok() {
    return { ok: true, service: 'lockfit-api' };
  }
}
