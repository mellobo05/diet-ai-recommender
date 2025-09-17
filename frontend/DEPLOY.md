# Deploy Frontend (Vite) to Vercel

## Prereqs
- GitHub account
- Vercel account

## Steps
1. Create a new GitHub repo containing only the files from this `frontend` folder.
2. Import the repo into Vercel. Framework preset: Vite.
3. In Vercel → Settings → Environment Variables:
   - `VITE_API_BASE=https://your-api.onrender.com`
4. Deploy. Open the assigned URL.

## Notes
- The Dockerfile builds static assets but Vercel will do its own build.
- For alternative hosting (Netlify, Cloudflare Pages) use the same `VITE_API_BASE` env.
