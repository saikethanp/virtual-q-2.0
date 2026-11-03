-- ============================================================================
-- VIRTUAL-Q 2.0 — COMPLETE CONSOLIDATED PRODUCTION DATABASE SETUP
-- Safe, clean, and fortified PostgreSQL & Supabase Architecture
-- Compatible with all PostgreSQL versions (uses native gen_random_uuid())
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. BASE TABLES
-- ----------------------------------------------------------------------------

-- PROFILES (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'business_owner' CHECK (role IN ('customer', 'business_owner', 'staff', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Restaurants', 'Cafes', 'Salons', 'Clinics', 'Services', 'Other')),
    description TEXT,
    location TEXT NOT NULL,
    banner_url TEXT,
    logo_url TEXT,
    phone TEXT,
    email TEXT,
    is_open BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    review_count INTEGER DEFAULT 0,
    avg_service_time INTEGER DEFAULT 5, -- in minutes
    token_prefix TEXT DEFAULT 'Q',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COUNTERS
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QUEUE ENTRIES
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT, -- Legacy client tracker identifier
    token_number TEXT NOT NULL,
    queue_sequence SERIAL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'serving', 'completed', 'cancelled', 'missed')),
    notes TEXT,
    travel_time_minutes INTEGER DEFAULT 0,
    estimated_wait_minutes INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    category TEXT DEFAULT 'Main',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    queue_entry_id UUID REFERENCES public.queue_entries(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pay_at_business' CHECK (payment_status IN ('pay_at_business', 'paid')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- QUEUE SETTINGS
CREATE TABLE IF NOT EXISTS public.queue_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    max_capacity INTEGER DEFAULT 100,
    avg_service_duration_min INTEGER DEFAULT 5,
    grace_period_min INTEGER DEFAULT 5,
    auto_advance BOOLEAN DEFAULT TRUE,
    opening_time TEXT DEFAULT '09:00',
    closing_time TEXT DEFAULT '21:00',
    is_queue_open BOOLEAN DEFAULT TRUE,
    congestion_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUSINESS TOKEN COUNTERS (Atomic daily token generation)
CREATE TABLE IF NOT EXISTS public.business_token_counters (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_number INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES & CONSTRAINTS (Queue Concurrency & Anti-Tampering)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);

CREATE INDEX IF NOT EXISTS idx_queue_business_status ON public.queue_entries(business_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_user ON public.queue_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_joined ON public.queue_entries(joined_at);

CREATE INDEX IF NOT EXISTS idx_orders_business_status ON public.orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_business ON public.menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_counters_business ON public.counters(business_id);

-- Enforce strictly that a user cannot have more than one active token per business concurrently
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_customer_queue 
    ON public.queue_entries (business_id, user_id) 
    WHERE status IN ('waiting', 'called', 'serving');

-- ----------------------------------------------------------------------------
-- 3. VIEWS: Public Business Discovery (Data Exposure Protection)
-- ----------------------------------------------------------------------------
-- Exposes only discovery details; hides internal owner UUIDs, owner phone/email.
CREATE OR REPLACE VIEW public.public_businesses AS
SELECT 
    id,
    name,
    slug,
    category,
    description,
    location,
    banner_url,
    logo_url,
    phone,
    is_open,
    rating,
    review_count,
    avg_service_time,
    token_prefix,
    created_at
FROM public.businesses;

GRANT SELECT ON public.public_businesses TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_token_counters ENABLE ROW LEVEL SECURITY;

-- Security Definer: Check Admin status without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Security Definer: Read current caller's role safely
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id OR public.is_admin());

-- Ordinary users can ONLY insert role 'business_owner' or 'customer'. Admin role CANNOT be inserted via frontend.
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (
    auth.uid() = id AND 
    (role IN ('business_owner', 'customer') OR public.is_admin())
  );

-- Ordinary users CANNOT change their role column. Role column can only be changed by admin.
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR (
      auth.uid() = id AND role = public.get_my_role()
    )
  );

-- BUSINESSES POLICIES
DROP POLICY IF EXISTS "Public can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can delete their business" ON public.businesses;

-- Public can view businesses for customer discovery
CREATE POLICY "Public can view businesses" 
  ON public.businesses FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Owners can insert their business" 
  ON public.businesses FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

CREATE POLICY "Owners can update their business" 
  ON public.businesses FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = owner_id OR public.is_admin()) 
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

CREATE POLICY "Owners can delete their business" 
  ON public.businesses FOR DELETE 
  TO authenticated 
  USING (auth.uid() = owner_id OR public.is_admin());

