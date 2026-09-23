-- Migration: 20260923000000_campaign_expiration_and_branding.sql
-- Description: Automatically expire past-due campaigns, join customer brand logos, and guard participation.

-- 1. Helper function to auto-expire past-due campaigns
CREATE OR REPLACE FUNCTION public.check_and_expire_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.campaigns
    SET status = 'Completed', updated_at = NOW()
    WHERE status = 'Active' AND end_date < NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_expire_campaigns() TO anon, authenticated;

-- Run it immediately once
SELECT public.check_and_expire_campaigns();

-- 2. Enhanced get_public_campaign with customer branding and expiration status
CREATE OR REPLACE FUNCTION public.get_public_campaign(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_camp RECORD;
BEGIN
    -- Auto-expire any campaigns past their end date
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

    RETURN jsonb_build_object('success', true, 'data', row_to_json(v_camp));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_campaign(TEXT) TO anon, authenticated;

-- 3. Update participate_and_scratch to strictly guard expiration before queue / duplicates
CREATE OR REPLACE FUNCTION public.participate_and_scratch(
    p_campaign_slug TEXT,
    p_name TEXT,
    p_mobile TEXT,
    p_email TEXT,
    p_ip TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_dob TEXT DEFAULT NULL,
    p_turnstile_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_campaign RECORD;
    v_lead_id UUID;
    v_clean_name TEXT;
    v_clean_mobile TEXT;
    v_clean_email TEXT;
    v_clean_dob TEXT;
    v_claim_code TEXT;
    v_existing RECORD;
    v_candidate RECORD;
    v_total_weight INTEGER := 0;
    v_random_weight INTEGER;
    v_current_cumulative INTEGER := 0;
    v_selected_prize_id UUID := NULL;
    v_selected_prize RECORD;
    v_daily_count INTEGER;
    v_hourly_count INTEGER;
    v_verify_res JSONB;
    v_extracted_ip TEXT;
BEGIN
    -- 1. Turnstile Bot Verification
    IF p_turnstile_token IS NULL OR TRIM(p_turnstile_token) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CAPTCHA_REQUIRED',
            'message', 'Security verification required. Please complete the security check.'
        );
    END IF;

    BEGIN
        SELECT (http_post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            'secret=0x4AAAAAAErAa000BM_pz8SUX-PTPt4ynHM&response=' || urlencode(p_turnstile_token),
            'application/x-www-form-urlencoded'
        )).content::jsonb INTO v_verify_res;

        IF NOT COALESCE((v_verify_res->>'success')::boolean, false) THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CAPTCHA_FAILED',
                'message', 'Security verification failed. Please refresh and try again.'
            );
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CAPTCHA_ERROR',
            'message', 'Security verification service temporarily unavailable. Please try again.'
        );
    END;

    -- 2. Input normalization
    v_clean_name := NULLIF(TRIM(p_name), '');
    v_clean_mobile := NULLIF(REGEXP_REPLACE(p_mobile, '[^0-9+]', '', 'g'), '');
    v_clean_email := NULLIF(LOWER(TRIM(p_email)), '');
    v_clean_dob := NULLIF(TRIM(p_dob), '');

    -- Extract real client IP
    BEGIN
        v_extracted_ip := COALESCE(
            NULLIF(TRIM(p_ip), ''),
            current_setting('request.headers', true)::json->>'cf-connecting-ip',
            current_setting('request.headers', true)::json->>'x-real-ip',
            current_setting('request.headers', true)::json->>'x-forwarded-for'
        );
    EXCEPTION WHEN OTHERS THEN
        v_extracted_ip := p_ip;
    END;

    SELECT * INTO v_campaign FROM public.campaigns WHERE slug = p_campaign_slug LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'CAMPAIGN_NOT_FOUND', 'message', 'Campaign does not exist.');
    END IF;

    -- Strict Expiration Guard
    IF NOW() > v_campaign.end_date OR v_campaign.status = 'Completed' THEN
        IF v_campaign.status = 'Active' THEN
            UPDATE public.campaigns SET status = 'Completed', updated_at = NOW() WHERE id = v_campaign.id;
        END IF;
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CAMPAIGN_EXPIRED',
            'message', 'This promotional campaign has ended and is no longer accepting new entries.'
        );
    END IF;

    IF v_campaign.status != 'Active' THEN
        RETURN jsonb_build_object('success', false, 'code', 'CAMPAIGN_INACTIVE', 'message', 'Campaign is not active.');
    END IF;

    IF NOW() < v_campaign.start_date THEN
        RETURN jsonb_build_object('success', false, 'code', 'CAMPAIGN_UPCOMING', 'message', 'This campaign has not started yet.');
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

    -- 3. Duplicate checks: If user already participated, return their allocated winning gift & claim code
    IF v_campaign.unique_mobile AND v_clean_mobile IS NOT NULL THEN
        SELECT l.id, l.name, l.mobile, l.claim_code, l.scratch_status,
               p.id as prize_id, p.name as prize_name, p.description as prize_desc, p.image_url as prize_img
        INTO v_existing
        FROM public.leads l
        LEFT JOIN public.prizes p ON l.prize_id = p.id
        WHERE l.campaign_id = v_campaign.id AND l.mobile = v_clean_mobile
        ORDER BY l.participated_at DESC
        LIMIT 1;

        IF v_existing.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'DUPLICATE_MOBILE',
                'message', 'You have already participated in this campaign!',
                'lead_id', v_existing.id,
                'claim_code', v_existing.claim_code,
                'scratch_status', v_existing.scratch_status,
                'player_mobile', v_existing.mobile,
                'player_name', v_existing.name,
                'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
                'scratch_title', COALESCE(v_campaign.scratch_title, 'Scratch to Reveal Your Prize'),
                'success_message', COALESCE(v_campaign.success_message, 'Congratulations on your win!'),
                'result_message', COALESCE(v_campaign.result_message, 'Show this scratch card to claim your reward.'),
                'cta_text', COALESCE(v_campaign.cta_text, 'Claim on WhatsApp'),
                'cta_url', COALESCE(v_campaign.cta_url, ''),
                'prize', CASE WHEN v_existing.prize_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', v_existing.prize_id,
                        'name', v_existing.prize_name,
                        'description', v_existing.prize_desc,
                        'image_url', v_existing.prize_img
                    )
                ELSE jsonb_build_object(
                    'id', 'none',
                    'name', 'Exclusive Reward',
                    'description', 'Show your verification code to claim your reward.',
                    'image_url', NULL
                ) END
            );
        END IF;
    END IF;

    IF v_campaign.unique_email AND v_clean_email IS NOT NULL THEN
        SELECT l.id, l.name, l.mobile, l.claim_code, l.scratch_status,
               p.id as prize_id, p.name as prize_name, p.description as prize_desc, p.image_url as prize_img
        INTO v_existing
        FROM public.leads l
        LEFT JOIN public.prizes p ON l.prize_id = p.id
        WHERE l.campaign_id = v_campaign.id AND l.email = v_clean_email
        ORDER BY l.participated_at DESC
        LIMIT 1;

        IF v_existing.id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'DUPLICATE_EMAIL',
                'message', 'You have already participated in this campaign!',
                'lead_id', v_existing.id,
                'claim_code', v_existing.claim_code,
                'scratch_status', v_existing.scratch_status,
                'player_mobile', v_existing.mobile,
                'player_name', v_existing.name,
                'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
                'scratch_title', COALESCE(v_campaign.scratch_title, 'Scratch to Reveal Your Prize'),
                'success_message', COALESCE(v_campaign.success_message, 'Congratulations on your win!'),
                'result_message', COALESCE(v_campaign.result_message, 'Show this scratch card to claim your reward.'),
                'cta_text', COALESCE(v_campaign.cta_text, 'Claim on WhatsApp'),
                'cta_url', COALESCE(v_campaign.cta_url, ''),
                'prize', CASE WHEN v_existing.prize_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', v_existing.prize_id,
                        'name', v_existing.prize_name,
                        'description', v_existing.prize_desc,
                        'image_url', v_existing.prize_img
                    )
                ELSE jsonb_build_object(
                    'id', 'none',
                    'name', 'Exclusive Reward',
                    'description', 'Show your verification code to claim your reward.',
                    'image_url', NULL
                ) END
            );
        END IF;
    END IF;

    -- 4. Ensure the prize queue has at least 20 slots
    PERFORM public.ensure_prize_queue(v_campaign.id, 20);

    -- 5. Pull the next queued prize that satisfies limits
    FOR v_candidate IN
        SELECT q.id as queue_id, q.slot_number, p.id as prize_id, p.name, p.description, p.image_url,
               p.maximum_limit, p.daily_limit, p.hourly_limit, p.supplied_quantity, p.remaining_quantity
        FROM public.campaign_prize_queue q
        JOIN public.prizes p ON q.prize_id = p.id
        WHERE q.campaign_id = v_campaign.id
          AND q.status = 'queued'
          AND p.is_active = true
          AND p.remaining_quantity > 0
        ORDER BY q.slot_number ASC
        FOR UPDATE OF q, p
    LOOP
        -- Check maximum limit
        IF v_candidate.maximum_limit > 0 AND v_candidate.supplied_quantity >= v_candidate.maximum_limit THEN
            UPDATE public.campaign_prize_queue SET status = 'cancelled' WHERE id = v_candidate.queue_id;
            CONTINUE;
        END IF;

        -- Check daily limit
        IF v_candidate.daily_limit > 0 THEN
            SELECT COUNT(*) INTO v_daily_count 
            FROM public.prize_allocations 
            WHERE prize_id = v_candidate.prize_id AND allocated_at >= date_trunc('day', NOW());
            IF v_daily_count >= v_candidate.daily_limit THEN 
                CONTINUE; 
            END IF;
        END IF;

        -- Check hourly limit
        IF v_candidate.hourly_limit > 0 THEN
            SELECT COUNT(*) INTO v_hourly_count 
            FROM public.prize_allocations 
            WHERE prize_id = v_candidate.prize_id AND allocated_at >= (NOW() - INTERVAL '1 hour');
            IF v_hourly_count >= v_candidate.hourly_limit THEN 
                CONTINUE; 
            END IF;
        END IF;

        -- Found next prize!
        v_selected_prize_id := v_candidate.prize_id;
        v_selected_prize := v_candidate;
        EXIT;
    END LOOP;

    -- Update inventory
    IF v_selected_prize_id IS NOT NULL THEN
        UPDATE public.prizes
        SET supplied_quantity = supplied_quantity + 1,
            remaining_quantity = remaining_quantity - 1,
            updated_at = NOW()
        WHERE id = v_selected_prize_id;
    END IF;

    -- Generate unique winning verification code
    v_claim_code := 'WIN-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::TEXT || clock_timestamp()::TEXT), 1, 8));

    -- Insert participant lead with race-condition exception handling
    BEGIN
        INSERT INTO public.leads (
            campaign_id, name, mobile, email, dob, claim_code, prize_id, scratch_status, ip_address, user_agent, participated_at
        ) VALUES (
            v_campaign.id, v_clean_name, v_clean_mobile, v_clean_email, v_clean_dob, v_claim_code, v_selected_prize_id, 'Pending', v_extracted_ip, p_user_agent, NOW()
        ) RETURNING id INTO v_lead_id;
    EXCEPTION WHEN unique_violation THEN
        -- Rollback prize inventory decrement if race condition hit
        IF v_selected_prize_id IS NOT NULL THEN
            UPDATE public.prizes
            SET supplied_quantity = supplied_quantity - 1,
                remaining_quantity = remaining_quantity + 1
            WHERE id = v_selected_prize_id;
        END IF;

        SELECT l.id, l.name, l.mobile, l.claim_code, l.scratch_status,
               p.id as prize_id, p.name as prize_name, p.description as prize_desc, p.image_url as prize_img
        INTO v_existing
        FROM public.leads l
        LEFT JOIN public.prizes p ON l.prize_id = p.id
        WHERE l.campaign_id = v_campaign.id AND (
            (v_clean_mobile IS NOT NULL AND l.mobile = v_clean_mobile) OR
            (v_clean_email IS NOT NULL AND l.email = v_clean_email)
        )
        ORDER BY l.participated_at DESC
        LIMIT 1;

        RETURN jsonb_build_object(
            'success', false,
            'code', 'DUPLICATE_MOBILE',
            'message', 'You have already participated in this campaign!',
            'lead_id', v_existing.id,
            'claim_code', v_existing.claim_code,
            'scratch_status', v_existing.scratch_status,
            'player_mobile', v_existing.mobile,
            'player_name', v_existing.name,
            'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
            'scratch_title', COALESCE(v_campaign.scratch_title, 'Scratch to Reveal Your Prize'),
            'success_message', COALESCE(v_campaign.success_message, 'Congratulations on your win!'),
            'result_message', COALESCE(v_campaign.result_message, 'Show this scratch card to claim your reward.'),
            'cta_text', COALESCE(v_campaign.cta_text, 'Claim on WhatsApp'),
            'cta_url', COALESCE(v_campaign.cta_url, ''),
            'prize', CASE WHEN v_existing.prize_id IS NOT NULL THEN
                jsonb_build_object(
                    'id', v_existing.prize_id,
                    'name', v_existing.prize_name,
                    'description', v_existing.prize_desc,
                    'image_url', v_existing.prize_img
                )
            ELSE jsonb_build_object(
                'id', 'none',
                'name', 'Exclusive Reward',
                'description', 'Show your verification code to claim your reward.',
                'image_url', NULL
            ) END
        );
    END;

    -- Mark queue slot as allocated to this lead
    IF v_candidate.queue_id IS NOT NULL THEN
        UPDATE public.campaign_prize_queue
        SET status = 'allocated',
            lead_id = v_lead_id,
            allocated_at = NOW()
        WHERE id = v_candidate.queue_id;
    END IF;

    -- Record allocation
    IF v_selected_prize_id IS NOT NULL THEN
        INSERT INTO public.prize_allocations (campaign_id, lead_id, prize_id, allocated_at)
        VALUES (v_campaign.id, v_lead_id, v_selected_prize_id, NOW());
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', v_lead_id,
        'claim_code', v_claim_code,
        'player_mobile', v_clean_mobile,
        'player_name', v_clean_name,
        'whatsapp_claim_number', v_campaign.whatsapp_claim_number,
        'scratch_title', COALESCE(v_campaign.scratch_title, 'Scratch to Reveal Your Prize'),
        'success_message', COALESCE(v_campaign.success_message, 'Congratulations on your win!'),
        'result_message', COALESCE(v_campaign.result_message, 'Show this scratch card to claim your reward.'),
        'cta_text', COALESCE(v_campaign.cta_text, 'Claim on WhatsApp'),
        'cta_url', COALESCE(v_campaign.cta_url, ''),
        'prize', CASE WHEN v_selected_prize_id IS NOT NULL THEN
            jsonb_build_object('id', v_selected_prize.prize_id, 'name', v_selected_prize.name, 'description', v_selected_prize.description, 'image_url', v_selected_prize.image_url)
        ELSE NULL END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.participate_and_scratch(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 4. Update admin_get_customers with accurate active_campaigns_count
CREATE OR REPLACE FUNCTION public.admin_get_customers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT (public.is_super_admin() OR public.is_admin_or_client()) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied.');
    END IF;

    -- Auto expire campaigns
    PERFORM public.check_and_expire_campaigns();

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
            COUNT(DISTINCT CASE WHEN camp.status = 'Active' AND camp.end_date >= NOW() AND camp.start_date <= NOW() THEN camp.id END) as active_campaigns_count,
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

GRANT EXECUTE ON FUNCTION public.admin_get_customers() TO authenticated;

-- 5. Update admin_get_customer_detail with accurate active_campaigns and is_expired
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
    IF NOT (public.is_super_admin() OR public.has_customer_access(p_customer_id)) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Access denied to customer workspace.');
    END IF;

    -- Auto expire campaigns
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
        'stats', v_stats
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_customer_detail(UUID) TO authenticated;
