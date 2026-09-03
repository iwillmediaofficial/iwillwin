-- Enable UUID & PGCRYPTO extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com',
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Paused', 'Completed')),
    require_name BOOLEAN NOT NULL DEFAULT true,
    require_mobile BOOLEAN NOT NULL DEFAULT true,
    require_email BOOLEAN NOT NULL DEFAULT false,
    collect_dob BOOLEAN NOT NULL DEFAULT true,
    require_dob BOOLEAN NOT NULL DEFAULT false,
    whatsapp_claim_number VARCHAR(50),
    whatsapp_message_template TEXT DEFAULT 'Hi! I won *{prize}* on IWILLWIN! 🎉\nWinning Verification Code: *{code}*\nRegistered Mobile: *{mobile}*\nPlease guide me on how to claim my reward.',
    unique_mobile BOOLEAN NOT NULL DEFAULT true,
    unique_email BOOLEAN NOT NULL DEFAULT false,
    success_message TEXT DEFAULT '🎉 Congratulations on your win!',
    scratch_title TEXT DEFAULT 'Scratch to Reveal Your Prize',
    result_message TEXT DEFAULT 'Show this scratch card to claim your reward.',
    cta_text TEXT DEFAULT 'Claim on WhatsApp',
    cta_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRIZES TABLE
CREATE TABLE IF NOT EXISTS public.prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    allocated_quantity INTEGER NOT NULL DEFAULT 100 CHECK (allocated_quantity >= 0),
    supplied_quantity INTEGER NOT NULL DEFAULT 0 CHECK (supplied_quantity >= 0),
    remaining_quantity INTEGER NOT NULL DEFAULT 100 CHECK (remaining_quantity >= 0),
    maximum_limit INTEGER NOT NULL DEFAULT 100 CHECK (maximum_limit >= 0),
    daily_limit INTEGER NOT NULL DEFAULT 50 CHECK (daily_limit >= 0),
    hourly_limit INTEGER NOT NULL DEFAULT 10 CHECK (hourly_limit >= 0),
    weight INTEGER NOT NULL DEFAULT 10 CHECK (weight >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_remaining_calculation CHECK (remaining_quantity = (allocated_quantity - supplied_quantity))
);