-- COUNTERS POLICIES
DROP POLICY IF EXISTS "Public can view active counters" ON public.counters;
DROP POLICY IF EXISTS "Owners can insert counters" ON public.counters;
DROP POLICY IF EXISTS "Owners can update counters" ON public.counters;
DROP POLICY IF EXISTS "Owners can delete counters" ON public.counters;

CREATE POLICY "Public can view active counters" 
  ON public.counters FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Owners can insert counters" 
  ON public.counters FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = counters.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owners can update counters" 
  ON public.counters FOR UPDATE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = counters.business_id AND b.owner_id = auth.uid())
  ) 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = counters.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete counters" 
  ON public.counters FOR DELETE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = counters.business_id AND b.owner_id = auth.uid())
  );

-- QUEUE ENTRIES POLICIES (Strictly auth.uid() bound, no forged request headers)
DROP POLICY IF EXISTS "Customers can view their own queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Business owners can view their queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Business owners can update their queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Customers can cancel their own active queue entry" ON public.queue_entries;

CREATE POLICY "Customers can view their own queue entries" 
  ON public.queue_entries FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Business owners can update their queue entries" 
  ON public.queue_entries FOR UPDATE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid())
  ) 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Customers can cancel their own active queue entry" 
  ON public.queue_entries FOR UPDATE 
  TO authenticated 
  USING (
    status IN ('waiting', 'called') AND user_id = auth.uid()
  ) 
  WITH CHECK (
    status = 'cancelled' AND user_id = auth.uid()
  );

-- MENU ITEMS POLICIES
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;

CREATE POLICY "Public can view menu items" 
  ON public.menu_items FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Owners can insert menu items" 
  ON public.menu_items FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owners can update menu items" 
  ON public.menu_items FOR UPDATE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid())
  ) 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete menu items" 
  ON public.menu_items FOR DELETE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid())
  );

-- ORDERS & ORDER ITEMS POLICIES (Strictly auth.uid() bound)
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can view their business orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can update their business orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view order items for their permitted orders" ON public.order_items;

CREATE POLICY "Customers and owners can view their orders" 
  ON public.orders FOR SELECT 
  TO authenticated 
  USING (
    user_id = auth.uid() OR
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = orders.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owners can update their business orders" 
  ON public.orders FOR UPDATE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = orders.business_id AND b.owner_id = auth.uid())
  ) 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = orders.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Users can view order items for their permitted orders" 
  ON public.order_items FOR SELECT 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_items.order_id AND (
        o.user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = o.business_id AND b.owner_id = auth.uid())
      )
    )
  );

-- QUEUE SETTINGS POLICIES
DROP POLICY IF EXISTS "Public can view queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Owners can insert queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Owners can update queue settings" ON public.queue_settings;

CREATE POLICY "Public can view queue settings" 
  ON public.queue_settings FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Owners can insert queue settings" 
  ON public.queue_settings FOR INSERT 
  TO authenticated 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Owners can update queue settings" 
  ON public.queue_settings FOR UPDATE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid())
  ) 
  WITH CHECK (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid())
  );

-- TOKEN COUNTERS POLICIES
DROP POLICY IF EXISTS "Business token counters access" ON public.business_token_counters;
CREATE POLICY "Business token counters access" 
  ON public.business_token_counters FOR ALL 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_token_counters.business_id AND b.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. ATOMIC DATABASE RPC FUNCTIONS (Fortified Security Definer)
-- ----------------------------------------------------------------------------

