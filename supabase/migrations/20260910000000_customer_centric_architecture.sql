-- ==============================================================================
-- MIGRATION: CUSTOMER-CENTRIC ARCHITECTURE
-- ==============================================================================

-- 1. CREATE CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    logo_url TEXT,
    address TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE CUSTOMER USERS TABLE
CREATE TABLE IF NOT EXISTS public.customer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'customer_admin' CHECK (role IN ('customer_admin', 'customer_viewer')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id, auth_user_id)
);

-- 3. ADD customer_id TO CAMPAIGNS TABLE
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

-- 4. SAFE DATA MIGRATION FOR EXISTING PRODUCTION CAMPAIGNS & CLIENTS
DO $$
DECLARE
    v_woodysbrook_id UUID;
    v_iwillfly_id UUID;
    v_iwillwin_id UUID;
    v_woodysbrook_auth_id UUID;
    v_iwillfly_auth_id UUID;
BEGIN
    -- Create Woodysbrook Customer if not exists
    SELECT id INTO v_woodysbrook_id FROM public.customers WHERE company_name = 'Woodysbrook' LIMIT 1;
    IF v_woodysbrook_id IS NULL THEN
        INSERT INTO public.customers (company_name, contact_person, email, phone, status, notes)
        VALUES ('Woodysbrook', 'Woodysbrook Manager', 'woodysbrook@gmail.com', '9876543210', 'Active', 'Primary hospitality & resort partner')
        RETURNING id INTO v_woodysbrook_id;
    END IF;

    -- Create IWILLFLY Customer if not exists
    SELECT id INTO v_iwillfly_id FROM public.customers WHERE company_name = 'IWILLFLY' LIMIT 1;
    IF v_iwillfly_id IS NULL THEN
        INSERT INTO public.customers (company_name, contact_person, email, phone, status, notes)
        VALUES ('IWILLFLY', 'IWILLFLY Team', 'iwillfly@gmail.com', '9876543211', 'Active', 'Travel & tourism partner')
        RETURNING id INTO v_iwillfly_id;
    END IF;

    -- Create IWILLWIN Media (Internal/Default) Customer if not exists
    SELECT id INTO v_iwillwin_id FROM public.customers WHERE company_name = 'IWILLWIN Media' LIMIT 1;
    IF v_iwillwin_id IS NULL THEN
        INSERT INTO public.customers (company_name, contact_person, email, phone, status, notes)
        VALUES ('IWILLWIN Media', 'Platform Administrator', 'admin@iwillwin.com', '9876543212', 'Active', 'Internal platform campaigns')
        RETURNING id INTO v_iwillwin_id;
    END IF;

    -- Map existing campaigns to customer_id
    UPDATE public.campaigns
    SET customer_id = v_woodysbrook_id
    WHERE (slug = 'onam-scratch-and-win' OR name ILIKE '%Woodysbrook%') AND customer_id IS NULL;

    UPDATE public.campaigns
    SET customer_id = v_iwillfly_id
    WHERE (slug = 'grand-launch' OR name ILIKE '%Grand Festival%') AND customer_id IS NULL;

    -- Any other existing campaigns default to IWILLWIN Media
    UPDATE public.campaigns
    SET customer_id = v_iwillwin_id
    WHERE customer_id IS NULL;

    -- Migrate existing client users to customer_users
    SELECT auth_user_id INTO v_woodysbrook_auth_id FROM public.admin_profiles WHERE email = 'woodysbrook@gmail.com';
    IF v_woodysbrook_auth_id IS NOT NULL THEN
        INSERT INTO public.customer_users (customer_id, auth_user_id, role, status)
        VALUES (v_woodysbrook_id, v_woodysbrook_auth_id, 'customer_admin', 'active')
        ON CONFLICT (customer_id, auth_user_id) DO NOTHING;
    END IF;

    SELECT auth_user_id INTO v_iwillfly_auth_id FROM public.admin_profiles WHERE email = 'iwillfly@gmail.com';
    IF v_iwillfly_auth_id IS NOT NULL THEN
        INSERT INTO public.customer_users (customer_id, auth_user_id, role, status)
        VALUES (v_iwillfly_id, v_iwillfly_auth_id, 'customer_admin', 'active')
        ON CONFLICT (customer_id, auth_user_id) DO NOTHING;
    END IF;
