# Vercel Deployment Guide for Virtual-Q 2.0

Deploy Virtual-Q to Vercel in less than 3 minutes.

---

## 1. Push Your Code to GitHub

Initialize git and push to your GitHub account:

```bash
git init
git add .
git commit -m "feat: Virtual-Q 2.0 production release"
git branch -M main
git remote add origin https://github.com/your-username/virtual-q.git
git push -u origin main
```

---

## 2. Import into Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Select your `virtual-q` GitHub repository.
4. In the Project Configuration:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 3. Configure Environment Variables in Vercel

Under **Environment Variables**, add:

| Key | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | From Supabase Project Settings -> API |
| `VITE_SUPABASE_ANON_KEY` | `ey...` | Public/anon API key |
| `VITE_APP_URL` | `https://your-app.vercel.app` | Used for QR code link generation |

Click **"Deploy"**.

---

## 4. Single-Page Application (SPA) Rewrites on Vercel

A `vercel.json` file is included in this repository to route all subpaths (such as `/business/siddhartha-venkata-sais-business`, `/discover`, and `/my-queue`) directly to `index.html`.

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 5. Configure Supabase Auth Redirect URLs

1. In Supabase Dashboard -> **Authentication** -> **URL Configuration**.
2. Under **Site URL**, paste your Vercel deployment URL (e.g., `https://virtual-q.vercel.app`).
3. Under **Redirect URLs**, add:
   - `https://virtual-q.vercel.app/**`
   - `http://localhost:3000/**`
4. Click **Save**.
