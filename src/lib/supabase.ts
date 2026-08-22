import { createClient } from '@supabase/supabase-js';
import type { Campaign, ParticipationResponse } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rowuebmnqurugubichta.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvd3VlYm1ucXVydWd1YmljaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODA0NzMsImV4cCI6MjEwMjk1NjQ3M30.csQYvIG4R8IZ0BwOp3IKYuZ0_U3L0N9i5ISN6RiOmiY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Public Campaign Fetcher
 */
export async function getPublicCampaign(slug: string): Promise<Campaign | null> {
  try {
    const { data, error } = await supabase.rpc('get_public_campaign', { p_slug: slug });
    if (error) throw error;
    if (data && data.success && data.data) {
      return data.data as Campaign;
    }
    return null;
  } catch (err) {
    console.error('Error fetching public campaign:', err);
    return null;
  }
}

/**
 * Atomic Prize Allocation RPC
 */
export async function participateAndScratch(params: {
  campaignSlug: string;
  name: string;
  mobile: string;
  email: string;
}): Promise<ParticipationResponse> {
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
    const { data, error } = await supabase.rpc('participate_and_scratch', {
      p_campaign_slug: params.campaignSlug,
      p_name: params.name || null,
      p_mobile: params.mobile || null,
      p_email: params.email || null,
      p_ip: null,
      p_user_agent: userAgent,
    });

    if (error) {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        message: error.message || 'Unable to connect to the server. Please try again.',
      };
    }

    return data as ParticipationResponse;
  } catch (err: any) {
    return {
      success: false,
      code: 'UNEXPECTED_ERROR',
      message: err.message || 'An unexpected error occurred.',
    };
  }
}

/**
 * Mark Scratch Card as Revealed
 */
export async function markScratchRevealed(leadId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_scratch_revealed', {
      p_lead_id: leadId,
    });
    if (error) throw error;
    return !!data?.success;
  } catch (err) {
    console.error('Error marking scratch revealed:', err);
    return false;
  }
}

/**
 * Storage Asset Uploader
 */
export async function uploadCampaignAsset(file: File, folder = 'uploads'): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop();
    const cleanFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('campaign-assets')
      .upload(cleanFileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('campaign-assets')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Error uploading asset:', err);
    return null;
  }
}

/**
 * Admin Stats Fetcher
 */
export async function getAdminDashboardStats() {
  const [leadsCount, revealedCount, campaignsCount, prizes] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('scratch_status', 'Revealed'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('prizes').select('allocated_quantity, supplied_quantity, remaining_quantity'),
  ]);

  let totalAllocated = 0;
  let totalSupplied = 0;
  let totalRemaining = 0;

  if (prizes.data) {
    prizes.data.forEach((p) => {
      totalAllocated += p.allocated_quantity || 0;
      totalSupplied += p.supplied_quantity || 0;
      totalRemaining += p.remaining_quantity || 0;
    });
  }

  return {
    totalParticipants: leadsCount.count || 0,
    totalRevealed: revealedCount.count || 0,
    totalCampaigns: campaignsCount.count || 0,
    totalPrizesDistributed: totalSupplied,
    totalPrizesRemaining: totalRemaining,
    totalPrizesAllocated: totalAllocated,
  };
}