-- FUNCTION: Atomic Join Queue (Requires verified auth.uid() via Anonymous or Registered Auth)
CREATE OR REPLACE FUNCTION public.rpc_join_queue(
    p_business_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_travel_time_minutes INTEGER DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_business RECORD;
    v_settings RECORD;
    v_caller_uid UUID;
    v_active_existing RECORD;
    v_people_ahead INTEGER;
    v_avg_service_time INTEGER;
    v_est_wait INTEGER;
    v_today DATE := CURRENT_DATE;
    v_next_number INTEGER;
    v_token_number TEXT;
    v_token_prefix TEXT;
    v_entry_id UUID;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required. Please enable anonymous customer access.');
    END IF;

    -- Row lock business to prevent race conditions during join checks
    SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id FOR SHARE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found');
    END IF;

    IF NOT v_business.is_open THEN
        RETURN jsonb_build_object('success', false, 'message', 'This business is currently closed.');
    END IF;

    SELECT * INTO v_settings FROM public.queue_settings WHERE business_id = p_business_id;
    IF FOUND AND NOT v_settings.is_queue_open THEN
        RETURN jsonb_build_object('success', false, 'message', 'Queue is currently paused or closed for this business.');
    END IF;

    -- Concurrency check: enforce 1 active token per authenticated user per business
    SELECT * INTO v_active_existing 
    FROM public.queue_entries 
    WHERE business_id = p_business_id 
      AND user_id = v_caller_uid
      AND status IN ('waiting', 'called', 'serving')
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You already have an active token (' || v_active_existing.token_number || ') for this business.',
            'entry_id', v_active_existing.id,
            'token_number', v_active_existing.token_number
        );
    END IF;

    -- Capacity check
    SELECT COUNT(*) INTO v_people_ahead FROM public.queue_entries WHERE business_id = p_business_id AND status = 'waiting';
    IF v_settings.max_capacity IS NOT NULL AND v_people_ahead >= v_settings.max_capacity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Queue is at maximum capacity. Please try again shortly.');
    END IF;

    v_avg_service_time := COALESCE(v_settings.avg_service_duration_min, v_business.avg_service_time, 5);
    v_est_wait := v_people_ahead * v_avg_service_time;
    v_token_prefix := COALESCE(v_business.token_prefix, 'Q');

    -- Concurrency-safe atomic increment with daily reset
    INSERT INTO public.business_token_counters (business_id, token_date, last_number, updated_at)
    VALUES (p_business_id, v_today, 101, NOW())
    ON CONFLICT (business_id) DO UPDATE
    SET 
        last_number = CASE 
            WHEN business_token_counters.token_date < v_today THEN 101 
            ELSE business_token_counters.last_number + 1 
        END,
        token_date = v_today,
        updated_at = NOW()
    RETURNING last_number INTO v_next_number;

    v_token_number := v_token_prefix || v_next_number::TEXT;
    v_entry_id := gen_random_uuid();

    INSERT INTO public.queue_entries (
        id, business_id, user_id, session_id, token_number, customer_name, customer_phone,
        status, notes, travel_time_minutes, estimated_wait_minutes, joined_at
    )
    VALUES (
        v_entry_id, p_business_id, v_caller_uid,
        COALESCE(p_session_id, v_caller_uid::text),
        v_token_number, TRIM(p_customer_name), NULLIF(TRIM(p_customer_phone), ''),
        'waiting', p_notes, COALESCE(p_travel_time_minutes, 0), v_est_wait, NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'entry_id', v_entry_id,
        'token_number', v_token_number,
        'people_ahead', v_people_ahead,
        'estimated_wait_minutes', v_est_wait
    );
END;
$$;

-- FUNCTION: Atomic Advance Queue (Strict Business Owner Authorization or Admin)
CREATE OR REPLACE FUNCTION public.rpc_advance_queue(
    p_business_id UUID,
    p_counter_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN;
    v_next_waiting RECORD;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
    END IF;

    SELECT (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.businesses WHERE id = p_business_id AND owner_id = v_caller_uid
    )) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Unauthorized: Only the verified business owner can advance this queue.'
        );
    END IF;

    -- Complete currently serving entry
    IF p_counter_id IS NOT NULL THEN
        UPDATE public.queue_entries
        SET status = 'completed', completed_at = NOW()
        WHERE business_id = p_business_id AND counter_id = p_counter_id AND status = 'serving';
    ELSE
        UPDATE public.queue_entries
        SET status = 'completed', completed_at = NOW()
        WHERE business_id = p_business_id AND status = 'serving';
    END IF;

    -- Find next waiting entry (FIFO order by joined_at)
    SELECT * INTO v_next_waiting
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status = 'waiting'
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        UPDATE public.queue_entries
        SET 
            status = 'called',
            called_at = NOW(),
            counter_id = COALESCE(p_counter_id, counter_id)
        WHERE id = v_next_waiting.id;

        RETURN jsonb_build_object(
            'success', true,
            'advanced', true,
            'entry_id', v_next_waiting.id,
            'token_number', v_next_waiting.token_number,
            'customer_name', v_next_waiting.customer_name,
            'status', 'called'
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'advanced', false,
            'message', 'No customers waiting in queue.'
        );
    END IF;
END;
$$;

