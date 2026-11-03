# Virtual-Q Database Architecture & Entity Relationships

This document outlines the complete database schema implemented in PostgreSQL via Supabase.

---

## Entity Relationship Overview

```
auth.users (Supabase Auth)
  ├── profiles (1:1 via id)
  └── businesses (1:N via owner_id)
        ├── counters (1:N via business_id)
        ├── queue_settings (1:1 via business_id)
        ├── menu_items (1:N via business_id)
        ├── queue_entries (1:N via business_id)
        │     └── orders (1:1 optional via queue_entry_id)
        └── orders (1:N via business_id)
              └── order_items (1:N via order_id)
```

---

## Tables Specification

### 1. `profiles`
Links Supabase Auth users to roles.
- `id` (UUID, PK, references `auth.users`)
- `full_name` (TEXT)
- `email` (TEXT, UNIQUE)
- `phone` (TEXT)
- `role` ('customer' | 'business_owner' | 'staff' | 'admin')

### 2. `businesses`
Stores registered physical businesses.
- `id` (UUID, PK)
- `owner_id` (UUID, references `auth.users`)
- `name` (TEXT)
- `slug` (TEXT, UNIQUE)
- `category` ('Restaurants' | 'Cafes' | 'Salons' | 'Clinics' | 'Services' | 'Other')
- `description` (TEXT)
- `location` (TEXT)
- `banner_url` (TEXT)
- `logo_url` (TEXT)
- `phone` (TEXT)
- `email` (TEXT)
- `is_open` (BOOLEAN)
- `rating` (NUMERIC)
- `review_count` (INTEGER)
- `avg_service_time` (INTEGER minutes)
- `token_prefix` (TEXT, e.g. 'Q', 'T')

### 3. `counters`
Service counters and pickup windows.
- `id` (UUID, PK)
- `business_id` (UUID, references `businesses`)
- `name` (TEXT)
- `code` (TEXT, e.g. 'C1', 'C2')
- `is_active` (BOOLEAN)

### 4. `queue_entries`
Atomic token entries in active and past lines.
- `id` (UUID, PK)
- `business_id` (UUID, references `businesses`)
- `counter_id` (UUID, nullable, references `counters`)
- `session_id` (TEXT, anonymous customer session identifier)
- `token_number` (TEXT, e.g. 'Q101', 'Q127')
- `queue_sequence` (SERIAL)
- `customer_name` (TEXT)
- `customer_phone` (TEXT)
- `status` ('waiting' | 'called' | 'serving' | 'completed' | 'cancelled' | 'missed')
- `travel_time_minutes` (INTEGER)
- `estimated_wait_minutes` (INTEGER)
- `joined_at`, `called_at`, `served_at`, `completed_at` (TIMESTAMPTZ)

### 5. `menu_items`
Food items, services, or appointment types.
- `id` (UUID, PK)
- `business_id` (UUID, references `businesses`)
- `name` (TEXT)
- `description` (TEXT)
- `price` (NUMERIC, in INR)
- `category` (TEXT)
- `is_available` (BOOLEAN)

### 6. `orders` & `order_items`
Pre-ordered food or services linked to queue tokens.
- `id` (UUID, PK)
- `business_id` (UUID)
- `queue_entry_id` (UUID, optional link to `queue_entries`)
- `session_id` (TEXT)
- `order_number` (TEXT, e.g. 'ORD-101')
- `customer_name` (TEXT)
- `total_amount` (NUMERIC)
- `status` ('pending' | 'preparing' | 'ready' | 'completed' | 'cancelled')
- `payment_status` ('pay_at_business')
