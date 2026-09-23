-- Migration: 20260924000000_customer_plans_and_subscriptions.sql
-- Description: Master subscription plans catalog, customer subscriptions, strict campaign date alignment trigger, and management RPCs.

-- 1. Create Master Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL DEFAULT 30,
    price NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    max_campaigns INTEGER NOT NULL DEFAULT 1,
    max_leads INTEGER NOT NULL DEFAULT 1000,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Customer Subscriptions Table
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'suspended', 'cancelled')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    max_campaigns INTEGER NOT NULL DEFAULT 1,
    max_leads INTEGER NOT NULL DEFAULT 1000,
    price_paid NUMERIC DEFAULT 0,
    notes TEXT,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy active subscription lookup
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_lookup 
ON public.customer_subscriptions(customer_id, status, end_date DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans RLS
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active plans" 
ON public.subscription_plans FOR SELECT 
TO anon, authenticated 
USING (is_active = true OR public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can manage plans" ON public.subscription_plans;
CREATE POLICY "Super admin can manage plans" 
ON public.subscription_plans FOR ALL 
TO authenticated 
USING (public.is_super_admin()) 
WITH CHECK (public.is_super_admin());

-- Customer Subscriptions RLS
DROP POLICY IF EXISTS "Customer users can view own subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Customer users can view own subscriptions" 
ON public.customer_subscriptions FOR SELECT 
TO authenticated 
USING (public.is_super_admin() OR public.has_customer_access(customer_id));

DROP POLICY IF EXISTS "Super admin can manage subscriptions" ON public.customer_subscriptions;
CREATE POLICY "Super admin can manage subscriptions" 
ON public.customer_subscriptions FOR ALL 
TO authenticated 
USING (public.is_super_admin()) 
WITH CHECK (public.is_super_admin());

-- 4. Seed Standard Master Plans
INSERT INTO public.subscription_plans (id, name, slug, description, duration_days, price, currency, max_campaigns, max_leads, features, is_active, display_order)
VALUES 
    (
        '10000000-0000-0000-0000-000000000001',
        'Starter 30-Day Plan',
        'starter-30',
        'Perfect for single promotional events and trial campaigns.',
        30,
        1999,
        'INR',
        1,
        1000,
        '["1 Active Campaign", "Up to 1,000 Leads", "Custom Brand Logo & WhatsApp Claim", "Excel / CSV Data Export", "Basic Performance Analytics"]'::jsonb,
        true,
        1
    ),
    (
        '10000000-0000-0000-0000-000000000002',
        'Festive Growth 90-Day Plan',
        'festive-growth-90',
        'Best for seasonal festivals, multiple festive scratch games, and ongoing social growth.',
        90,
        4999,
        'INR',
        3,
        5000,
        '["Up to 3 Active Campaigns", "Up to 5,000 Leads", "Instagram Follow Gate Growth", "Priority WhatsApp Winner Redemption", "Full CSV Export with Claim Tracking", "Dedicated Customer Workspace"]'::jsonb,
        true,
        2
    ),
    (
        '10000000-0000-0000-0000-000000000003',
        'Annual Enterprise Plan',
        'annual-enterprise-365',
        'Year-round brand engagement, unlimited leads, and multi-campaign support.',
        365,
        14999,
        'INR',
        10,
        -1,
        '["Up to 10 Concurrent Campaigns", "Unlimited Leads & Winners", "Custom Domain & Branding", "Real-Time Multi-Admin Access", "Priority 24/7 Technical Support", "Custom Prize Algorithm & Shuffling"]'::jsonb,
        true,
        3
    )
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    duration_days = EXCLUDED.duration_days,
    price = EXCLUDED.price,
    max_campaigns = EXCLUDED.max_campaigns,
    max_leads = EXCLUDED.max_leads,
    features = EXCLUDED.features;

-- 5. Seed Subscriptions for Existing Customers so no existing campaign breaks
DO $$
DECLARE
    r_cust RECORD;
BEGIN
    FOR r_cust IN SELECT id FROM public.customers LOOP
        -- Check if customer already has a subscription
        IF NOT EXISTS (SELECT 1 FROM public.customer_subscriptions WHERE customer_id = r_cust.id) THEN
            INSERT INTO public.customer_subscriptions (
                customer_id,
                plan_id,
                status,
                start_date,
                end_date,
                max_campaigns,
                max_leads,
                price_paid,
                notes,
                activated_at
            ) VALUES (
                r_cust.id,
                '10000000-0000-0000-0000-000000000002', -- Festive Growth
                'active',
                NOW() - INTERVAL '10 days',
                NOW() + INTERVAL '90 days', -- Valid for 90 days from now
                3,
                5000,
                4999,
                'Initial system migration plan assignment',
                NOW()
            );
        END IF;
    END LOOP;
END;
$$;

-- 6. Trigger: Strict Campaign Date & Quota Alignment with Plan
CREATE OR REPLACE FUNCTION public.validate_campaign_plan_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sub RECORD;
    v_active_camps INTEGER;
BEGIN
    -- Query the customer's current active subscription
    SELECT * INTO v_sub
    FROM public.customer_subscriptions
    WHERE customer_id = NEW.customer_id
      AND status = 'active'
    ORDER BY end_date DESC
    LIMIT 1;

    -- If campaign is marked Active, a subscription MUST exist and be active
    IF NEW.status = 'Active' THEN
        IF v_sub.id IS NULL THEN
            RAISE EXCEPTION 'Customer does not have an active subscription plan. Please activate a plan before running campaigns.';
        END IF;

        IF v_sub.end_date < NOW() THEN
            RAISE EXCEPTION 'Customer subscription plan expired on %. Please renew the plan before launching campaigns.', 
                to_char(v_sub.end_date, 'YYYY-MM-DD HH24:MI');
        END IF;
    END IF;

    -- If a subscription exists, campaign end_date MUST NOT exceed subscription end_date:
    IF v_sub.id IS NOT NULL THEN
        IF NEW.end_date > v_sub.end_date THEN
            RAISE EXCEPTION 'Campaign end date (%) cannot exceed customer plan expiry date (%). Please select an earlier date or extend the plan.', 
                to_char(NEW.end_date, 'YYYY-MM-DD HH24:MI'), 
                to_char(v_sub.end_date, 'YYYY-MM-DD HH24:MI');
        END IF;

        -- Check campaign limit quota when status is Active
        IF NEW.status = 'Active' AND v_sub.max_campaigns > 0 THEN
            SELECT COUNT(*) INTO v_active_camps
            FROM public.campaigns
            WHERE customer_id = NEW.customer_id
              AND status = 'Active'
              AND end_date >= NOW()
              AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

            IF v_active_camps >= v_sub.max_campaigns THEN
                RAISE EXCEPTION 'Plan limit reached: Customer plan allows a maximum of % active campaign(s).', v_sub.max_campaigns;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_campaign_plan_dates ON public.campaigns;
CREATE TRIGGER trg_validate_campaign_plan_dates
BEFORE INSERT OR UPDATE OF start_date, end_date, customer_id, status
ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.validate_campaign_plan_dates();

-- 7. Update check_and_expire_campaigns to automatically expire stale subscriptions
CREATE OR REPLACE FUNCTION public.check_and_expire_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Auto-expire subscriptions past their end date
    UPDATE public.customer_subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND end_date < NOW();

    -- Auto-expire campaigns past their end date
    UPDATE public.campaigns
    SET status = 'Completed', updated_at = NOW()
    WHERE status = 'Active' AND end_date < NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_expire_campaigns() TO anon, authenticated;

-- 8. Enhanced get_public_campaign to also check customer plan validity
CREATE OR REPLACE FUNCTION public.get_public_campaign(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_camp RECORD;
    v_sub RECORD;
    v_plan_expired BOOLEAN := false;
BEGIN
    -- Auto-expire any campaigns or subscriptions past their end date
    PERFORM public.check_and_expire_campaigns();

    SELECT 
        c.id, c.customer_id, c.name, c.slug, c.description,
        COALESCE(NULLIF(TRIM(c.logo_url), ''), cust.logo_url) as logo_url,
        c.banner_url, c.instagram_url,
        c.start_date, c.end_date, c.status,
        c.require_name, c.require_mobile, c.require_email,
        c.collect_dob, c.require_dob,
        c.whatsapp_claim_number, c.whatsapp_message_template,
        c.unique_mobile, c.unique_email,
        c.success_message, c.scratch_title, c.result_message,
        c.cta_text, c.cta_url,
        cust.company_name as customer_name,
        cust.logo_url as customer_logo_url,
        (NOW() > c.end_date OR c.status = 'Completed') as is_expired,
        (NOW() < c.start_date) as is_upcoming
    INTO v_camp
    FROM public.campaigns c
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    WHERE c.slug = p_slug;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Campaign not found');
    END IF;

    -- Check customer plan validity
    SELECT * INTO v_sub
    FROM public.customer_subscriptions
    WHERE customer_id = v_camp.customer_id
      AND status = 'active'
      AND end_date >= NOW()
    ORDER BY end_date DESC
    LIMIT 1;

    IF v_sub.id IS NULL THEN
        v_plan_expired := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'data', row_to_json(v_camp)::jsonb || jsonb_build_object(
            'is_expired', (v_camp.is_expired OR v_plan_expired),
            'plan_expired', v_plan_expired
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campaign(TEXT) TO anon, authenticated;

-- 9. RPC: admin_get_plans
CREATE OR REPLACE FUNCTION public.admin_get_plans()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_plans JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'slug', p.slug,
                'description', p.description,
                'duration_days', p.duration_days,
                'price', p.price,
                'currency', p.currency,
                'max_campaigns', p.max_campaigns,
                'max_leads', p.max_leads,
                'features', p.features,
                'is_active', p.is_active,
                'display_order', p.display_order,
                'active_subscribers_count', COALESCE(subs.active_count, 0),
                'created_at', p.created_at,
                'updated_at', p.updated_at
            )
            ORDER BY p.display_order ASC, p.created_at ASC
        ),
        '[]'::jsonb
    ) INTO v_plans
    FROM public.subscription_plans p
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as active_count
        FROM public.customer_subscriptions cs
        WHERE cs.plan_id = p.id AND cs.status = 'active' AND cs.end_date >= NOW()
    ) subs ON true
    WHERE (p.is_active = true OR public.is_super_admin());

    RETURN jsonb_build_object('success', true, 'data', v_plans);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_plans() TO anon, authenticated;

