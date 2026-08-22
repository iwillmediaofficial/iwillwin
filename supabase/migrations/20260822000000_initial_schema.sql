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
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_prize_allocations_hourly ON public.prize_allocations(prize_id, allocated_at);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE auth_user_id = auth.uid()
          AND role IN ('admin', 'super_admin')
    );
$$;

DROP POLICY IF EXISTS "Public can view active campaigns" ON public.campaigns;
CREATE POLICY "Public can view active campaigns" ON public.campaigns FOR SELECT TO public USING (status = 'Active');

DROP POLICY IF EXISTS "Admins have full access to campaigns" ON public.campaigns;
CREATE POLICY "Admins have full access to campaigns" ON public.campaigns FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to prizes" ON public.prizes;
CREATE POLICY "Admins have full access to prizes" ON public.prizes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to leads" ON public.leads;
CREATE POLICY "Admins have full access to leads" ON public.leads FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to allocations" ON public.prize_allocations;
CREATE POLICY "Admins have full access to allocations" ON public.prize_allocations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own admin profile" ON public.admin_profiles;
CREATE POLICY "Users can view own admin profile" ON public.admin_profiles FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

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
        collect_dob, require_dob, whatsapp_claim_number,
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

-- GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.participate_and_scratch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_scratch_revealed(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_campaign(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
