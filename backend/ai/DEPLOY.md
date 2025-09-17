# Deploy AI (FastAPI) to Hugging Face Spaces

## Prereqs
- GitHub account
- Hugging Face account

## Steps
1. Create a new GitHub repo containing only the files from this `backend/ai` folder.
   - Ensure `Dockerfile`, `requirements.txt`, and `main.py` are at repo root.
2. Create a new Space on Hugging Face:
   - Space type: Docker
   - Hardware: CPU Basic
   - Connect to your repo
3. In Space Settings → Secrets, add:
   - `LLM_PROVIDER` (e.g., `google` or `openai`)
   - `GOOGLE_API_KEY` or `OPENAI_API_KEY`
   - `LLM_MODEL` (e.g., `gemini-1.5-flash`)
4. Deploy and copy the Space URL (e.g., `https://your-space.hf.space`).

## Notes
- The `Dockerfile` binds to `PORT` if provided (Spaces sets it) and defaults to 7860 locally.
- Health check at `/health`.