-- FUNCTION: Atomic Create Order (Server-Side Price Verification, Anti-Tamper)
CREATE OR REPLACE FUNCTION public.rpc_create_order(
    p_business_id UUID,
    p_customer_name TEXT,
    p_session_id TEXT DEFAULT NULL,
    p_queue_entry_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_order_id UUID;
    v_order_number TEXT;
    v_item JSONB;
    v_menu_item RECORD;
    v_item_id UUID;
    v_qty INTEGER;
    v_unit_price NUMERIC(10, 2);
    v_subtotal NUMERIC(10, 2);
    v_total NUMERIC(10, 2) := 0.00;
    v_order_seq INTEGER;
    v_queue_entry RECORD;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to place an order.';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cannot create an empty or malformed order.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id AND is_open = true) THEN
        RAISE EXCEPTION 'This business is currently closed.';
    END IF;

    -- Validate queue entry ownership if provided
    IF p_queue_entry_id IS NOT NULL THEN
        SELECT * INTO v_queue_entry FROM public.queue_entries WHERE id = p_queue_entry_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Associated queue entry not found.';
        END IF;
        IF v_queue_entry.business_id != p_business_id THEN
            RAISE EXCEPTION 'Queue entry does not belong to this business.';
        END IF;
        IF v_queue_entry.user_id != v_caller_uid AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'Queue entry belongs to a different customer.';
        END IF;
    END IF;

    SELECT FLOOR(1000 + RANDOM() * 9000)::INTEGER INTO v_order_seq;
    v_order_number := 'ORD-' || v_order_seq::TEXT;
    v_order_id := gen_random_uuid();

    -- Payment status defaults securely to 'pay_at_business'. Client input for payment_status is ignored.
    INSERT INTO public.orders (
        id, business_id, queue_entry_id, user_id, session_id,
        order_number, customer_name, total_amount, status, payment_status, notes, created_at
    )
    VALUES (
        v_order_id, p_business_id, p_queue_entry_id, v_caller_uid,
        COALESCE(p_session_id, v_caller_uid::text),
        v_order_number, TRIM(p_customer_name), 0.00, 'pending',
        'pay_at_business', p_notes, NOW()
    );

    -- Loop over items and strictly verify existence, availability, and database pricing
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        BEGIN
            v_item_id := (v_item->>'menu_item_id')::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid menu item ID provided.';
        END;

        v_qty := (v_item->>'quantity')::INTEGER;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity for each item must be greater than zero.';
        END IF;

        -- Strict lookup in menu_items belonging to this specific business
        SELECT * INTO v_menu_item 
        FROM public.menu_items 
        WHERE id = v_item_id AND business_id = p_business_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Menu item not found for this business.';
        END IF;

        IF NOT v_menu_item.is_available THEN
            RAISE EXCEPTION 'Item "%" is currently unavailable or sold out.', v_menu_item.name;
        END IF;

        -- Trusted database price only
        v_unit_price := v_menu_item.price;
        v_subtotal := v_unit_price * v_qty;
        v_total := v_total + v_subtotal;

        INSERT INTO public.order_items (order_id, menu_item_id, item_name, quantity, unit_price, subtotal)
        VALUES (v_order_id, v_menu_item.id, v_menu_item.name, v_qty, v_unit_price, v_subtotal);
    END LOOP;

    UPDATE public.orders SET total_amount = v_total WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total
    );
END;
$$;