-- 10. RPC: admin_create_plan
CREATE OR REPLACE FUNCTION public.admin_create_plan(
    p_name TEXT,
    p_slug TEXT,
    p_description TEXT,
    p_duration_days INTEGER,
    p_price NUMERIC,
    p_currency TEXT DEFAULT 'INR',
    p_max_campaigns INTEGER DEFAULT 1,
    p_max_leads INTEGER DEFAULT 1000,
    p_features JSONB DEFAULT '[]'::jsonb,
    p_is_active BOOLEAN DEFAULT true,
    p_display_order INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_new_plan RECORD;
    v_clean_slug TEXT;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Super Administrators can create plans.');
    END IF;

    v_clean_slug := LOWER(REGEXP_REPLACE(TRIM(p_slug), '[^a-z0-9-]+', '-', 'g'));

    INSERT INTO public.subscription_plans (
        name, slug, description, duration_days, price, currency, max_campaigns, max_leads, features, is_active, display_order
    ) VALUES (
        TRIM(p_name), v_clean_slug, TRIM(p_description), p_duration_days, p_price, COALESCE(p_currency, 'INR'), p_max_campaigns, p_max_leads, COALESCE(p_features, '[]'::jsonb), p_is_active, p_display_order
    ) RETURNING * INTO v_new_plan;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_new_plan));
EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'A plan with this slug or name already exists.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_plan(TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, INTEGER, INTEGER, JSONB, BOOLEAN, INTEGER) TO authenticated;

-- 11. RPC: admin_update_plan
CREATE OR REPLACE FUNCTION public.admin_update_plan(
    p_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_description TEXT,
    p_duration_days INTEGER,
    p_price NUMERIC,
    p_currency TEXT DEFAULT 'INR',
    p_max_campaigns INTEGER DEFAULT 1,
    p_max_leads INTEGER DEFAULT 1000,
    p_features JSONB DEFAULT '[]'::jsonb,
    p_is_active BOOLEAN DEFAULT true,
    p_display_order INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_updated_plan RECORD;
    v_clean_slug TEXT;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Super Administrators can update plans.');
    END IF;

    v_clean_slug := LOWER(REGEXP_REPLACE(TRIM(p_slug), '[^a-z0-9-]+', '-', 'g'));

    UPDATE public.subscription_plans
    SET name = TRIM(p_name),
        slug = v_clean_slug,
        description = TRIM(p_description),
        duration_days = p_duration_days,
        price = p_price,
        currency = COALESCE(p_currency, 'INR'),
        max_campaigns = p_max_campaigns,
        max_leads = p_max_leads,
        features = COALESCE(p_features, '[]'::jsonb),
        is_active = p_is_active,
        display_order = p_display_order,
        updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_updated_plan;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Plan not found.');
    END IF;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_updated_plan));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_plan(UUID, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT, INTEGER, INTEGER, JSONB, BOOLEAN, INTEGER) TO authenticated;

