import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';



import { AppModule } from '../src/application.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Workouts e2e', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;
  let createdId = '';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // même config que dans main/principal.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();
    server = app.getHttpServer();

    // reset DB
    prisma = app.get(PrismaService);
    await prisma.workout.deleteMany();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /health -> 200', async () => {
    const res = await request(server).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ ok: true, service: 'lockfit-api' });
  });

  it('POST /workouts -> 400 sans title', async () => {
    await request(server).post('/api/v1/workouts').send({ note: 'no title' }).expect(400);
  });

  it('POST /workouts -> 400 si champ inconnu', async () => {
    await request(server).post('/api/v1/workouts').send({ title: 'ok', hacker: true }).expect(400);
  });

  it('POST /workouts -> 201 (création)', async () => {
    const payload = { title: 'Push Day', note: 'Chest', finishedAt: '2025-09-30T10:00:00Z' };
    const res = await request(server).post('/api/v1/workouts').send(payload).expect(201);
    expect(res.body).toMatchObject({
      title: 'Push Day',
      note: 'Chest',
      finishedAt: '2025-09-30T10:00:00.000Z',
    });
    createdId = res.body.id;
    expect(createdId).toBeDefined();
  });

  it('GET /workouts -> 200 + {items,total}', async () => {
    const res = await request(server).get('/api/v1/workouts').expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBe(res.body.items.length);
    const ids = res.body.items.map((w: any) => w.id);
    expect(ids).toContain(createdId);
  });

  it('GET /workouts?from&to -> 200 (filtre période)', async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const to = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
    const res = await request(server)
      .get(`/api/v1/workouts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('GET /workouts/:id -> 200 (détail)', async () => {
    const res = await request(server).get(`/api/v1/workouts/${createdId}`).expect(200);
    expect(res.body.id).toBe(createdId);
  });

  it('PATCH /workouts/:id -> 400 si finishedAt invalide', async () => {
    await request(server).patch(`/api/v1/workouts/${createdId}`).send({ finishedAt: 'bad' }).expect(400);
  });

  it('PATCH /workouts/:id -> 200 (update partiel)', async () => {
    const res = await request(server)
      .patch(`/api/v1/workouts/${createdId}`)
      .send({ note: 'Chest + Shoulders', finishedAt: '2025-09-30T11:00:00Z' })
      .expect(200);
    expect(res.body.note).toBe('Chest + Shoulders');
    expect(res.body.finishedAt).toBe('2025-09-30T11:00:00.000Z');
  });

  it('POST /workouts/:id/finish -> 200', async () => {
    const res = await request(server).post(`/api/v1/workouts/${createdId}/finish`).expect(200);
    expect(isNaN(new Date(res.body.finishedAt).getTime())).toBe(false);
  });

  it('DELETE /workouts/:id -> 200', async () => {
    const res = await request(server).delete(`/api/v1/workouts/${createdId}`).expect(200);
    expect(res.body).toEqual({ ok: true, id: createdId });
  });

  it('GET /workouts/:id -> 404 après suppression', async () => {
    await request(server).get(`/api/v1/workouts/${createdId}`).expect(404);
  });
});