-- FUNCTION: Public Aggregated Queue Status (Zero PII Exposure)
CREATE OR REPLACE FUNCTION public.rpc_get_public_queue_status(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_serving_tokens TEXT[];
    v_waiting_count INTEGER;
    v_avg_service_time INTEGER;
    v_est_wait INTEGER;
BEGIN
    SELECT COALESCE(array_agg(token_number ORDER BY served_at DESC NULLS LAST), ARRAY[]::TEXT[])
    INTO v_serving_tokens
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status IN ('serving', 'called');

    SELECT COUNT(*) INTO v_waiting_count
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status = 'waiting';

    SELECT COALESCE(b.avg_service_time, 5) INTO v_avg_service_time
    FROM public.businesses b WHERE b.id = p_business_id;

    v_est_wait := v_waiting_count * COALESCE(v_avg_service_time, 5);

    RETURN jsonb_build_object(
        'business_id', p_business_id,
        'serving_tokens', v_serving_tokens,
        'waiting_count', v_waiting_count,
        'estimated_wait_minutes', v_est_wait
    );
END;
$$;

-- FUNCTION: Transactional Business Registration (Atomic creation of profile, business, settings, counter)
CREATE OR REPLACE FUNCTION public.rpc_register_business(
    p_owner_name TEXT,
    p_business_name TEXT,
    p_phone TEXT,
    p_category TEXT,
    p_location TEXT,
    p_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_email TEXT;
    v_business_id UUID;
    v_counter_id UUID;
    v_biz RECORD;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
    END IF;

    -- Fetch user's verified email from auth.users
    SELECT email INTO v_email FROM auth.users WHERE id = v_caller_uid;
    IF v_email IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User account not found.');
    END IF;

    -- 1. Ensure profile exists with business_owner role (never admin)
    INSERT INTO public.profiles (id, full_name, email, phone, role, updated_at)
    VALUES (v_caller_uid, TRIM(p_owner_name), v_email, NULLIF(TRIM(p_phone), ''), 'business_owner', NOW())
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

    -- 2. Create business record
    v_business_id := gen_random_uuid();
    INSERT INTO public.businesses (
        id, owner_id, name, slug, category, description, location,
        banner_url, logo_url, phone, email, is_open, rating, review_count, avg_service_time, token_prefix
    ) VALUES (
        v_business_id,
        v_caller_uid,
        TRIM(p_business_name),
        TRIM(p_slug),
        p_category,
        'Welcome to ' || TRIM(p_business_name) || '. Skip the wait and reserve your spot in line directly.',
        TRIM(p_location),
        '/assets/aistudio/Warm_Virtual-Q_Business_Discovery_6cffc5a7.png',
        '/assets/aistudio/Virtual-Q_Canteen_Menu_Interface_d23341ff.png',
        NULLIF(TRIM(p_phone), ''),
        v_email,
        true,
        5.00,
        0,
        5,
        'Q'
    )
    RETURNING * INTO v_biz;

    -- 3. Create queue settings
    INSERT INTO public.queue_settings (
        business_id, max_capacity, avg_service_duration_min, grace_period_min,
        auto_advance, opening_time, closing_time, is_queue_open, congestion_threshold
    ) VALUES (
        v_business_id, 50, 5, 5, true, '08:00', '21:00', true, 10
    );

    -- 4. Create initial main service counter
    v_counter_id := gen_random_uuid();
    INSERT INTO public.counters (id, business_id, name, code, is_active)
    VALUES (v_counter_id, v_business_id, 'Counter 1 - Main Service', 'C1', true);

    RETURN jsonb_build_object(
        'success', true,
        'business_id', v_business_id,
        'business', row_to_json(v_biz)
    );
END;
$$;

-- FUNCTION: Secure Admin Business Deletion (Admin Only, Cascade Deletes Associated Records)
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_business(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_adm BOOLEAN;
    v_biz RECORD;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
    END IF;
    
    SELECT public.is_admin() INTO v_is_adm;
    
    IF NOT v_is_adm THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Access denied: Only a verified administrator can perform global business deletion.'
        );
    END IF;

    SELECT * INTO v_biz FROM public.businesses WHERE id = p_business_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found');
    END IF;

    -- Atomic transactional cascade deletion of all related data
    DELETE FROM public.order_items WHERE order_id IN (SELECT id FROM public.orders WHERE business_id = p_business_id);
    DELETE FROM public.orders WHERE business_id = p_business_id;
    DELETE FROM public.queue_entries WHERE business_id = p_business_id;
    DELETE FROM public.menu_items WHERE business_id = p_business_id;
    DELETE FROM public.counters WHERE business_id = p_business_id;
    DELETE FROM public.queue_settings WHERE business_id = p_business_id;
    DELETE FROM public.business_token_counters WHERE business_id = p_business_id;
    DELETE FROM public.businesses WHERE id = p_business_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Business "' || v_biz.name || '" and all associated data deleted successfully.',
        'deleted_business_id', p_business_id
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. STRICT PERMISSION ASSIGNMENTS (REVOKE PUBLIC & GRANT EXPLICIT)
-- ----------------------------------------------------------------------------
-- Revoke all default execution permissions from PUBLIC for all custom procedures
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_join_queue(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_advance_queue(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_order(UUID, TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_public_queue_status(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_register_business(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_admin_delete_business(UUID) FROM PUBLIC;

-- Explicitly grant only to authorized roles
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_join_queue(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_advance_queue(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_order(UUID, TEXT, TEXT, UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_public_queue_status(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rpc_register_business(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_business(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. REALTIME PUBLICATIONS
-- ----------------------------------------------------------------------------
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.counters; EXCEPTION WHEN OTHERS THEN NULL; END $$;

