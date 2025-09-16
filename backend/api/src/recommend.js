import express from 'express';
import axios from 'axios';

function scoreProduct(p) {
  // lower price and lower calories are better; bonus for higher protein
  const priceScore = 1 / (1 + p.finalPrice);
  const calScore = 1 / (1 + (p.calories || 300));
  const proteinScore = (p.proteinGrams || 0) / 50;
  return priceScore * 0.5 + calScore * 0.3 + proteinScore * 0.2;
}

export default function recommendRouter(prisma) {
  const router = express.Router();

  router.get('/top', async (req, res) => {
    const limit = Number(req.query.limit || 10);
    const aiUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000') + '/classify/batch';

    const products = await prisma.product.findMany({});

    // Ask AI service to classify
    const { data: ai } = await axios.post(aiUrl, {
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        keywords: p.keywords,
        nutrition: {
          calories: p.calories,
          proteinGrams: p.proteinGrams,
          fatGrams: p.fatGrams,
          carbsGrams: p.carbsGrams
        }
      }))
    });

    const idToDiet = new Map(ai.results.map(r => [r.id, r.is_diet]));

    // Update cached isDiet flags
    await Promise.all(products.map(p => prisma.product.update({ where: { id: p.id }, data: { isDiet: Boolean(idToDiet.get(p.id)) } })));

    const dietProducts = products
      .filter(p => Boolean(idToDiet.get(p.id)))
      .map(p => ({ ...p, score: scoreProduct(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    res.json({ items: dietProducts });
  });

  return router;
} 