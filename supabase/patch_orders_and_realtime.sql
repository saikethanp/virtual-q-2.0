-- ============================================================================
-- VIRTUAL-Q 2.0: ORDER MANAGEMENT, REALTIME & DELETE POLICIES MIGRATION
-- Run this in the Supabase SQL Editor: Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Support all 6 order statuses in database check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'));

-- 2. Add explicit DELETE policies for business owners on orders and order items
DROP POLICY IF EXISTS "Owners can delete their business orders" ON public.orders;
CREATE POLICY "Owners can delete their business orders" 
  ON public.orders FOR DELETE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = orders.business_id AND b.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can delete their business order items" ON public.order_items;
CREATE POLICY "Owners can delete their business order items" 
  ON public.order_items FOR DELETE 
  TO authenticated 
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.orders o 
      JOIN public.businesses b ON b.id = o.business_id 
      WHERE o.id = order_items.order_id AND b.owner_id = auth.uid()
    )
  );

-- 3. Atomic Procedure: Owner Clear All Business Orders
CREATE OR REPLACE FUNCTION public.rpc_clear_business_orders(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN;
    v_count INTEGER;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.businesses 
        WHERE id = p_business_id AND (owner_id = v_caller_uid OR public.is_admin())
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Only the business owner can clear orders.');
    END IF;

    DELETE FROM public.order_items 
    WHERE order_id IN (SELECT id FROM public.orders WHERE business_id = p_business_id);

    WITH deleted AS (
        DELETE FROM public.orders 
        WHERE business_id = p_business_id
        RETURNING *
    )
    SELECT count(*) INTO v_count FROM deleted;

    RETURN jsonb_build_object('success', true, 'deleted_count', v_count);
END;
$$;

-- 4. Atomic Procedure: Owner Delete Single Order
CREATE OR REPLACE FUNCTION public.rpc_delete_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_authorized BOOLEAN;
BEGIN
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required.');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.orders o
        JOIN public.businesses b ON b.id = o.business_id
        WHERE o.id = p_order_id AND (b.owner_id = v_caller_uid OR public.is_admin())
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized. Only the business owner can delete this order.');
    END IF;

    DELETE FROM public.order_items WHERE order_id = p_order_id;
    DELETE FROM public.orders WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Permissions
REVOKE ALL ON FUNCTION public.rpc_clear_business_orders(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_delete_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_clear_business_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_delete_order(UUID) TO authenticated;

-- 6. Full Realtime Support & CDC Replication
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries; EXCEPTION WHEN OTHERS THEN NULL; END $$;
