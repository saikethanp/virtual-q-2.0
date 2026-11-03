# Local Development Setup Guide for Virtual-Q

Follow these steps to run Virtual-Q locally on macOS, Windows, or Linux.

---

## Prerequisites

1. **Node.js**: Version 18.x, 20.x, or 22.x LTS. (Download from [nodejs.org](https://nodejs.org))
2. **Git**: Installed and configured.
3. **IDE**: VS Code, Cursor, or Antigravity IDE.

---

## Step 1: Install Dependencies

From the project root:

```bash
npm install
```

---

## Step 2: Configure Environment Variables

Create `.env.local` by copying `.env.example`:

```bash
cp .env.example .env.local
```

Add your Supabase details (see `docs/SUPABASE_SETUP.md`):

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
VITE_APP_URL="http://localhost:3000"
```

*Note: If you leave `VITE_SUPABASE_URL` empty, Virtual-Q automatically activates its offline/browser persistence preview mode with full real-time event synchronization!*

---

## Step 3: Run the Development Server

```bash
npm run dev
```

Open your browser to:
[http://localhost:3000](http://localhost:3000)

---

## Step 4: Verification Checklist

1. **Homepage**: Observe hero heading "Skip the wait. Join the queue before you arrive." and the live ticket preview mockup.
2. **Discover Businesses**: Click "Discover" to filter by categories (Restaurants, Salons, Clinics, Services).
3. **Join Queue**: Open "Siddhartha Venkata Sai's Business", click "Join Queue", enter your name, and receive a digital token (e.g., `Q101`).
4. **My Queue**: View your active position and Smart Arrival departure recommendation.
5. **Business Dashboard**: Click "Business Owner" or "⚡ Quick Demo Sign-in", access the Owner Dashboard, advance the queue with "Call Next", and generate the storefront QR standee.
