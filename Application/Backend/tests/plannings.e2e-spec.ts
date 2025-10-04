import request from 'supertest';

const BASE = '/api/v1';

describe('Planning jours (e2e)', () => {
  let app: any; // récupère ton app via beforeAll si tu as déjà le setup
  let server: any; // idem
  let wid: string, pid: string, jid: string;

  it('setup: create workout + planning + jour', async () => {
    const w = await request(server).post(`${BASE}/workouts`).send({ title: 'Pull', note: 'Dos' }).expect(201);
    wid = w.body.id;

    const p = await request(server).post(`${BASE}/plannings`).send({ nom: 'S41', debut: '2025-10-05', fin: '2025-10-10' }).expect(201);
    pid = p.body.id;

    const j = await request(server).post(`${BASE}/plannings/${pid}/jours`).send({ date: '2025-10-06', workoutId: wid }).expect(201);
    jid = j.body.id;
  });

  it('PATCH jour: change date (dans la période)', async () => {
    const r = await request(server).patch(`${BASE}/plannings/${pid}/jours/${jid}`).send({ date: '2025-10-07' }).expect(200);
    expect(r.body.date).toContain('2025-10-07');
    expect(r.body.status).toBe('PLANNED');
  });

  it('FINISH jour: status DONE + doneAt', async () => {
    const r = await request(server).post(`${BASE}/plannings/${pid}/jours/${jid}/finish`).send({}).expect(200);
    expect(r.body.status).toBe('DONE');
    expect(r.body.doneAt).toBeDefined();
  });

  it('DELETE jour: 204', async () => {
    await request(server).delete(`${BASE}/plannings/${pid}/jours/${jid}`).expect(204);
  });
});
