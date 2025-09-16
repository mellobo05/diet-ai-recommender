# Diet Product Recommender

Full-stack app: React + Tailwind (frontend), Express + Prisma + PostgreSQL (API), FastAPI (AI classifier).

## Structure
- `backend/api` – Node.js Express API
- `backend/ai` – Python FastAPI classifier
- `frontend` – React + Vite + Tailwind UI
- `prisma` – shared schema
- `k8s` – Kubernetes manifests

## Local Development

Requirements: Docker, Docker Compose, Node 20+, Python 3.11+, pnpm/npm

1. Copy env and set keys
```bash
cp .env.example .env
```

2. Start services
```bash
docker compose up --build
```

3. In API container (or locally), run Prisma migrations and seed
```bash
# from host
docker compose exec api npx prisma migrate dev --name init
docker compose exec api npm run seed
```

4. Sync mock products
```bash
curl -X POST http://localhost:4000/products/sync
```

5. Get recommendations
```bash
curl http://localhost:4000/recommend/top
```

6. Frontend
Open `http://localhost:5173` (dev server).

## Deployment (Kubernetes)

- Build and push images
```bash
docker build -t yourrepo/diet-api:latest backend/api
docker build -t yourrepo/diet-ai:latest backend/ai
docker build -t yourrepo/diet-frontend:latest frontend

docker push yourrepo/diet-api:latest
docker push yourrepo/diet-ai:latest
docker push yourrepo/diet-frontend:latest
```

- Create secrets (example)
```bash
kubectl create secret generic diet-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/dietdb?schema=public" \
  --from-literal=OPENAI_API_KEY="sk-..."
```

- Apply manifests
```bash
kubectl apply -f k8s/ai-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

## Notes
- Recommendation ranks cheap and healthy using calories/protein and `finalPrice` (price with discount).
- User `onDiet` auto-flips true after 3 orders containing diet items.
- AI service uses heuristics and optional LLM filter (set `OPENAI_API_KEY`). 