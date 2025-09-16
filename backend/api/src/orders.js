import express from 'express';
import axios from 'axios';

export default function ordersRouter(prisma) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { userId, items } = req.body; // items: [{ productId, quantity }]
    const products = await prisma.product.findMany({ where: { id: { in: items.map(i => i.productId) } } });
    const itemsWithPrice = items.map(i => {
      const p = products.find(pp => pp.id === i.productId);
      if (!p) throw new Error('Product not found');
      return { ...i, unitPrice: p.finalPrice, isDiet: Boolean(p.isDiet) };
    });

    const order = await prisma.order.create({
      data: {
        userId,
        orderItems: {
          create: itemsWithPrice.map(i => ({
            productId: i.productId,
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice,
            isDiet: i.isDiet
          }))
        }
      },
      include: { orderItems: true }
    });

    // Check diet orders threshold
    const dietOrdersCount = await prisma.order.count({
      where: {
        userId,
        orderItems: { some: { isDiet: true } }
      }
    });

    if (dietOrdersCount >= 3) {
      await prisma.user.update({ where: { id: userId }, data: { onDiet: true } });
    }

    res.status(201).json(order);
  });

  router.get('/user/:userId', async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.params.userId },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  });

  return router;
} 