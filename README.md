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

## Deployment (Azure)

### 1) Create Azure resources
- Azure Database for PostgreSQL Flexible Server (dev size). Get the `postgresql://` URL (use `sslmode=require`).
- Two Azure App Services:
  - API: Node 20, Linux.
  - AI: Python 3.11, Linux.
- Azure Static Web Apps for the frontend.

### 2) Set app settings
- API App Service:
  - `DATABASE_URL`: postgresql://USER:PASS@HOST:5432/DB?sslmode=require&schema=public
  - `PORT`: 4000
  - `AI_SERVICE_URL`: https://<your-ai-app>.azurewebsites.net
- AI App Service:
  - `LLM_PROVIDER`: google
  - `GOOGLE_API_KEY`: <your key>
  - `LLM_MODEL`: gemini-1.5-flash
- Static Web Apps:
  - `VITE_API_BASE`: https://<your-api-app>.azurewebsites.net

Startup commands (App Service → Configuration → General settings):
- API: `bash -lc "npx prisma generate && npx prisma migrate deploy && node src/server.js"`
- AI: `uvicorn main:app --host 0.0.0.0 --port 8000`

### 3) GitHub Actions secrets
- In repo Settings → Secrets and variables → Actions:
  - `AZURE_WEBAPP_NAME_API` and `AZURE_WEBAPP_PUBLISH_PROFILE_API`
  - `AZURE_WEBAPP_NAME_AI` and `AZURE_WEBAPP_PUBLISH_PROFILE_AI`
  - `AZURE_STATIC_WEB_APPS_TOKEN_FRONTEND`

The workflows in `.github/workflows` will deploy on pushes to `main`.

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

## Deployment (Fly.io - all services)

We deploy three apps on Fly: `api`, `ai`, and `frontend`. You can keep them in one repo. Install CLI: `iwr https://fly.io/install.ps1 -useb | iex` (Windows PowerShell)

1) Sign in and create Postgres (free plan):
```
fly auth signup
fly auth login
fly pg create --name diet-ai-db --region iad --vm-size shared-cpu-1x --initial-cluster-size 1
```

2) API service:
```
cd backend/api
fly launch --name diet-ai-api --region iad --no-deploy
# Attach DB and get DATABASE_URL injected
fly pg attach diet-ai-db
# Set env (AI URL will be added after AI deploy)
fly secrets set NODE_ENV=production
fly deploy
```
Run DB migrations on deploy (configured in `fly.toml` release_command). Optionally seed:
```
fly ssh console -C "npx prisma db seed" || fly ssh console -C "node src/seed.js"
```

3) AI service:
```
cd ../ai
fly launch --name diet-ai-ml --region iad --no-deploy
fly secrets set LLM_PROVIDER=google GOOGLE_API_KEY=your_key LLM_MODEL=gemini-1.5-flash
fly deploy
```
Grab the AI URL: `https://diet-ai-ml.fly.dev` (replace with your app name).

4) Wire API → AI:
```
cd ../api
fly secrets set AI_SERVICE_URL=https://diet-ai-ml.fly.dev
fly deploy
```

5) Frontend:
```
cd ../../frontend
fly launch --name diet-ai-frontend --region iad --no-deploy
# Point frontend to API
fly secrets set VITE_API_BASE=https://diet-ai-api.fly.dev
fly deploy
```

Notes:
- Health checks are defined for API (`/health`) and AI (`/health`).
- API listens on `PORT` (8080 on Fly), set in `fly.toml`.
- If Prisma needs the database schema: `fly ssh console -C "npx prisma migrate deploy"`.
- You can scale to zero by default; cold starts are expected on free tier.

## Free-friendly deployment (Hugging Face + Vercel + Render)

- AI (Python FastAPI) → Hugging Face Spaces (free CPU):
  1) Put `backend/ai` in its own repo with the updated `Dockerfile` that uses `PORT`.
  2) Create a new Space → Type: Docker → Hardware: CPU Basic.
  3) Add Secrets: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`.
  4) Deploy. Space URL becomes your AI base URL.

- Frontend (Vite) → Vercel (free):
  1) Push `frontend/` to its own repo; import to Vercel as Vite.
  2) Env var: `VITE_API_BASE` = your API URL from Render.
  3) Deploy. Update CORS on API to allow the Vercel domain if you lock origins.

- API (Express + Prisma) → Render (free):
  1) Push `backend/api` to its own repo; create a Render Web Service.
  2) Build: `npm install && npx prisma generate`; Start: `npm run start`.
  3) Env vars: `DATABASE_URL` (use Render free Postgres or start with SQLite),
     `AI_SERVICE_URL` = your Hugging Face Space URL, `PORT` provided by Render.
  4) If using Postgres: also run `npx prisma migrate deploy` (via start command or shell).

Notes:
- The AI `Dockerfile` now runs: `uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}` so Spaces works.
- You can switch the AI to a non-Docker FastAPI Space by committing `app.py` and `requirements.txt` only.

## Container quickstart (learn-by-doing)

Build and run the AI service locally with Docker:
```
docker build -t diet-ai-ai ./backend/ai
docker run --rm -p 7860:7860 -e PORT=7860 diet-ai-ai
```

Build and run the API locally with Docker (expects DB and AI):
```
docker build -t diet-ai-api ./backend/api
docker run --rm -p 4000:4000 -e PORT=4000 \
  -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dietdb?schema=public" \
  -e AI_SERVICE_URL="http://localhost:7860" diet-ai-api
```

Reset local containers if ports are stuck:
```
docker ps -aq | % { docker rm -f $_ }
docker compose build --no-cache
docker compose up --force-recreate
```

## Deploy now (one-time checklist)

1) Export deployable folders:
```
powershell -ExecutionPolicy Bypass -File tools/export-for-deploy.ps1 -OutDir deploy-export
```
This creates `deploy-export/ai`, `deploy-export/api`, and `deploy-export/frontend` ready to push to GitHub.

2) AI → Hugging Face Spaces:
- Push `deploy-export/ai` to a new GitHub repo
- Follow `deploy-export/ai/DEPLOY.md`

3) API → Render:
- Push `deploy-export/api` to a new GitHub repo
- Follow `deploy-export/api/DEPLOY.md`

4) Frontend → Vercel:
- Push `deploy-export/frontend` to a new GitHub repo
- Follow `deploy-export/frontend/DEPLOY.md`

## Notes
- Recommendation ranks cheap and healthy using calories/protein and `finalPrice` (price with discount).
- User `onDiet` auto-flips true after 3 orders containing diet items.
- AI service uses heuristics and optional LLM filter (set `OPENAI_API_KEY`). 

## Docker backup (local)

If Azure isn’t ready, you can run locally with Docker:

1. Create `.env` in repo root:
```
LLM_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key
LLM_MODEL=gemini-1.5-flash
```
2. Start:
```
docker compose up -d --build
```
3. Run Prisma migrations:
```
docker compose exec api npx prisma migrate dev --name init
```
4. URLs:
- API: http://localhost:4000
- AI: http://localhost:8000/health
- Frontend: http://localhost:5173