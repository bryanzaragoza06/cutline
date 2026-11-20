# Postliner

Postliner is a web app for TikTok creators: sign up with email + password, connect your TikTok account(s) through TikTok's official Login Kit, upload a video, and publish it with the Content Posting API (Direct Post) now or on a schedule.

- Public homepage, Terms (`/terms`) and Privacy Policy (`/privacy`)
- Scopes used: `user.info.basic`, `video.publish`
- Stack: Next.js 16 (App Router), Prisma + SQLite, Auth.js (credentials), Tailwind 4, ffmpeg, Docker
- Phase 2 code (video generator hooks, per-account automation) is parked in `phase2/` and is excluded from the build.

## Run locally

```bash
cp .env.example .env     # then fill in AUTH_SECRET (openssl rand -base64 32)
npm install
npx prisma migrate deploy
npm run dev
```

You need `ffmpeg` installed locally (used to read the duration of uploaded videos).

## Environment variables

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | `file:../storage/cutline.db` |
| `STORAGE_DIR` | `/app/storage` on Railway (the volume mount path) |
| `AUTH_SECRET` | random string, `openssl rand -base64 32` |
| `TOKEN_ENCRYPTION_KEY` | optional, 32 bytes base64. If unset it is derived from `AUTH_SECRET`. Don't change either after users connect accounts, or they must reconnect. |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | from the TikTok developer portal |
| `TIKTOK_REDIRECT_URI` | `https://<your-domain>/api/auth/tiktok/callback` |
| `ALLOW_SIGNUPS` | set `false` to close registration |

## Deploy on Railway

1. Push this folder to a GitHub repo.
2. Railway → New Project → Deploy from GitHub repo. It builds the `Dockerfile` (see `railway.json`: 1 replica, never sleeps).
3. Add a **Volume** mounted at `/app/storage` (the database and uploads live there).
4. Set the variables above. Generate a public domain under Settings → Networking.
5. Set `TIKTOK_REDIRECT_URI` to that domain + `/api/auth/tiktok/callback`, then redeploy.

Keep it at one replica: SQLite and the in-process scheduler assume a single instance.

## TikTok developer portal checklist

1. Create an app. Add products **Login Kit** and **Content Posting API** (enable **Direct Post**).
2. Scopes: `user.info.basic`, `video.publish`.
3. Redirect URI: `https://<your-domain>/api/auth/tiktok/callback`.
4. Website URL: your Railway URL. Terms URL `/terms`, Privacy URL `/privacy`.
5. Verify the URL: TikTok gives you a signature file (`tiktokXXXX.txt`). Put it in `public/`, push, redeploy, then click Verify. (Free shared Railway subdomains may or may not be accepted; if the portal refuses, a custom domain is the fix.)
6. App icon: `brand/postliner-app-icon-1024.png`.
7. Add your own TikTok account as a sandbox **target user** to test.
8. Record the demo video on the same domain as the website URL: sign up → connect TikTok → upload → choose settings → post. Give reviewers a demo login.

Until the app passes TikTok's audit, posts can only be private (`SELF_ONLY`). The app handles this automatically.

## Honest-use notes

TikTok's guidelines don't accept tools that exist only to upload to accounts you or your team manage. Describe the app accurately in the application and be ready for review questions.

## Phase 2 (after approval)

Add the Python video generator to the same service (Python, moviepy, Pillow, numpy and ffmpeg in the Docker image, bigger volume for clips and songs), generate each video just before its account posts, and store a recipe hash per video so repeats are re-rolled. Schema columns for this (`recipeJson`, `recipeHash`) already exist.

## Tests and checks

```bash
npx tsc --noEmit && npm run lint && npm test
```
