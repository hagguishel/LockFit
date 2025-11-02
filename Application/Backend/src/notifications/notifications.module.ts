import { Module } from '@nestjs/common';
import { SendgridService } from './sendgrid.service';


@Module({
  providers: [SendgridService], // rend disponible le service
  exports: [SendgridService],   // permet de l'injecter dans d'autres modules
})
export class NotificationsModule {}
