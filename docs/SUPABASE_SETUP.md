# Virtual-Q 2.0 — Supabase Clean Production Setup & Security Architecture

## Overview

This guide explains how to initialize the clean, production-hardened Supabase PostgreSQL database for **Virtual-Q 2.0**, configure administrator privileges, and understand the database-level security model.

The database starts **100% empty and clean**. There are zero hardcoded sample businesses, demo users, or test orders.

---

## 1. Database Initialization

### Step 1: Open Supabase SQL Editor
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard/project/oyyxsegrfwlyngogwhzv).
2. Click on the **SQL Editor** tab from the left sidebar.
3. Click **"New Query"**.

### Step 2: Run Consolidated Setup
Copy and paste the entire contents of [`supabase/complete_setup.sql`](file:///c:/Users/Kethan/Downloads/untitled/supabase/complete_setup.sql) into the SQL editor and click **Run**.

---

## 2. Security Architecture & Threat Mitigations

### 1. Privilege Escalation Prevention
- **Profile Insert Check**: Ordinary users can only insert their own profile with roles `'business_owner'` or `'customer'`.
  ```sql
  CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id AND (role IN ('business_owner', 'customer') OR public.is_admin()));
  ```
- **Profile Update Check**: Ordinary users cannot modify their `role` column. The role check uses non-recursive helper `public.get_my_role()`.
- **Admin Assignment**: Admins can only be assigned directly via the Supabase Dashboard / SQL Editor by running:
  ```sql
  UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'YOUR_EMAIL@domain.com';
  ```

### 2. Verified Customer Identity (Supabase Anonymous Auth)
- Request-header forging (`x-session-id`) has been completely removed from all RLS policies.
- Customers obtain genuine Supabase tokens via `supabase.auth.signInAnonymously()`.
- Queue entries and orders are strictly bound to `auth.uid()`.
- A customer cannot query, view, cancel, or tamper with another customer's queue entries or orders.

### 3. Server-Side Price Verification & Anti-Tamper Cart
- `public.rpc_create_order()` eliminates custom item name/price fallbacks.
- Every cart item must reference a valid, available `menu_item_id` belonging to the specific business.
- All unit prices and subtotals are computed dynamically from `public.menu_items.price` in PostgreSQL.
- Payment status defaults to `'pay_at_business'`; client-submitted payment statuses are rejected.
- Invalid quantities ($\le 0$), unavailable items, or foreign business items raise exceptions and roll back the entire transaction.

### 4. Concurrency-Safe Queue Joining & Daily Tokens
- Enforced a unique partial index:
  ```sql
  CREATE UNIQUE INDEX uq_active_customer_queue 
    ON public.queue_entries (business_id, user_id) 
    WHERE status IN ('waiting', 'called', 'serving');
  ```
- Prevents concurrent requests from creating duplicate active tokens for the same user and business.
- Token generation is atomic with automatic daily rollover using `business_token_counters` and `FOR SHARE` / `FOR UPDATE` locking.

### 5. Protected Business Discovery
- `public_businesses` view exposes only public-facing storefront attributes (`id`, `name`, `slug`, `category`, `description`, `location`, `banner_url`, `logo_url`, `phone`, `is_open`, `rating`, `review_count`, `avg_service_time`, `token_prefix`).
- Private owner UUIDs and internal metrics are protected.

### 6. Atomic Business Registration
- `public.rpc_register_business()` transactionally creates the owner profile, business record, default queue settings, and initial counter (`C1`) in a single database transaction. No orphan or partial records can be created on failure.

### 7. Secure Admin Deletion
- `public.rpc_admin_delete_business(UUID)` is restricted to verified administrators via `public.is_admin()`.
- Transactionally cascades and removes orders, order items, queue entries, menu items, counters, settings, and business records.
- Default `PUBLIC` execution permissions are explicitly revoked.

---

## 3. Security Verification Checklist

| Security Area | Verified Attack Scenario | PostgreSQL / Supabase Mitigation | Status |
| :--- | :--- | :--- | :--- |
| **Role Escalation** | Client passes `{ role: 'admin' }` on signup or profile update | RLS `WITH CHECK` blocks admin role insertion & update for non-admins | **PASSED** |
| **Session Forgery** | Attacker spoofs `x-session-id` header to view another user's queue | RLS requires `user_id = auth.uid()` via genuine JWT; headers ignored | **PASSED** |
| **Price Tampering** | Attacker modifies cart price or injects ₹0 custom items | `rpc_create_order` rejects custom items; prices pulled from `menu_items` | **PASSED** |
| **Queue Race Conditions** | Attacker triggers concurrent join requests | Unique index `uq_active_customer_queue` + row lock prevents duplicate active entries | **PASSED** |
| **Owner Cross-Access** | Business Owner A attempts to advance or cancel Business B's queue | `rpc_advance_queue` and RLS strictly verify `b.owner_id = auth.uid()` | **PASSED** |
| **Unauthorized Deletion** | Non-admin owner or customer calls `rpc_admin_delete_business` | Checked against `public.is_admin()`; raises access denied error | **PASSED** |
| **Registration Inconsistency** | Network drops mid-registration leaving orphaned business | Handled in single PostgreSQL transaction in `rpc_register_business` | **PASSED** |

---

## 4. Build & Type Safety Verification

- `npm run lint` (`tsc --noEmit`): Passed with 0 errors.
- `npm run build` (`vite build`): Built production bundle cleanly with 0 errors.
