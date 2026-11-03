# Virtual-Q 2.0 — Smart Digital Queue Management Platform

> **Skip the wait. Live more.**

Virtual-Q is a digital queue management platform that enables customers to join physical business queues remotely, receive digital tokens in real-time, monitor queue velocity, and arrive just as their turn approaches. It provides business owners with a multi-counter dashboard, order pre-fulfillment pipeline, real-time analytics, and storefront QR code standees.

---

## 🎨 Visual Design References

Built precisely against the high-fidelity design specifications:
- **Homepage**: Clean warm ivory layout (`#FAF8F5`), minimalist brand header, responsive ticket progress illustration (`Q124` -> `Q127`), and 4-point feature strip.
- **Customer Discovery**: Category filtering (Restaurants, Cafes, Salons, Clinics, Services, Other), instant search, live waiting counts, and estimated wait times.
- **Business Details & Menu**: MITS Canteen banner layout, item cards (`Egg Rice ₹60`, `Veg meals ₹90`, `Gobi Rice ₹60`), add-to-cart controls, subtotal calculations, and pay-at-counter ordering.
- **Business Registration**: Split-screen with 3D coffee shop illustration, owner name, business details, password toggles, and category selection.
- **Business Owner Dashboard**: 4 key performance cards (Current Queue, Now Serving, Estimated Wait, Today's Orders), congestion alerts, queue overview table, and multi-counter management.

---

## ⚡ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend & Database**: Supabase PostgreSQL, Row Level Security (RLS), Stored Procedures / RPC Functions (`rpc_join_queue`, `rpc_advance_queue`)
- **Real-time**: Supabase Realtime & broadcast events
- **Deployment**: Vercel & Node.js

---

## 🚀 Quick Start (Local Run)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## 📖 Documentation Index

- [Supabase Cloud Setup Guide](docs/SUPABASE_SETUP.md)
- [Local Development Guide](docs/LOCAL_SETUP.md)
- [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)
- [Database Schema & Architecture](docs/DATABASE_SCHEMA.md)
- [Security & Row Level Security Policies](docs/SECURITY.md)

---

## 🧪 Verified Scenarios

- [x] **Customer Remote Queue Join**: Instant anonymous session token without requiring registration or password.
- [x] **Live Token Advancement**: Staff "Call Next" transitions currently serving customer to completed and atomically calls next waiting token.
- [x] **Smart Arrival Assistant**: Dynamic departure time calculation based on queue velocity and travel duration.
- [x] **Pre-ordering**: Adding menu items in INR, subtotal calculation, and counter order tracking.
- [x] **Storefront QR Standee**: Modal with direct link, instant PNG download, and printable standee.
- [x] **Multiple Counters**: Activating/deactivating counters (e.g., C1 Hot Meals, C2 Drinks) and dispatching tokens.
