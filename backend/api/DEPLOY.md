# Deploy API (Express + Prisma) to Render

## Prereqs
- GitHub account
- Render account

## Steps
1. Create a new GitHub repo containing only the files from this `backend/api` folder.
2. Create a new Web Service in Render:
   - Build Command: `npm install && npx prisma generate`
   - Start Command: `npm run start`
3. Create a Render PostgreSQL instance (free) and copy the `DATABASE_URL`.
4. In the Web Service → Environment:
   - `DATABASE_URL=<copied from Render Postgres>`
   - `AI_SERVICE_URL=https://your-ai-space.hf.space`
   - (Render sets `PORT` automatically)
5. Deploy.
6. Run migrations (Shell →):
   - `npx prisma migrate deploy`
7. Seed data (optional):
   - `npm run seed`

## Notes
- Health endpoint: `/health`
- CORS is enabled globally; you can restrict origins later.
