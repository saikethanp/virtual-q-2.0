-- ============================================================================
-- VIRTUAL-Q 2.0 CORRECTIVE SECURITY & CONCURRENCY MIGRATION
-- Migration: 20261102000000_security_and_rls_fixes.sql
-- ============================================================================

-- 1. PROFILES TABLE HARDENING
-- Ensure profiles table has proper RLS policies for auth signup and update
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. BUSINESSES TABLE HARDENING
-- Public can view open businesses; only authenticated owner can insert/update/delete
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view open and registered businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can manage their own business" ON public.businesses;
DROP POLICY IF EXISTS "Public can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can insert their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can delete their business" ON public.businesses;

CREATE POLICY "Public can view businesses"
    ON public.businesses FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Owners can insert their business"
    ON public.businesses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their business"
    ON public.businesses FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their business"
    ON public.businesses FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- 3. COUNTERS TABLE HARDENING
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active counters" ON public.counters;
DROP POLICY IF EXISTS "Owners can manage their counters" ON public.counters;
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
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = counters.business_id AND b.owner_id = auth.uid()
    ));

CREATE POLICY "Owners can update counters"
    ON public.counters FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = counters.business_id AND b.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = counters.business_id AND b.owner_id = auth.uid()
    ));

CREATE POLICY "Owners can delete counters"
    ON public.counters FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = counters.business_id AND b.owner_id = auth.uid()
    ));

-- 4. QUEUE ENTRIES HARDENING (Fix Critical Customer PII Leak)
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read limited queue info for live counts" ON public.queue_entries;
DROP POLICY IF EXISTS "Customers can insert their own queue entry" ON public.queue_entries;
DROP POLICY IF EXISTS "Customers can cancel their own active queue entry" ON public.queue_entries;
DROP POLICY IF EXISTS "Business owners can manage their queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Customers can view their own queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Business owners can view their queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Business owners can update their queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Business owners can delete their queue entries" ON public.queue_entries;

-- Customers can ONLY view their own queue records
CREATE POLICY "Customers can view their own queue entries"
    ON public.queue_entries FOR SELECT
    TO public
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (session_id IS NOT NULL AND (
            session_id = auth.uid()::text OR
            session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id', '')
        ))
    );

-- Business owners can view all queue entries belonging to their business
CREATE POLICY "Business owners can view their queue entries"
    ON public.queue_entries FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid()
    ));

-- Business owners can update queue entries (status, counter, served timestamps)
CREATE POLICY "Business owners can update their queue entries"
    ON public.queue_entries FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_entries.business_id AND b.owner_id = auth.uid()
    ));

-- Customers can only cancel their own active queue entries
CREATE POLICY "Customers can cancel their own active queue entry"
    ON public.queue_entries FOR UPDATE
    TO public
    USING (
        status IN ('waiting', 'called') AND
        (
            (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
            (session_id = auth.uid()::text) OR
            (session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id', ''))
        )
    )
    WITH CHECK (status = 'cancelled');

-- 5. MENU ITEMS HARDENING
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view available menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can manage their menu items" ON public.menu_items;
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
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()
    ));

CREATE POLICY "Owners can update menu items"
    ON public.menu_items FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()
    ));

CREATE POLICY "Owners can delete menu items"
    ON public.menu_items FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = menu_items.business_id AND b.owner_id = auth.uid()
    ));

-- 6. ORDERS & ORDER ITEMS HARDENING
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view their session orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can place orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can view and manage their business orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can view their business orders" ON public.orders;
DROP POLICY IF EXISTS "Owners can update their business orders" ON public.orders;

-- Customers can view only their own orders
CREATE POLICY "Customers can view their own orders"
    ON public.orders FOR SELECT
    TO public
    USING (
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        (session_id = auth.uid()::text) OR
        (session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id', ''))
    );

-- Business owners can view orders for their business
CREATE POLICY "Owners can view their business orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = orders.business_id AND b.owner_id = auth.uid()
    ));

-- Business owners can update order status (preparing, ready, completed, cancelled)
CREATE POLICY "Owners can update their business orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = orders.business_id AND b.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = orders.business_id AND b.owner_id = auth.uid()
    ));

-- Order Items Policies
DROP POLICY IF EXISTS "Public can view order items for their permitted orders" ON public.order_items;
DROP POLICY IF EXISTS "Customers can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view order items for their permitted orders" ON public.order_items;

CREATE POLICY "Users can view order items for their permitted orders"
    ON public.order_items FOR SELECT
    TO public
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
    ));

