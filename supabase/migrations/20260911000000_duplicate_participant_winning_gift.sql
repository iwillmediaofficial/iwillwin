-- Migration: 20260911000000_duplicate_participant_winning_gift.sql
-- Description: Allow duplicate participants to retrieve their previously allocated winning gift, claim verification code, and already participated message.

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