-- 12. RPC: admin_assign_customer_plan
CREATE OR REPLACE FUNCTION public.admin_assign_customer_plan(
    p_customer_id UUID,
    p_plan_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NOW(),
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_max_campaigns INTEGER DEFAULT NULL,
    p_price_paid NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_plan RECORD;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_max_camps INTEGER;
    v_price NUMERIC;
    v_sub RECORD;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Super Administrators can assign customer plans.');
    END IF;

    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Selected plan does not exist.');
    END IF;

    v_start := COALESCE(p_start_date, NOW());
    v_end := COALESCE(p_end_date, v_start + (v_plan.duration_days || ' days')::INTERVAL);
    v_max_camps := COALESCE(p_max_campaigns, v_plan.max_campaigns);
    v_price := COALESCE(p_price_paid, v_plan.price);

    -- Retire any existing active subscriptions for this customer
    UPDATE public.customer_subscriptions
    SET status = 'cancelled', updated_at = NOW()
    WHERE customer_id = p_customer_id AND status = 'active';

    -- Insert newly assigned active subscription
    INSERT INTO public.customer_subscriptions (
        customer_id, plan_id, status, start_date, end_date, max_campaigns, max_leads, price_paid, notes, assigned_by, activated_at
    ) VALUES (
        p_customer_id, p_plan_id, 'active', v_start, v_end, v_max_camps, v_plan.max_leads, v_price, TRIM(p_notes), auth.uid(), NOW()
    ) RETURNING * INTO v_sub;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_sub));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_assign_customer_plan(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, NUMERIC, TEXT) TO authenticated;

-- 13. RPC: admin_extend_customer_plan
CREATE OR REPLACE FUNCTION public.admin_extend_customer_plan(
    p_subscription_id UUID,
    p_days INTEGER DEFAULT 30,
    p_custom_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_sub RECORD;
    v_new_end TIMESTAMPTZ;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Super Administrators can extend plan validity.');
    END IF;

    SELECT * INTO v_sub FROM public.customer_subscriptions WHERE id = p_subscription_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Subscription record not found.');
    END IF;

    IF p_custom_end_date IS NOT NULL THEN
        v_new_end := p_custom_end_date;
    ELSE
        -- If current end_date is in the past, extend from NOW(), otherwise extend from current end_date
        IF v_sub.end_date < NOW() THEN
            v_new_end := NOW() + (p_days || ' days')::INTERVAL;
        ELSE
            v_new_end := v_sub.end_date + (p_days || ' days')::INTERVAL;
        END IF;
    END IF;

    UPDATE public.customer_subscriptions
    SET end_date = v_new_end,
        status = 'active',
        updated_at = NOW()
    WHERE id = p_subscription_id
    RETURNING * INTO v_sub;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_sub));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_extend_customer_plan(UUID, INTEGER, TIMESTAMPTZ) TO authenticated;

-- 14. RPC: admin_set_subscription_status
CREATE OR REPLACE FUNCTION public.admin_set_subscription_status(
    p_subscription_id UUID,
    p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_sub RECORD;
BEGIN
    IF NOT public.is_super_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only Super Administrators can change subscription status.');
    END IF;

    IF p_status NOT IN ('active', 'expired', 'pending', 'suspended', 'cancelled') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid status value.');
    END IF;

    UPDATE public.customer_subscriptions
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_subscription_id
    RETURNING * INTO v_sub;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Subscription record not found.');
    END IF;

    -- If suspended or cancelled, pause all active campaigns of this customer
    IF p_status IN ('suspended', 'cancelled') THEN
        UPDATE public.campaigns
        SET status = 'Paused', updated_at = NOW()
        WHERE customer_id = v_sub.customer_id AND status = 'Active';
    END IF;

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_sub));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_subscription_status(UUID, TEXT) TO authenticated;