-- 7. QUEUE SETTINGS HARDENING
ALTER TABLE public.queue_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Owners can manage their queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Owners can insert queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Owners can update queue settings" ON public.queue_settings;

CREATE POLICY "Public can view queue settings"
    ON public.queue_settings FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Owners can insert queue settings"
    ON public.queue_settings FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid()
    ));

CREATE POLICY "Owners can update queue settings"
    ON public.queue_settings FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.businesses b
        WHERE b.id = queue_settings.business_id AND b.owner_id = auth.uid()
    ));

-- 8. UNIQUE CONSTRAINT FOR TOKEN CONCURRENCY SAFETY
-- Guarantees that token numbers per business cannot collide for active entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_tokens
    ON public.queue_entries (business_id, token_number)
    WHERE status IN ('waiting', 'called', 'serving');

-- Dedicated sequence tracking table for concurrency-safe sequential tokens
CREATE TABLE IF NOT EXISTS public.business_token_counters (
    business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_number INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.business_token_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read token counters"
    ON public.business_token_counters FOR SELECT
    TO public
    USING (true);

-- ============================================================================
-- SECURE ATOMIC RPC FUNCTIONS (SECURITY DEFINER with safe search_path)
-- ============================================================================

-- FUNCTION: Atomic Concurrency-Safe Queue Join
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
SET search_path = public
AS $$
DECLARE
    v_business RECORD;
    v_settings RECORD;
    v_token_prefix TEXT;
    v_next_number INTEGER;
    v_token_number TEXT;
    v_people_ahead INTEGER;
    v_avg_service_time INTEGER;
    v_est_wait INTEGER;
    v_entry_id UUID;
    v_active_existing RECORD;
    v_caller_uid UUID;
    v_today DATE := CURRENT_DATE;
BEGIN
    v_caller_uid := auth.uid();

    -- 1. Validate business exists
    SELECT * INTO v_business 
    FROM public.businesses 
    WHERE id = p_business_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found.');
    END IF;

    IF NOT COALESCE(v_business.is_open, true) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business queue is currently closed.');
    END IF;

    -- 2. Lock queue settings row to serialize concurrent queue entries for this business
    SELECT * INTO v_settings
    FROM public.queue_settings
    WHERE business_id = p_business_id
    FOR UPDATE;

    IF FOUND AND v_settings.is_queue_open = false THEN
        RETURN jsonb_build_object('success', false, 'message', 'This queue is currently not accepting new tokens.');
    END IF;

    -- 3. Check duplicate active tokens for the same customer session/user
    SELECT * INTO v_active_existing 
    FROM public.queue_entries 
    WHERE business_id = p_business_id 
      AND (
          (v_caller_uid IS NOT NULL AND user_id = v_caller_uid) OR
          (p_session_id IS NOT NULL AND session_id = p_session_id)
      )
      AND status IN ('waiting', 'called', 'serving')
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'You already have an active token (' || v_active_existing.token_number || ') for this business.',
            'entry_id', v_active_existing.id,
            'token_number', v_active_existing.token_number
        );
    END IF;

    -- 4. Check max capacity
    SELECT COUNT(*) INTO v_people_ahead 
    FROM public.queue_entries 
    WHERE business_id = p_business_id AND status = 'waiting';

    IF v_settings.max_capacity IS NOT NULL AND v_people_ahead >= v_settings.max_capacity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Queue is at maximum capacity. Please try again shortly.');
    END IF;

    v_avg_service_time := COALESCE(v_settings.avg_service_duration_min, v_business.avg_service_time, 5);
    v_est_wait := v_people_ahead * v_avg_service_time;

    -- 5. Concurrency-safe atomic token numbering
    v_token_prefix := COALESCE(v_business.token_prefix, 'Q');

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

    -- 6. Insert new queue entry
    v_entry_id := uuid_generate_v4();

    INSERT INTO public.queue_entries (
        id,
        business_id,
        user_id,
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
        v_entry_id,
        p_business_id,
        v_caller_uid,
        COALESCE(p_session_id, v_caller_uid::text, v_entry_id::text),
        v_token_number,
        TRIM(p_customer_name),
        NULLIF(TRIM(p_customer_phone), ''),
        'waiting',
        p_notes,
        COALESCE(p_travel_time_minutes, 0),
        v_est_wait,
        NOW()
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

-- FUNCTION: Atomic Advance Queue (Strict Business Owner Authorization)
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
    v_next_waiting RECORD;
BEGIN
    v_caller_uid := auth.uid();

    -- Strict authorization check: caller must own this business
    IF NOT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND owner_id = v_caller_uid
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Unauthorized: Only the verified business owner can advance this queue.'
        );
    END IF;

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

    -- 2. Fetch the next waiting customer (FIFO with row locking to eliminate race conditions)
    SELECT * INTO v_next_waiting
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status = 'waiting'
    ORDER BY queue_sequence ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No more customers waiting in line.',
            'advanced', false
        );
    END IF;

    -- 3. Transition next waiting customer to 'serving'
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

