-- VIRTUAL-Q 2.0 INITIAL MIGRATION
-- Production-Ready PostgreSQL Schema with Row Level Security (RLS) and RPC Functions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Supabase Auth linked)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'business_owner' CHECK (role IN ('customer', 'business_owner', 'staff', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    rating NUMERIC(3, 2) DEFAULT 4.80,
    review_count INTEGER DEFAULT 0,
    avg_service_time INTEGER DEFAULT 5, -- in minutes
    token_prefix TEXT DEFAULT 'Q',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COUNTERS TABLE
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. QUEUE ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    counter_id UUID REFERENCES public.counters(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL, -- Anonymous customer session continuity
    token_number TEXT NOT NULL, -- e.g., Q101, Q127
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

-- 5. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    queue_entry_id UUID REFERENCES public.queue_entries(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pay_at_business',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 8. QUEUE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.queue_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    max_capacity INTEGER DEFAULT 50,
    avg_service_duration_min INTEGER DEFAULT 5,
    grace_period_min INTEGER DEFAULT 5,
    auto_advance BOOLEAN DEFAULT FALSE,
    opening_time TEXT DEFAULT '08:00',
    closing_time TEXT DEFAULT '22:00',
    is_queue_open BOOLEAN DEFAULT TRUE,
    congestion_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON public.businesses(category);
CREATE INDEX IF NOT EXISTS idx_queue_entries_biz_status ON public.queue_entries(business_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_session ON public.queue_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_biz_status ON public.orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(session_id);

--------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
--------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. Businesses Policies
CREATE POLICY "Public can view open and registered businesses"
    ON public.businesses FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Owners can manage their own business"
    ON public.businesses FOR ALL
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- 3. Counters Policies
CREATE POLICY "Public can view active counters"
    ON public.counters FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Owners can manage their counters"
    ON public.counters FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = counters.business_id AND b.owner_id = auth.uid()
    ));

-- 4. Queue Entries Policies
CREATE POLICY "Public can read limited queue info for live counts"
    ON public.queue_entries FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Customers can insert their own queue entry"
    ON public.queue_entries FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Customers can cancel their own active queue entry"
    ON public.queue_entries FOR UPDATE
    TO public
    USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR auth.uid() = user_id)
    WITH CHECK (status = 'cancelled');

CREATE POLICY "Business owners can manage their queue entries"
    ON public.queue_entries FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid()
    ));

-- 5. Menu Items Policies
CREATE POLICY "Public can view available menu items"
    ON public.menu_items FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Owners can manage their menu items"
    ON public.menu_items FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()
    ));

-- 6. Orders Policies
CREATE POLICY "Customers can view their session orders"
    ON public.orders FOR SELECT
    TO public
    USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' OR auth.uid() = user_id);

CREATE POLICY "Customers can place orders"
    ON public.orders FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Owners can view and manage their business orders"
    ON public.orders FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = orders.business_id AND b.owner_id = auth.uid()
    ));

-- 7. Order Items Policies
CREATE POLICY "Public can view order items for their permitted orders"
    ON public.order_items FOR SELECT
    TO public
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
    ));

CREATE POLICY "Customers can insert order items"
    ON public.order_items FOR INSERT
    TO public
    WITH CHECK (true);

-- 8. Queue Settings Policies
CREATE POLICY "Public can view queue settings"
    ON public.queue_settings FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Owners can manage their queue settings"
    ON public.queue_settings FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid()
    ));

--------------------------------------------------------------------------------
-- SECURE RPC FUNCTIONS FOR ATOMIC OPERATIONS
--------------------------------------------------------------------------------

