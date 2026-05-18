# Project Board

A full-stack multi-user project management app with a Kanban board, time tracking, and hours reports.

## Quick start (local)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # edit JWT_SECRET before going to production
npm run dev                   # starts on http://localhost:3001
```

The SQLite database (`data.db`) is created automatically on first run.  
A default manager account is seeded: **manager@example.com / manager123**.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # starts on http://localhost:5173
```

Open http://localhost:5173 and sign in as the manager to create employee accounts.

---

## Roles

| Feature | Manager | Employee |
|---|---|---|
| See all tasks | ✅ | ❌ (own tasks only) |
| Create / edit / delete tasks | ✅ | ❌ |
| Reassign tasks | ✅ | ❌ |
| Move tasks between columns | ✅ | ✅ (own tasks only) |
| Log hours | ✅ | ✅ (own tasks only) |
| Manage clients | ✅ | ❌ |
| Create employee accounts | ✅ | ❌ |
| View hours reports + CSV export | ✅ | ❌ |

---

## Deploy to Render (free tier)

### Backend (Web Service)

1. Push this repo to GitHub.
2. On Render → **New → Web Service** → connect your repo.
3. **Root directory**: `backend`
4. **Build command**: `npm install`
5. **Start command**: `node server.js`
6. Add environment variables:
   - `JWT_SECRET` → a long random string
   - `NODE_ENV` → `production`
   - `FRONTEND_URL` → your frontend URL (set after deploying frontend)
7. Add a **Disk** (under Advanced) mounted at `/opt/render/project/src` — this persists `data.db`.
   Or set `DB_PATH=/opt/render/project/src/data.db`.

### Frontend (Static Site)

1. On Render → **New → Static Site** → connect your repo.
2. **Root directory**: `frontend`
3. **Build command**: `npm install && npm run build`
4. **Publish directory**: `dist`
5. Add environment variable:
   - `VITE_API_URL` → your backend Render URL (e.g. `https://project-board-api.onrender.com`)

---

## Deploy to Railway (share with your team)

Railway hosts the app online so employees can use it from any device. Free tier is enough to start.

### Step 1 — Create a Railway account

Go to **railway.app** and sign up with your GitHub account.

### Step 2 — Put your project on GitHub

Railway needs your code on GitHub. In Terminal:

```
cd /Users/meghanburch/Desktop/project-board
git init
git add .
git commit -m "initial commit"
```

Then go to **github.com**, create a new repository (call it `project-board`), and follow the instructions it shows you to push your code.

### Step 3 — Deploy the backend

1. On Railway, click **New Project → Deploy from GitHub repo** and select your repo
2. Click **Add variables** and add these three:
   - `JWT_SECRET` → type any long random phrase, e.g. `my-super-secret-key-123`
   - `NODE_ENV` → `production`
   - `FRONTEND_URL` → leave blank for now, come back to this in Step 5
3. Under **Settings → Build**, set:
   - **Root directory**: `backend`
   - **Start command**: `node server.js`
4. Click **Deploy**. Wait for the green checkmark.
5. Go to **Settings → Networking → Generate Domain**. Copy the URL it gives you (looks like `https://project-board-backend-xxxx.up.railway.app`). You'll need this next.

### Step 4 — Deploy the frontend

1. In the same Railway project, click **New Service → GitHub repo** and select your repo again
2. Click **Add variables** and add one:
   - `VITE_API_URL` → paste the backend URL from Step 3
3. Under **Settings → Build**, set:
   - **Root directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npx serve dist`
4. Click **Deploy**. Wait for the green checkmark.
5. Go to **Settings → Networking → Generate Domain**. Copy this frontend URL.

### Step 5 — Connect them together

1. Go back to your **backend** service on Railway
2. Update the `FRONTEND_URL` variable to the frontend URL from Step 4
3. Railway will automatically redeploy

### Done!

Your app is now live. Share the frontend URL with your employees — they can bookmark it and use it from any browser, anywhere.

---

## Tech stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (built into Node.js 22+)
- **Auth**: JWT (7-day expiry)
- **Icons**: Tabler Icons
- **Fonts**: DM Sans, DM Mono