-- 15. RPC: get_customer_active_subscription
CREATE OR REPLACE FUNCTION public.get_customer_active_subscription(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_sub RECORD;
    v_plan RECORD;
    v_active_camps INTEGER;
BEGIN
    IF NOT (public.is_super_admin() OR public.has_customer_access(p_customer_id)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    PERFORM public.check_and_expire_campaigns();

    SELECT cs.*, row_to_json(sp) as plan_data
    INTO v_sub
    FROM public.customer_subscriptions cs
    JOIN public.subscription_plans sp ON cs.plan_id = sp.id
    WHERE cs.customer_id = p_customer_id AND cs.status = 'active'
    ORDER BY cs.end_date DESC
    LIMIT 1;

    SELECT COUNT(*) INTO v_active_camps
    FROM public.campaigns
    WHERE customer_id = p_customer_id AND status = 'Active' AND end_date >= NOW();

    IF v_sub.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'has_active_plan', false,
            'active_campaigns_count', v_active_camps
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'has_active_plan', true,
        'subscription', row_to_json(v_sub),
        'active_campaigns_count', v_active_camps,
        'remaining_days', GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_sub.end_date - NOW())) / 86400)::INTEGER)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_active_subscription(UUID) TO authenticated;

-- 16. Update admin_get_customer_detail to return active subscription and history
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
    v_active_sub JSONB;
    v_sub_history JSONB;
BEGIN
    IF NOT (public.is_super_admin() OR public.has_customer_access(p_customer_id)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied to customer workspace.');
    END IF;

    -- Auto expire campaigns & subscriptions
    PERFORM public.check_and_expire_campaigns();

    -- Customer Core Record
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

    -- Customer Active Subscription
    SELECT jsonb_build_object(
        'id', cs.id,
        'customer_id', cs.customer_id,
        'plan_id', cs.plan_id,
        'status', cs.status,
        'start_date', cs.start_date,
        'end_date', cs.end_date,
        'max_campaigns', cs.max_campaigns,
        'max_leads', cs.max_leads,
        'price_paid', cs.price_paid,
        'notes', cs.notes,
        'assigned_by', cs.assigned_by,
        'activated_at', cs.activated_at,
        'created_at', cs.created_at,
        'updated_at', cs.updated_at,
        'plan_name', sp.name,
        'plan_slug', sp.slug,
        'features', sp.features,
        'remaining_days', GREATEST(0, ROUND(EXTRACT(EPOCH FROM (cs.end_date - NOW())) / 86400)::INTEGER)
    ) INTO v_active_sub
    FROM public.customer_subscriptions cs
    JOIN public.subscription_plans sp ON cs.plan_id = sp.id
    WHERE cs.customer_id = p_customer_id AND cs.status = 'active'
    ORDER BY cs.end_date DESC
    LIMIT 1;

    -- Customer Subscription History
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cs.id,
                'plan_id', cs.plan_id,
                'plan_name', sp.name,
                'status', cs.status,
                'start_date', cs.start_date,
                'end_date', cs.end_date,
                'max_campaigns', cs.max_campaigns,
                'price_paid', cs.price_paid,
                'notes', cs.notes,
                'created_at', cs.created_at
            )
            ORDER BY cs.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_sub_history
    FROM public.customer_subscriptions cs
    JOIN public.subscription_plans sp ON cs.plan_id = sp.id
    WHERE cs.customer_id = p_customer_id;

    -- Customer Campaigns with counts and is_expired metadata
    SELECT COALESCE(
        jsonb_agg(
            to_jsonb(camp) || jsonb_build_object(
                'is_expired', (NOW() > camp.end_date OR camp.status = 'Completed'),
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
        'active_campaigns', COUNT(DISTINCT CASE WHEN camp.status = 'Active' AND camp.end_date >= NOW() AND camp.start_date <= NOW() THEN camp.id END),
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
        'stats', v_stats,
        'active_subscription', v_active_sub,
        'subscription_history', v_sub_history
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_customer_detail(UUID) TO authenticated;