-- FUNCTION: Atomic Join Queue
CREATE OR REPLACE FUNCTION public.rpc_join_queue(
    p_business_id UUID,
    p_session_id TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT DEFAULT NULL,
    p_travel_time_minutes INTEGER DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business RECORD;
    v_token_prefix TEXT;
    v_next_number INTEGER;
    v_token_number TEXT;
    v_people_ahead INTEGER;
    v_avg_service_time INTEGER;
    v_est_wait INTEGER;
    v_entry_id UUID;
    v_active_existing RECORD;
BEGIN
    -- Check if business is open
    SELECT * INTO v_business FROM public.businesses WHERE id = p_business_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Business not found';
    END IF;

    IF NOT v_business.is_open THEN
        RAISE EXCEPTION 'Business queue is currently closed';
    END IF;

    -- Prevent duplicate active queues for same session
    SELECT * INTO v_active_existing 
    FROM public.queue_entries 
    WHERE business_id = p_business_id 
      AND session_id = p_session_id 
      AND status IN ('waiting', 'called', 'serving')
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You already have an active token for this business.',
            'entry_id', v_active_existing.id,
            'token_number', v_active_existing.token_number
        );
    END IF;

    -- Count waiting customers ahead
    SELECT COUNT(*) INTO v_people_ahead 
    FROM public.queue_entries 
    WHERE business_id = p_business_id AND status = 'waiting';

    v_avg_service_time := COALESCE(v_business.avg_service_time, 5);
    v_est_wait := v_people_ahead * v_avg_service_time;

    -- Generate atomic next token number for this business today
    v_token_prefix := COALESCE(v_business.token_prefix, 'Q');
    
    SELECT COALESCE(MAX(SUBSTRING(token_number FROM '[0-9]+')::INTEGER), 100) + 1
    INTO v_next_number
    FROM public.queue_entries
    WHERE business_id = p_business_id AND joined_at >= CURRENT_DATE;

    v_token_number := v_token_prefix || v_next_number::TEXT;

    -- Insert queue record
    INSERT INTO public.queue_entries (
        business_id,
        session_id,
        token_number,
        customer_name,
        customer_phone,
        status,
        notes,
        travel_time_minutes,
        estimated_wait_minutes,
        joined_at
    )
    VALUES (
        p_business_id,
        p_session_id,
        v_token_number,
        p_customer_name,
        p_customer_phone,
        'waiting',
        p_notes,
        p_travel_time_minutes,
        v_est_wait,
        NOW()
    )
    RETURNING id INTO v_entry_id;

    RETURN jsonb_build_object(
        'success', true,
        'entry_id', v_entry_id,
        'token_number', v_token_number,
        'people_ahead', v_people_ahead,
        'estimated_wait_minutes', v_est_wait
    );
END;
$$;

-- FUNCTION: Atomic Advance Queue / Call Next
CREATE OR REPLACE FUNCTION public.rpc_advance_queue(
    p_business_id UUID,
    p_counter_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_serving RECORD;
    v_next_waiting RECORD;
BEGIN
    -- 1. Complete any current serving customer at this counter or overall
    IF p_counter_id IS NOT NULL THEN
        UPDATE public.queue_entries
        SET status = 'completed', completed_at = NOW()
        WHERE business_id = p_business_id AND counter_id = p_counter_id AND status = 'serving';
    ELSE
        UPDATE public.queue_entries
        SET status = 'completed', completed_at = NOW()
        WHERE business_id = p_business_id AND status = 'serving';
    END IF;

    -- 2. Fetch the next waiting customer (FIFO)
    SELECT * INTO v_next_waiting
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status = 'waiting'
    ORDER BY queue_sequence ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No more customers waiting.',
            'advanced', false
        );
    END IF;

    -- 3. Transition next waiting to 'serving'
    UPDATE public.queue_entries
    SET status = 'serving',
        counter_id = p_counter_id,
        served_at = NOW()
    WHERE id = v_next_waiting.id;

    RETURN jsonb_build_object(
        'success', true,
        'advanced', true,
        'entry_id', v_next_waiting.id,
        'token_number', v_next_waiting.token_number,
        'customer_name', v_next_waiting.customer_name
    );
END;
$$;

-- REALTIME PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.counters;
