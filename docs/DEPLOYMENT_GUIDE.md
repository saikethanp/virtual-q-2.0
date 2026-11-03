# Virtual-Q 2.0 — Production Deployment & Initialization Guide

This comprehensive guide details the complete deployment process for **Virtual-Q 2.0** across **Supabase**, **GitHub**, and **Vercel**.

---

## 1. Supabase Initialization & Database Setup

### Step 1: Open Supabase SQL Editor
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard/project/oyyxsegrfwlyngogwhzv).
2. In the left navigation, click **SQL Editor**.
3. Click **"New Query"**.

### Step 2: Run Consolidated Setup
Open [`supabase/complete_setup.sql`](file:///c:/Users/Kethan/Downloads/untitled/supabase/complete_setup.sql) in your project, copy the entire script, paste it into the Supabase SQL Editor, and click **Run**.

This script establishes:
- All 9 core tables: `profiles`, `businesses`, `counters`, `queue_entries`, `menu_items`, `orders`, `order_items`, `queue_settings`, `business_token_counters`.
- Public storefront discovery view: `public_businesses`.
- Complete Row-Level Security (RLS) policies with strict `auth.uid()` binding and role isolation.
- Security-definer RPCs: `rpc_join_queue`, `rpc_advance_queue`, `rpc_create_order`, `rpc_get_public_queue_status`, `rpc_register_business`, `rpc_admin_delete_business`.
- Concurrency control: `uq_active_customer_queue` index and atomic daily sequence resets.
- Realtime publication subscriptions on `queue_entries`, `orders`, `businesses`, and `counters`.

### Step 3: Enable Anonymous Authentication
Because customer users take virtual tokens and place orders without mandatory passwords:
1. In your Supabase Dashboard, go to **Authentication** > **Providers**.
2. Click **Anonymous**.
3. Toggle **Enable Anonymous Sign-Ins** to **ON** and save.

### Step 4: Promote Platform Administrator
To activate the Platform Admin dashboard console:
1. Register your business owner account in the app via `/business/register`.
2. In the Supabase SQL Editor, run:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'YOUR_EMAIL@domain.com';
```

---

## 2. GitHub Repository Setup

To push your local Virtual-Q 2.0 code to GitHub:

### Step 1: Initialize Git
Open PowerShell in the project directory (`c:\Users\Kethan\Downloads\untitled`) and run:
```powershell
git init
git add .
git commit -m "feat: Virtual-Q 2.0 production-ready release"
```

### Step 2: Connect to Remote GitHub Repository
Create a new private or public repository on GitHub (e.g., `virtual-q-2.0`), then run:
```powershell
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

---

## 3. Vercel Deployment

### Step 1: Import Project to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** > **"Project"**.
3. Select your GitHub repository (`virtual-q-2.0`) and click **Import**.

### Step 2: Configure Build & Output Settings
Vercel automatically detects Vite:
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Configure Environment Variables
Under **Environment Variables**, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://oyyxsegrfwlyngogwhzv.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_osyrx--6W8rLozyQQY4k_g_zR_bBF3L` | Your Supabase publishable anon key |
| `VITE_APP_URL` | `https://your-vercel-domain.vercel.app` | Your Vercel production URL |

### Step 4: Deploy
Click **Deploy**. Vercel will build the project and deploy it. SPA routing is already pre-configured via `vercel.json` rewrites.

---

## 4. Production Workflow Verification

Once deployed:
1. **Customer Workflow**:
   - Visit the homepage, explore active businesses, or scan a counter QR code.
   - Click "Join Queue" to get an authentic digital token (`Q101`).
   - Add items to the cart and click "Place Order"; verify order details are dynamically priced from PostgreSQL.
2. **Business Owner Workflow**:
   - Register a new business at `/business/register`.
   - Access the dashboard, call/advance waiting tokens, manage counters, and configure menu items.
3. **Platform Administrator Workflow**:
   - Sign in with your admin account.
   - Open **Platform Admin** in the sidebar to review all registered businesses, toggle active service availability, or safely cascade-delete businesses.