-- 3. LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255),
    mobile VARCHAR(50),
    email VARCHAR(255),
    dob VARCHAR(20),
    claim_code VARCHAR(50),
    prize_id UUID REFERENCES public.prizes(id) ON DELETE SET NULL,
    scratch_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (scratch_status IN ('Pending', 'Revealed')),
    claim_status VARCHAR(20) NOT NULL DEFAULT 'Unclaimed' CHECK (claim_status IN ('Unclaimed', 'Claimed')),
    claimed_at TIMESTAMPTZ,
    ip_address VARCHAR(100),
    user_agent TEXT,
    participated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revealed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRIZE ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.prize_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ADMIN PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'client' CHECK (role IN ('super_admin', 'client', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CAMPAIGN USER ASSIGNMENTS TABLE (MULTI-TENANCY)
CREATE TABLE IF NOT EXISTS public.campaign_user_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, campaign_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_prizes_campaign_id ON public.prizes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prizes_active ON public.prizes(campaign_id, is_active, remaining_quantity);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON public.leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON public.leads(campaign_id, mobile);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(campaign_id, email);
CREATE INDEX IF NOT EXISTS idx_leads_claim_code ON public.leads(claim_code);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_user ON public.campaign_user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assignments_camp ON public.campaign_user_assignments(campaign_id);

-- SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
BEGIN
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    IF v_uid IS NULL THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE auth_user_id = v_uid
          AND role = 'super_admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_client()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID;
BEGIN
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    IF v_uid IS NULL THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE auth_user_id = v_uid
          AND role IN ('super_admin', 'client', 'admin')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_campaign_access(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.campaign_user_assignments
        WHERE user_id = auth.uid()
          AND campaign_id = p_campaign_id
    );
$$;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_user_assignments ENABLE ROW LEVEL SECURITY;

-- Campaigns RLS
DROP POLICY IF EXISTS "Public can view active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins have full access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view accessible campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Super admins can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update accessible campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Super admins can delete campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Public anonymous can view active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Authenticated users can only view accessible campaigns" ON public.campaigns;

-- Unauthenticated public visitors can only read active campaigns
CREATE POLICY "Public anonymous can view active campaigns" ON public.campaigns
FOR SELECT TO anon
USING (status = 'Active');

-- Authenticated admins/clients can ONLY read campaigns they have access to
CREATE POLICY "Authenticated users can only view accessible campaigns" ON public.campaigns
FOR SELECT TO authenticated
USING (public.has_campaign_access(id));

CREATE POLICY "Super admins can insert campaigns" ON public.campaigns
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Users can update accessible campaigns" ON public.campaigns
FOR UPDATE TO authenticated
USING (public.has_campaign_access(id))
WITH CHECK (public.has_campaign_access(id));

CREATE POLICY "Super admins can delete campaigns" ON public.campaigns
FOR DELETE TO authenticated
USING (public.is_super_admin());

-- Prizes RLS
DROP POLICY IF EXISTS "Admins have full access to prizes" ON public.prizes;
DROP POLICY IF EXISTS "Users have full access to accessible prizes" ON public.prizes;

CREATE POLICY "Users have full access to accessible prizes" ON public.prizes
FOR ALL TO authenticated
USING (public.has_campaign_access(campaign_id))
WITH CHECK (public.has_campaign_access(campaign_id));

-- Leads RLS
DROP POLICY IF EXISTS "Admins have full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view accessible leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update accessible leads" ON public.leads;
DROP POLICY IF EXISTS "Super admins can delete leads" ON public.leads;

CREATE POLICY "Users can view accessible leads" ON public.leads
FOR SELECT TO authenticated
USING (public.has_campaign_access(campaign_id));

CREATE POLICY "Users can update accessible leads" ON public.leads
FOR UPDATE TO authenticated
USING (public.has_campaign_access(campaign_id))
WITH CHECK (public.has_campaign_access(campaign_id));

CREATE POLICY "Super admins can delete leads" ON public.leads
FOR DELETE TO authenticated
USING (public.is_super_admin());

-- Allocations RLS
DROP POLICY IF EXISTS "Admins have full access to allocations" ON public.prize_allocations;
DROP POLICY IF EXISTS "Users have full access to accessible allocations" ON public.prize_allocations;

CREATE POLICY "Users have full access to accessible allocations" ON public.prize_allocations
FOR ALL TO authenticated
USING (public.has_campaign_access(campaign_id))
WITH CHECK (public.has_campaign_access(campaign_id));

-- Assignments RLS
DROP POLICY IF EXISTS "View campaign assignments" ON public.campaign_user_assignments;
DROP POLICY IF EXISTS "Super admins manage campaign assignments" ON public.campaign_user_assignments;

CREATE POLICY "View campaign assignments" ON public.campaign_user_assignments
FOR SELECT TO authenticated
USING (public.is_super_admin() OR user_id = auth.uid());

CREATE POLICY "Super admins manage campaign assignments" ON public.campaign_user_assignments
FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Admin Profiles RLS
DROP POLICY IF EXISTS "Users can view own admin profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can manage admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Authenticated users can view admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage admin profiles" ON public.admin_profiles;

CREATE POLICY "Authenticated users can view admin profiles" ON public.admin_profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage admin profiles" ON public.admin_profiles
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.admin_profiles WHERE auth_user_id = NEW.id) THEN
        INSERT INTO public.admin_profiles (auth_user_id, email, role)
        VALUES (NEW.id, NEW.email, 'client')
        ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- ATOMIC CLIENT MANAGEMENT PROCEDURES
CREATE OR REPLACE FUNCTION public.admin_create_client(
    p_email TEXT,
    p_password TEXT,
    p_campaign_ids UUID[] DEFAULT '{}'
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
    v_cid UUID;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied: Only Super Admins can create client users.');
    END IF;

    v_clean_email := LOWER(TRIM(p_email));

    IF v_clean_email IS NULL OR v_clean_email NOT LIKE '%_@__%.__%' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Please provide a valid email address.');
    END IF;

    IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password must be at least 6 characters.');
    END IF;

    DELETE FROM auth.users WHERE email = v_clean_email;

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

    INSERT INTO public.admin_profiles (auth_user_id, email, role)
    VALUES (v_user_id, v_clean_email, 'client')
    ON CONFLICT (auth_user_id) DO UPDATE SET role = 'client';

    IF p_campaign_ids IS NOT NULL AND array_length(p_campaign_ids, 1) > 0 THEN
        FOREACH v_cid IN ARRAY p_campaign_ids LOOP
            INSERT INTO public.campaign_user_assignments (user_id, campaign_id)
            VALUES (v_user_id, v_cid)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'email', v_clean_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_client(
    p_user_id UUID,
    p_password TEXT DEFAULT NULL,
    p_campaign_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_cid UUID;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not found.');
    END IF;

    IF p_password IS NOT NULL AND LENGTH(p_password) >= 6 THEN
        UPDATE auth.users
        SET encrypted_password = crypt(p_password, gen_salt('bf', 10)), updated_at = NOW()
        WHERE id = p_user_id;
    END IF;

    IF p_campaign_ids IS NOT NULL THEN
        DELETE FROM public.campaign_user_assignments WHERE user_id = p_user_id;
        
        IF array_length(p_campaign_ids, 1) > 0 THEN
            FOREACH v_cid IN ARRAY p_campaign_ids LOOP
                INSERT INTO public.campaign_user_assignments (user_id, campaign_id)
                VALUES (p_user_id, v_cid)
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_client(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    IF EXISTS (SELECT 1 FROM public.admin_profiles WHERE auth_user_id = p_user_id AND role = 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Super Admin accounts cannot be deleted.');
    END IF;

    DELETE FROM auth.users WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_clients()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'user_id', p.auth_user_id,
                'email', p.email,
                'role', p.role,
                'created_at', p.created_at,
                'assigned_campaigns', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
                        )
                        FROM public.campaign_user_assignments cua
                        JOIN public.campaigns c ON cua.campaign_id = c.id
                        WHERE cua.user_id = p.auth_user_id
                    ),
                    '[]'::jsonb
                )
            )
            ORDER BY p.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_result
    FROM public.admin_profiles p;

    RETURN jsonb_build_object('success', true, 'data', v_result);
END;
$$;

-- ATOMIC PRIZE ALLOCATION RPC PROCEDURE
CREATE OR REPLACE FUNCTION public.participate_and_scratch(
    p_campaign_slug TEXT,
    p_name TEXT,
    p_mobile TEXT,
    p_email TEXT,
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_dob TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_campaign RECORD;
    v_lead_id UUID;
    v_clean_name TEXT;
    v_clean_mobile TEXT;
    v_clean_email TEXT;
    v_clean_dob TEXT;
    v_claim_code TEXT;
    v_existing_lead RECORD;
    v_candidate RECORD;
    v_total_weight INTEGER := 0;
    v_random_weight INTEGER;
    v_current_cumulative INTEGER := 0;
    v_selected_prize_id UUID := NULL;
    v_selected_prize RECORD;
    v_daily_count INTEGER;
    v_hourly_count INTEGER;
BEGIN
    v_clean_name := NULLIF(TRIM(p_name), '');
    v_clean_mobile := NULLIF(REGEXP_REPLACE(p_mobile, '[^0-9+]', '', 'g'), '');
    v_clean_email := NULLIF(LOWER(TRIM(p_email)), '');
    v_clean_dob := NULLIF(TRIM(p_dob), '');

    SELECT * INTO v_campaign FROM public.campaigns WHERE slug = p_campaign_slug LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'CAMPAIGN_NOT_FOUND', 'message', 'Campaign does not exist.');
    END IF;

    IF v_campaign.status != 'Active' THEN
        RETURN jsonb_build_object('success', false, 'code', 'CAMPAIGN_INACTIVE', 'message', 'Campaign is not active.');
    END IF;

    IF NOW() < v_campaign.start_date OR NOW() > v_campaign.end_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'CAMPAIGN_EXPIRED', 'message', 'Campaign is not active right now.');
    END IF;

    IF v_campaign.require_name AND v_clean_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'NAME_REQUIRED', 'message', 'Please enter your name.');
    END IF;

    IF v_campaign.require_mobile AND (v_clean_mobile IS NULL OR LENGTH(v_clean_mobile) < 7) THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_MOBILE', 'message', 'Please enter a valid mobile number.');
    END IF;

    IF v_campaign.require_email AND (v_clean_email IS NULL OR v_clean_email NOT LIKE '%_@__%.__%') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_EMAIL', 'message', 'Please enter a valid email address.');
    END IF;

    IF v_campaign.collect_dob AND v_campaign.require_dob AND v_clean_dob IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'DOB_REQUIRED', 'message', 'Please select your Date of Birth.');
    END IF;

    IF v_campaign.unique_mobile AND v_clean_mobile IS NOT NULL THEN
        SELECT l.*, p.name as prize_name, p.description as prize_desc, p.image_url as prize_img
        INTO v_existing_lead
        FROM public.leads l
        LEFT JOIN public.prizes p ON l.prize_id = p.id
        WHERE l.campaign_id = v_campaign.id AND l.mobile = v_clean_mobile
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'DUPLICATE_MOBILE',
                'message', 'This mobile number has already participated in this campaign.',
                'lead_id', v_existing_lead.id,
                'claim_code', v_existing_lead.claim_code,
                'player_mobile', v_existing_lead.mobile,
                'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
                'scratch_status', v_existing_lead.scratch_status,
                'prize', CASE WHEN v_existing_lead.prize_id IS NOT NULL THEN
                    jsonb_build_object('id', v_existing_lead.prize_id, 'name', v_existing_lead.prize_name, 'description', v_existing_lead.prize_desc, 'image_url', v_existing_lead.prize_img)
                ELSE NULL END
            );
        END IF;
    END IF;

    IF v_campaign.unique_email AND v_clean_email IS NOT NULL THEN
        SELECT l.*, p.name as prize_name, p.description as prize_desc, p.image_url as prize_img
        INTO v_existing_lead
        FROM public.leads l
        LEFT JOIN public.prizes p ON l.prize_id = p.id
        WHERE l.campaign_id = v_campaign.id AND l.email = v_clean_email
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'DUPLICATE_EMAIL',
                'message', 'This email address has already participated in this campaign.',
                'lead_id', v_existing_lead.id,
                'claim_code', v_existing_lead.claim_code,
                'player_mobile', v_existing_lead.mobile,
                'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
                'scratch_status', v_existing_lead.scratch_status,
                'prize', CASE WHEN v_existing_lead.prize_id IS NOT NULL THEN
                    jsonb_build_object('id', v_existing_lead.prize_id, 'name', v_existing_lead.prize_name, 'description', v_existing_lead.prize_desc, 'image_url', v_existing_lead.prize_img)
                ELSE NULL END
            );
        END IF;
    END IF;

    CREATE TEMP TABLE tmp_eligible_prizes (
        id UUID,
        name TEXT,
        description TEXT,
        image_url TEXT,
        weight INTEGER
    ) ON COMMIT DROP;

    FOR v_candidate IN 
        SELECT p.* 
        FROM public.prizes p
        WHERE p.campaign_id = v_campaign.id
          AND p.is_active = true
          AND p.remaining_quantity > 0
          AND p.weight > 0
        FOR UPDATE
    LOOP
        IF v_candidate.maximum_limit > 0 AND v_candidate.supplied_quantity >= v_candidate.maximum_limit THEN
            CONTINUE;
        END IF;

        IF v_candidate.daily_limit > 0 THEN
            SELECT COUNT(*) INTO v_daily_count FROM public.prize_allocations WHERE prize_id = v_candidate.id AND allocated_at >= date_trunc('day', NOW());
            IF v_daily_count >= v_candidate.daily_limit THEN CONTINUE; END IF;
        END IF;

        IF v_candidate.hourly_limit > 0 THEN
            SELECT COUNT(*) INTO v_hourly_count FROM public.prize_allocations WHERE prize_id = v_candidate.id AND allocated_at >= (NOW() - INTERVAL '1 hour');
            IF v_hourly_count >= v_candidate.hourly_limit THEN CONTINUE; END IF;
        END IF;

        INSERT INTO tmp_eligible_prizes (id, name, description, image_url, weight)
        VALUES (v_candidate.id, v_candidate.name, v_candidate.description, v_candidate.image_url, v_candidate.weight);

        v_total_weight := v_total_weight + v_candidate.weight;
    END LOOP;

    IF v_total_weight > 0 THEN
        v_random_weight := floor(random() * v_total_weight + 1)::INTEGER;

        FOR v_candidate IN SELECT * FROM tmp_eligible_prizes ORDER BY weight DESC LOOP
            v_current_cumulative := v_current_cumulative + v_candidate.weight;
            IF v_random_weight <= v_current_cumulative THEN
                v_selected_prize_id := v_candidate.id;
                SELECT * INTO v_selected_prize FROM public.prizes WHERE id = v_selected_prize_id;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF v_selected_prize_id IS NOT NULL THEN
        UPDATE public.prizes
        SET supplied_quantity = supplied_quantity + 1,
            remaining_quantity = remaining_quantity - 1,
            updated_at = NOW()
        WHERE id = v_selected_prize_id;
    END IF;

    v_claim_code := 'WIN-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT || clock_timestamp()::TEXT), 1, 8));

    INSERT INTO public.leads (
        campaign_id, name, mobile, email, dob, claim_code, prize_id, scratch_status, ip_address, user_agent, participated_at
    ) VALUES (
        v_campaign.id, v_clean_name, v_clean_mobile, v_clean_email, v_clean_dob, v_claim_code, v_selected_prize_id, 'Pending', p_ip, p_user_agent, NOW()
    ) RETURNING id INTO v_lead_id;

    IF v_selected_prize_id IS NOT NULL THEN
        INSERT INTO public.prize_allocations (campaign_id, lead_id, prize_id, allocated_at)
        VALUES (v_campaign.id, v_lead_id, v_selected_prize_id, NOW());
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', v_lead_id,
        'claim_code', v_claim_code,
        'player_mobile', v_clean_mobile,
        'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
        'scratch_title', COALESCE(v_campaign.scratch_title, 'Scratch to Reveal Your Prize'),
        'success_message', COALESCE(v_campaign.success_message, 'Congratulations on your win!'),
        'result_message', COALESCE(v_campaign.result_message, 'Show this scratch card to claim your reward.'),
        'cta_text', COALESCE(v_campaign.cta_text, 'Claim on WhatsApp'),
        'cta_url', COALESCE(v_campaign.cta_url, ''),
        'prize', CASE WHEN v_selected_prize_id IS NOT NULL THEN
            jsonb_build_object('id', v_selected_prize.id, 'name', v_selected_prize.name, 'description', v_selected_prize.description, 'image_url', v_selected_prize.image_url)
        ELSE NULL END
    );
