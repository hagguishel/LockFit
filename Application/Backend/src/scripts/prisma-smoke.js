const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const created = await prisma.planning.create({
      data: {
        nom: 'smoke ' + Date.now(),
        debut: new Date('2025-10-01T00:00:00.000Z'),
        fin: new Date('2025-10-28T23:59:00.000Z'),
      },
    });
    console.log('created', created.id);
    await prisma.planning.delete({ where: { id: created.id }});
    console.log('deleted', created.id);
  } catch (e) {
    console.error('SMOKE ERR', e);
  } finally {
    await prisma.$disconnect();
  }
})();
