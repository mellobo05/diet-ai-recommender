import express from 'express';

export default function usersRouter(prisma) {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
  });

  router.post('/', async (req, res) => {
    const { email, name } = req.body;
    const user = await prisma.user.create({ data: { email, name } });
    res.status(201).json(user);
  });

  router.get('/:id', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  });

  router.patch('/:id/onDiet', async (req, res) => {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { onDiet: !!req.body.onDiet } });
    res.json(user);
  });

  return router;
} 