END $$;

-- Enforce NOT NULL on customer_id
ALTER TABLE public.campaigns ALTER COLUMN customer_id SET NOT NULL;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_customer_id ON public.campaigns(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_customer ON public.customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_auth ON public.customer_users(auth_user_id);

-- 6. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_customer_access(p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.customer_users cu
        WHERE cu.auth_user_id = auth.uid()
          AND cu.customer_id = p_customer_id
          AND cu.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.has_campaign_access(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.campaigns c
        JOIN public.customer_users cu ON c.customer_id = cu.customer_id
        WHERE cu.auth_user_id = auth.uid()
          AND c.id = p_campaign_id
          AND cu.status = 'active'
    );
$$;

-- 7. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view accessible customers" ON public.customers;
CREATE POLICY "Users can view accessible customers" ON public.customers
FOR SELECT TO authenticated
USING (public.has_customer_access(id));

DROP POLICY IF EXISTS "Super admins can manage customers" ON public.customers;
CREATE POLICY "Super admins can manage customers" ON public.customers
FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Users can view accessible customer_users" ON public.customer_users;
DROP POLICY IF EXISTS "Super admins and customer admins can manage customer_users" ON public.customer_users;

CREATE POLICY "customer_users_select" ON public.customer_users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "customer_users_super_admin_manage" ON public.customer_users
FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Allow super admins and customer admins to insert campaigns
DROP POLICY IF EXISTS "Super admins can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authorized users can insert campaigns" ON public.campaigns;
CREATE POLICY "Authorized users can insert campaigns" ON public.campaigns
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin() OR (
    customer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.customer_users cu
        WHERE cu.auth_user_id = auth.uid()
          AND cu.customer_id = campaigns.customer_id
          AND cu.role = 'customer_admin'
          AND cu.status = 'active'
    )
));

-- 8. CUSTOMER PROCEDURES & RPCS

-- RPC: Get all customers with overview statistics
CREATE OR REPLACE FUNCTION public.admin_get_customers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT (public.is_super_admin() OR public.is_admin_or_client()) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'company_name', c.company_name,
                'contact_person', c.contact_person,
                'email', c.email,
                'phone', c.phone,
                'logo_url', c.logo_url,
                'address', c.address,
                'status', c.status,
                'notes', c.notes,
                'created_at', c.created_at,
                'campaigns_count', COALESCE(stats.campaigns_count, 0),
                'active_campaigns_count', COALESCE(stats.active_campaigns_count, 0),
                'total_leads', COALESCE(stats.total_leads, 0),
                'total_winners', COALESCE(stats.total_winners, 0)
            )
            ORDER BY c.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_result
    FROM public.customers c
    LEFT JOIN LATERAL (
        SELECT 
            COUNT(DISTINCT camp.id) as campaigns_count,
            COUNT(DISTINCT CASE WHEN camp.status = 'Active' THEN camp.id END) as active_campaigns_count,
            COUNT(DISTINCT l.id) as total_leads,
            COUNT(DISTINCT CASE WHEN l.prize_id IS NOT NULL THEN l.id END) as total_winners
        FROM public.campaigns camp
        LEFT JOIN public.leads l ON camp.id = l.campaign_id
        WHERE camp.customer_id = c.id
    ) stats ON true
    WHERE public.has_customer_access(c.id);

    RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$;

