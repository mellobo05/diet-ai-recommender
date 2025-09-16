import express from 'express';
import axios from 'axios';

function computeFinalPrice(price, discountPct) {
  const pct = Number(discountPct || 0);
  return Math.max(0, Number(price) * (1 - pct / 100));
}

export default function productsRouter(prisma) {
  const router = express.Router();

  // Fetch mock products and upsert into DB
  router.post('/sync', async (_req, res) => {
    const { data } = await axios.get('https://fakestoreapi.com/products');
    const upserts = await Promise.all(
      data.slice(0, 20).map(async (p) => {
        const discountPct = Math.floor(Math.random() * 30); // random discount
        const finalPrice = computeFinalPrice(p.price, discountPct);
        const nutrition = {
          calories: Math.floor(50 + Math.random() * 450),
          proteinGrams: Number((Math.random() * 30).toFixed(1)),
          fatGrams: Number((Math.random() * 25).toFixed(1)),
          carbsGrams: Number((Math.random() * 60).toFixed(1))
        };
        const keywords = p.category ? [p.category] : [];
        return prisma.product.upsert({
          where: { externalId: String(p.id) },
          update: {
            title: p.title,
            description: p.description,
            category: p.category,
            price: p.price,
            discountPct,
            finalPrice,
            calories: nutrition.calories,
            proteinGrams: nutrition.proteinGrams,
            fatGrams: nutrition.fatGrams,
            carbsGrams: nutrition.carbsGrams,
            keywords,
          },
          create: {
            externalId: String(p.id),
            title: p.title,
            description: p.description,
            category: p.category,
            price: p.price,
            discountPct,
            finalPrice,
            calories: nutrition.calories,
            proteinGrams: nutrition.proteinGrams,
            fatGrams: nutrition.fatGrams,
            carbsGrams: nutrition.carbsGrams,
            keywords,
          }
        });
      })
    );
    res.json({ count: upserts.length });
  });

  router.get('/', async (_req, res) => {
    const items = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
  });

  return router;
} 