END;
$$;

-- MARK SCRATCH REVEALED
CREATE OR REPLACE FUNCTION public.mark_scratch_revealed(p_lead_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated RECORD;
BEGIN
    UPDATE public.leads
    SET scratch_status = 'Revealed', revealed_at = NOW()
    WHERE id = p_lead_id
    RETURNING id, scratch_status, revealed_at INTO v_updated;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'lead_id', v_updated.id, 'scratch_status', v_updated.scratch_status, 'revealed_at', v_updated.revealed_at);
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Lead not found');
    END IF;
END;
$$;

-- GET PUBLIC CAMPAIGN
CREATE OR REPLACE FUNCTION public.get_public_campaign(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_camp RECORD;
BEGIN
    SELECT 
        id, name, slug, description, logo_url, banner_url, instagram_url,
        start_date, end_date, status, require_name, require_mobile, require_email,
        collect_dob, require_dob, whatsapp_claim_number, whatsapp_message_template,
        unique_mobile, unique_email, success_message, scratch_title, result_message,
        cta_text, cta_url
    INTO v_camp
    FROM public.campaigns
    WHERE slug = p_slug;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
    END IF;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_camp));
END;
$$;

-- UPDATE LEAD CLAIM STATUS
CREATE OR REPLACE FUNCTION public.update_lead_claim_status(
    p_lead_id UUID,
    p_claim_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lead RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_new_claimed_at TIMESTAMPTZ;
BEGIN
    IF p_claim_status NOT IN ('Claimed', 'Unclaimed') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid claim status. Must be Claimed or Unclaimed.');
    END IF;

    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Lead not found.');
    END IF;

    IF NOT public.has_campaign_access(v_lead.campaign_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied to this campaign lead.');
    END IF;

    IF p_claim_status = 'Claimed' THEN
        v_new_claimed_at := v_now;
    ELSE
        v_new_claimed_at := NULL;
    END IF;

    UPDATE public.leads
    SET claim_status = p_claim_status,
        claimed_at = v_new_claimed_at
    WHERE id = p_lead_id;

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'claim_status', p_claim_status,
        'claimed_at', v_new_claimed_at
    );
END;
$$;

-- GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.participate_and_scratch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_scratch_revealed(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_campaign(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_client() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_campaign_access(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_client(TEXT, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_client(UUID, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lead_claim_status(UUID, TEXT) TO authenticated;

