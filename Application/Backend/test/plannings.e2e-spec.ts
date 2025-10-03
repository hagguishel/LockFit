import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import helmet from 'helmet';
import { AppModule } from '../src/application.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Plannings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let createdId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdId) {
      await prisma.planning.deleteMany({ where: { id: createdId } }).catch(() => void 0);
    }
    await app.close();
  });

  it('POST /plannings -> 201 crée un planning', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/plannings')
      .send({
        nom: `Programme Test ${Date.now()}`,
        debut: '2025-10-01T00:00:00.000Z',
        fin:   '2025-10-28T23:59:00.000Z',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('nom');
    createdId = res.body.id;
  });

  it('GET /plannings -> 200 liste et contient l’élément créé', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/plannings')
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    const ids = res.body.items.map((p: any) => p.id);
    expect(ids).toContain(createdId);
  });

  it('GET /plannings?from&to -> 200 filtre par chevauchement', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/plannings?from=2025-10-01&to=2025-10-31')
      .expect(200);

    const ids = res.body.items.map((p: any) => p.id);
    expect(ids).toContain(createdId);
  });

  it('GET /plannings?page=2&limit=50 -> 200 pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/plannings?page=2&limit=50')
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
  });

  it('GET /plannings/:id -> 200 détail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/plannings/${createdId}`)
      .expect(200);

    expect(res.body.id).toBe(createdId);
  });

  it('GET /plannings/does-not-exist -> 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/plannings/does-not-exist')
      .expect(404);
  });

  it('GET /plannings?from=NOPE -> 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/plannings?from=NOPE')
      .expect(400);
  });

  it('GET /plannings?from>to -> 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/plannings?from=2025-10-10&to=2025-10-01')
      .expect(400);
  });
});
