# Security & Row Level Security (RLS) Policy Documentation

Security and atomic data isolation in Virtual-Q 2.0.

---

## 1. Zero-Credential Exposure Rule

- **No Service-Role Key**: The Supabase service-role secret key is strictly prohibited from frontend code and is never bundled in client assets.
- **Client Configuration**: Only the public `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_URL` are used. All privileges are strictly gated by PostgreSQL Row Level Security (RLS) policies.

---

## 2. Row Level Security Policies

### A. Customers
1. **Public Businesses Read**: All users (anonymous or authenticated) can query public business profiles, open statuses, and menu items.
2. **Anonymous Session Isolation**: Customers receive a persistent guest token session identifier (`session_id`). They can only query and cancel queue tokens belonging to their own session.
3. **Order Privacy**: Customers can only view order records associated with their session.
4. **No Direct Queue Manipulation**: Customers cannot update queue positions, service timestamps, or change their status to `serving` or `completed`. Status changes can only be initiated by authorized business owners or via secure atomic RPC functions.

### B. Business Owners
1. **Business Isolation**: Business owners are authenticated via Supabase Auth (`auth.uid()`). All write operations on `businesses`, `counters`, `menu_items`, and `queue_settings` require `owner_id = auth.uid()`.
2. **Multi-Tenant Boundaries**: An owner of Business A cannot view, modify, or advance queues belonging to Business B.

---

## 3. Atomic Queue Token Generation (`rpc_join_queue`)

To prevent token collision when two customers join at the exact same millisecond:
- The token sequence is allocated directly within PostgreSQL inside a transaction block (`FOR UPDATE`).
- Active duplicate checks guarantee that a customer cannot spam multiple active tokens in the same business queue concurrently.

---

## 4. Race Condition Protection for Staff (`rpc_advance_queue`)

When multiple staff members operate counters simultaneously:
- The next customer in line is selected with `FOR UPDATE SKIP LOCKED`.
- Only one counter can lock and claim a customer, guaranteeing zero duplicate servicing or out-of-order execution.
