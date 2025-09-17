import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';
import usersRouter from './users.js';
import productsRouter from './products.js';
import ordersRouter from './orders.js';
import recommendRouter from './recommend.js';

dotenv.config({ path: process.env.DOTENV_PATH || '.env' });

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/users', usersRouter(prisma));
app.use('/products', productsRouter(prisma));
app.use('/orders', ordersRouter(prisma));
app.use('/recommend', recommendRouter(prisma));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  logger.info({ port }, 'API server listening');
}); 