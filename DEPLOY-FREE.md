# Women Safety Guardian — free deployment (Render + db4free)

Deploy is **free and needs no credit card**. It has two browser-only signup steps
(you can't sign up via CLI), then I wire up any remaining details.

## 1. Sign up for the two free providers (browser)
1. **db4free.net** — free MySQL host (no card).
   - Sign up → "Create Database" → name e.g. `zelda_new`, pick a username + password.
   - NOTE the values: `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Host is `db4free.net` (port 3306).
2. **render.com** — free web service with auto-HTTPS (GitHub login, no card).
   - Sign up with GitHub.

## 2. Create the Render service
- In Render dashboard → "New +" → "Web Service" → connect this GitHub repo
  `https://github.com/bragee7/zeldaflutter` (branch: `main`).
- Render will detect `render.yaml` (or choose: Language = Docker, build context = `./server`).
- Plan: **Free** (0.5 vCPU shared, 512 MB, may idle-sleep).
- Health Check Path = `/api/health`.

## 3. Configure secrets (Render dashboard → Service → Environment → Secrets)
Add the **secrets** referenced in `render.yaml` as **plain "Plain" env vars → Secret**:
| Name | Value |
|------|-------|
| `DB_USER` | your db4free username |
| `DB_PASSWORD` | your db4free password |
| `JWT_SECRET` | strong random string, e.g. `openssl rand -base64 32` |
| `EMAIL_USER` | `zyracmt@gmail.com` (the Gmail account whose App Password you generated) |
| `EMAIL_PASS` | the 16-char Gmail **App Password** for that account (spaces optional — the server strips them) |

Non-sensitive env vars are already pre-filled in `render.yaml`.

## 4. Migrate the local MySQL data to db4free
From a shell with the MySQL client:
```
mysqldump -h 127.0.0.1 -u root zelda_new > zelda_dump.sql
mysql -h db4free.net -u <DB_USER> -p<DB_PASSWORD> zelda_new < zelda_dump.sql
```

## 5. Deploy the backend
After your first push to `main`, Render auto-rebuilds & deploys. (Or push again now that
the Dockerfile is in place.) When it's green, you get:
```
https://women-safety-api.onrender.com
```
Then reply to me with that final URL so I can rebuild the mobile APK against it.

## 6. Rebuild + install the mobile APK (I do this)
```
flutter build apk --debug \
  --dart-define=API_BASE_URL=https://<your-app>.onrender.com \
  --dart-define=MEDIA_BASE_URL=https://<your-app>.onrender.com
adb -s t8wwmvdyvw4x8p99 install -r mobile/build/app/outputs/flutter-apk/app-debug.apk
```

## Free-tier tradeoffs to know
- **Idle sleep**: free Render web services can sleep after a few minutes of inactivity → the
  **first** SOS after idle may take ~1–2 s to wake (subsequent ones are instant). For truly
  instant, always-on needs the paid Starter plan ($7/mo).
- **Ephemeral disk**: `server/uploads/` (your 20 MB video/audio SOS clips) is wiped on every
  redeploy/restart. Acceptable for a demo; for evidence retention, persist uploads to S3/B2
  (a small code change + ~$0.01/GB).
- **Socket.IO websockets** are supported on the free plan (real-time Live tracking / new-case push).

## What I need from you
1. Confirm you've signed up at db4free + Render.
2. Give me the **db4free `DB_USER` / `DB_PASSWORD` / `DB_NAME`** you created (and the final
   Render service URL once built).

I'll handle everything else (Dockerfile/render.yaml already committed, secrets mapping, APK rebuild + install).