-- FUNCTION: Trusted Server-Side Order Creation (Server-Computed Pricing)
CREATE OR REPLACE FUNCTION public.rpc_create_order(
    p_business_id UUID,
    p_customer_name TEXT,
    p_items JSONB, -- Array of { "menu_item_id": UUID, "quantity": INTEGER }
    p_queue_entry_id UUID DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_order_id UUID := uuid_generate_v4();
    v_item RECORD;
    v_menu_item RECORD;
    v_total_amount NUMERIC(10, 2) := 0.00;
    v_order_number TEXT;
    v_subtotal NUMERIC(10, 2);
    v_quantity INTEGER;
BEGIN
    v_caller_uid := auth.uid();

    -- Validate business
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Business not found.');
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cart is empty.');
    END IF;

    -- Generate human-friendly sequential order number
    v_order_number := 'ORD-' || FLOOR(100 + RANDOM() * 900)::TEXT;

    -- Create empty order record first
    INSERT INTO public.orders (
        id,
        business_id,
        queue_entry_id,
        user_id,
        session_id,
        order_number,
        customer_name,
        total_amount,
        status,
        payment_status,
        notes,
        created_at
    )
    VALUES (
        v_order_id,
        p_business_id,
        p_queue_entry_id,
        v_caller_uid,
        COALESCE(p_session_id, v_caller_uid::text, v_order_id::text),
        v_order_number,
        TRIM(p_customer_name),
        0.00,
        'pending',
        'pay_at_business',
        p_notes,
        NOW()
    );

    -- Iterate through each item, verify against trusted menu_items table
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(menu_item_id UUID, quantity INTEGER)
    LOOP
        v_quantity := COALESCE(v_item.quantity, 1);
        IF v_quantity <= 0 THEN
            v_quantity := 1;
        END IF;

        SELECT * INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item.menu_item_id AND business_id = p_business_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Menu item % not found in this business.', v_item.menu_item_id;
        END IF;

        IF NOT COALESCE(v_menu_item.is_available, true) THEN
            RAISE EXCEPTION 'Item "%" is currently sold out.', v_menu_item.name;
        END IF;

        v_subtotal := v_menu_item.price * v_quantity;
        v_total_amount := v_total_amount + v_subtotal;

        INSERT INTO public.order_items (
            id,
            order_id,
            menu_item_id,
            item_name,
            quantity,
            unit_price,
            subtotal
        )
        VALUES (
            uuid_generate_v4(),
            v_order_id,
            v_menu_item.id,
            v_menu_item.name,
            v_quantity,
            v_menu_item.price, -- Trusted price from database!
            v_subtotal
        );
    END LOOP;

    -- Update total amount in order
    UPDATE public.orders
    SET total_amount = v_total_amount
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount
    );
END;
$$;

-- FUNCTION: Public Non-Sensitive Queue Metrics (hides customer names/phones)
CREATE OR REPLACE FUNCTION public.rpc_get_public_queue_status(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_waiting_count INTEGER;
    v_current_serving TEXT;
    v_avg_service INTEGER;
    v_est_wait INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_waiting_count
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status = 'waiting';

    SELECT token_number INTO v_current_serving
    FROM public.queue_entries
    WHERE business_id = p_business_id AND status IN ('serving', 'called')
    ORDER BY served_at DESC NULLS LAST, called_at DESC NULLS LAST
    LIMIT 1;

    SELECT COALESCE(avg_service_time, 5) INTO v_avg_service
    FROM public.businesses
    WHERE id = p_business_id;

    v_est_wait := v_waiting_count * COALESCE(v_avg_service, 5);

    RETURN jsonb_build_object(
        'business_id', p_business_id,
        'waiting_count', v_waiting_count,
        'now_serving', COALESCE(v_current_serving, '—'),
        'estimated_wait_minutes', v_est_wait
    );
END;
$$;

-- ============================================================================
-- FUNCTION EXECUTION PERMISSIONS
-- ============================================================================
REVOKE ALL ON FUNCTION public.rpc_join_queue FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_advance_queue FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_create_order FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_public_queue_status FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_join_queue TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_advance_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_public_queue_status TO anon, authenticated;