-- RPC: Get single customer detail with campaigns, users, and stats
CREATE OR REPLACE FUNCTION public.admin_get_customer_detail(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_customer JSONB;
    v_campaigns JSONB;
    v_users JSONB;
    v_stats JSONB;
BEGIN
    IF NOT public.has_customer_access(p_customer_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    -- Customer record
    SELECT jsonb_build_object(
        'id', c.id,
        'company_name', c.company_name,
        'contact_person', c.contact_person,
        'email', c.email,
        'phone', c.phone,
        'logo_url', c.logo_url,
        'address', c.address,
        'status', c.status,
        'notes', c.notes,
        'created_at', c.created_at,
        'updated_at', c.updated_at
    ) INTO v_customer
    FROM public.customers c
    WHERE c.id = p_customer_id;

    IF v_customer IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Customer not found.');
    END IF;

    -- Customer Campaigns with counts
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', camp.id,
                'customer_id', camp.customer_id,
                'name', camp.name,
                'slug', camp.slug,
                'description', camp.description,
                'status', camp.status,
                'start_date', camp.start_date,
                'end_date', camp.end_date,
                'logo_url', camp.logo_url,
                'banner_url', camp.banner_url,
                'created_at', camp.created_at,
                'total_leads', COALESCE(cs.total_leads, 0),
                'total_winners', COALESCE(cs.total_winners, 0),
                'remaining_prizes', COALESCE(cs.remaining_prizes, 0)
            )
            ORDER BY camp.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_campaigns
    FROM public.campaigns camp
    LEFT JOIN LATERAL (
        SELECT 
            COUNT(DISTINCT l.id) as total_leads,
            COUNT(DISTINCT CASE WHEN l.prize_id IS NOT NULL THEN l.id END) as total_winners,
            COALESCE(SUM(p.remaining_quantity), 0) as remaining_prizes
        FROM public.campaigns c_inner
        LEFT JOIN public.leads l ON c_inner.id = l.campaign_id
        LEFT JOIN public.prizes p ON c_inner.id = p.campaign_id AND p.is_active = true
        WHERE c_inner.id = camp.id
    ) cs ON true
    WHERE camp.customer_id = p_customer_id;

    -- Customer Users
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cu.id,
                'customer_id', cu.customer_id,
                'auth_user_id', cu.auth_user_id,
                'email', u.email,
                'role', cu.role,
                'status', cu.status,
                'created_at', cu.created_at
            )
            ORDER BY cu.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_users
    FROM public.customer_users cu
    JOIN auth.users u ON cu.auth_user_id = u.id
    WHERE cu.customer_id = p_customer_id;

    -- Overview Stats
    SELECT jsonb_build_object(
        'total_campaigns', COUNT(DISTINCT camp.id),
        'active_campaigns', COUNT(DISTINCT CASE WHEN camp.status = 'Active' THEN camp.id END),
        'total_leads', COUNT(DISTINCT l.id),
        'total_winners', COUNT(DISTINCT CASE WHEN l.prize_id IS NOT NULL THEN l.id END),
        'total_prizes_remaining', COALESCE(SUM(DISTINCT p.remaining_quantity), 0)
    ) INTO v_stats
    FROM public.campaigns camp
    LEFT JOIN public.leads l ON camp.id = l.campaign_id
    LEFT JOIN public.prizes p ON camp.id = p.campaign_id AND p.is_active = true
    WHERE camp.customer_id = p_customer_id;

    RETURN jsonb_build_object(
        'success', true,
        'customer', v_customer,
        'campaigns', v_campaigns,
        'users', v_users,
        'stats', v_stats
    );
END;
$$;

