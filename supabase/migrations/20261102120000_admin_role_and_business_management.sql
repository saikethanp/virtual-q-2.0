-- Migration: Admin Role and Clean Production Setup
-- Adds is_admin() function, role protections, rpc_admin_delete_business, and admin-enabled RLS policies

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Update profiles RLS: Allow admins full visibility and prevent role escalation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    (auth.uid() = id AND (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) 
      OR public.is_admin()
    ))
    OR public.is_admin()
  );

-- Update businesses RLS: Allow admins to manage or delete any business
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can delete their business" ON public.businesses;

CREATE POLICY "Owners can update their business" 
  ON public.businesses FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = owner_id OR public.is_admin()) 
  WITH CHECK (auth.uid() = owner_id OR public.is_admin());

CREATE POLICY "Owners can delete their business" 
  ON public.businesses FOR DELETE 
  TO authenticated 
  USING (auth.uid() = owner_id OR public.is_admin());

-- RPC Admin Delete Business
CREATE OR REPLACE FUNCTION public.rpc_admin_delete_business(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_adm BOOLEAN;
    v_biz RECORD;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_delete_business(UUID) TO authenticated;