-- RPC: Create Customer
CREATE OR REPLACE FUNCTION public.admin_create_customer(
    p_company_name TEXT,
    p_contact_person TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'Active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied: Only Super Admins can create customers.');
    END IF;

    IF NULLIF(TRIM(p_company_name), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Company name is required.');
    END IF;

    IF NULLIF(TRIM(p_contact_person), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Contact person is required.');
    END IF;

    IF NULLIF(TRIM(p_email), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email address is required.');
    END IF;

    INSERT INTO public.customers (
        company_name, contact_person, email, phone, logo_url, address, notes, status
    ) VALUES (
        TRIM(p_company_name), TRIM(p_contact_person), LOWER(TRIM(p_email)), 
        NULLIF(TRIM(p_phone), ''), NULLIF(TRIM(p_logo_url), ''),
        NULLIF(TRIM(p_address), ''), NULLIF(TRIM(p_notes), ''), COALESCE(p_status, 'Active')
    ) RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- RPC: Update Customer
CREATE OR REPLACE FUNCTION public.admin_update_customer(
    p_customer_id UUID,
    p_company_name TEXT DEFAULT NULL,
    p_contact_person TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied: Only Super Admins can update customers.');
    END IF;

    UPDATE public.customers
    SET
        company_name = COALESCE(NULLIF(TRIM(p_company_name), ''), company_name),
        contact_person = COALESCE(NULLIF(TRIM(p_contact_person), ''), contact_person),
        email = COALESCE(NULLIF(LOWER(TRIM(p_email)), ''), email),
        phone = COALESCE(p_phone, phone),
        logo_url = COALESCE(p_logo_url, logo_url),
        address = COALESCE(p_address, address),
        notes = COALESCE(p_notes, notes),
        status = COALESCE(p_status, status),
        updated_at = NOW()
    WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Customer not found.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Delete Customer
CREATE OR REPLACE FUNCTION public.admin_delete_customer(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied: Only Super Admins can delete customers.');
    END IF;

    DELETE FROM public.customers WHERE id = p_customer_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Customer not found.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Create Customer User
CREATE OR REPLACE FUNCTION public.admin_create_customer_user(
    p_customer_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'customer_admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_clean_email TEXT;
BEGIN
    IF NOT (public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.customer_users cu
        WHERE cu.auth_user_id = auth.uid()
          AND cu.customer_id = p_customer_id
          AND cu.role = 'customer_admin'
          AND cu.status = 'active'
    )) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied: Only administrators can create customer users.');
    END IF;

    v_clean_email := LOWER(TRIM(p_email));
    IF v_clean_email IS NULL OR v_clean_email NOT LIKE '%_@__%.__%' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please provide a valid email address.');
    END IF;

    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password must be at least 6 characters.');
    END IF;

    -- Check if auth user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_clean_email;

    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
            created_at, updated_at, confirmation_token, recovery_token, email_change_token_new,
            email_change, phone_change, phone_change_token, email_change_token_current,
            reauthentication_token, is_sso_user, is_anonymous
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
            v_clean_email, v_encrypted_pw, NOW(), NULL,
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
            jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', false, 'phone_verified', false),
            NULL, NOW(), NOW(), '', '', '', '', '', '', '', '', false, false
        );

        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', false, 'phone_verified', false),
            'email', v_user_id::text, NOW(), NOW(), NOW()
        );
    ELSE
        -- If user exists, update password if provided
        UPDATE auth.users
        SET encrypted_password = crypt(p_password, gen_salt('bf', 10)), updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Insert or update customer_user association
    INSERT INTO public.customer_users (customer_id, auth_user_id, role, status)
    VALUES (p_customer_id, v_user_id, COALESCE(p_role, 'customer_admin'), 'active')
    ON CONFLICT (customer_id, auth_user_id) 
    DO UPDATE SET role = EXCLUDED.role, status = 'active';

    -- Ensure admin_profiles record exists with role 'client'
    INSERT INTO public.admin_profiles (auth_user_id, email, role)
    VALUES (v_user_id, v_clean_email, 'client')
    ON CONFLICT (auth_user_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_clean_email);
END;
$$;

-- RPC: Delete Customer User
CREATE OR REPLACE FUNCTION public.admin_delete_customer_user(p_user_id UUID, p_customer_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT (public.is_super_admin() OR (p_customer_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.customer_users cu
        WHERE cu.auth_user_id = auth.uid()
          AND cu.customer_id = p_customer_id
          AND cu.role = 'customer_admin'
          AND cu.status = 'active'
    ))) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    IF EXISTS (SELECT 1 FROM public.admin_profiles WHERE auth_user_id = p_user_id AND role = 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Super Admin accounts cannot be deleted.');
    END IF;

    IF p_customer_id IS NOT NULL THEN
        DELETE FROM public.customer_users WHERE auth_user_id = p_user_id AND customer_id = p_customer_id;
    ELSE
        DELETE FROM public.customer_users WHERE auth_user_id = p_user_id;
        DELETE FROM auth.users WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_users TO authenticated;
GRANT SELECT ON public.customers TO anon;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.customer_users TO service_role;

GRANT EXECUTE ON FUNCTION public.has_customer_access(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_campaign_access(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_customers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_customer_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_customer(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_customer(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_customer_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer_user(UUID, UUID) TO authenticated;
