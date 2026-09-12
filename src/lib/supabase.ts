import { createClient } from '@supabase/supabase-js';
import type {
  Campaign,
  ParticipationResponse,
  ClientUserItem,
  CustomerWithStats,
  CustomerDetailData,
} from '@/types/database';

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
  dob?: string;
  turnstileToken?: string;
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
      p_dob: params.dob || null,
      p_turnstile_token: params.turnstileToken || null,
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
 * Customer Architecture RPC Helpers
 */
export async function adminGetCustomers(): Promise<{
  success: boolean;
  data?: CustomerWithStats[];
  message?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_get_customers');
    if (error) throw error;
    return data as { success: boolean; data?: CustomerWithStats[]; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to fetch customers' };
  }
}

export async function adminGetCustomerDetail(customerId: string): Promise<{
  success: boolean;
  customer?: CustomerDetailData['customer'];
  campaigns?: CustomerDetailData['campaigns'];
  users?: CustomerDetailData['users'];
  stats?: CustomerDetailData['stats'];
  message?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('admin_get_customer_detail', {
      p_customer_id: customerId,
    });
    if (error) throw error;
    return data as any;
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to fetch customer detail' };
  }
}

export async function adminCreateCustomer(params: {
  company_name: string;
  contact_person: string;
  email: string;
  phone?: string | null;
  logo_url?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string;
}): Promise<{ success: boolean; id?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_create_customer', {
      p_company_name: params.company_name,
      p_contact_person: params.contact_person,
      p_email: params.email,
      p_phone: params.phone || null,
      p_logo_url: params.logo_url || null,
      p_address: params.address || null,
      p_notes: params.notes || null,
      p_status: params.status || 'Active',
    });
    if (error) throw error;
    return data as { success: boolean; id?: string; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to create customer' };
  }
}

export async function adminUpdateCustomer(
  customerId: string,
  params: {
    company_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string | null;
    logo_url?: string | null;
    address?: string | null;
    notes?: string | null;
    status?: string;
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_update_customer', {
      p_customer_id: customerId,
      p_company_name: params.company_name || null,
      p_contact_person: params.contact_person || null,
      p_email: params.email || null,
      p_phone: params.phone !== undefined ? params.phone : null,
      p_logo_url:
        params.logo_url === null || params.logo_url === ''
          ? '__REMOVE__'
          : params.logo_url !== undefined
          ? params.logo_url
          : null,
      p_address: params.address !== undefined ? params.address : null,
      p_notes: params.notes !== undefined ? params.notes : null,
      p_status: params.status || null,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update customer' };
  }
}

export async function adminDeleteCustomer(
  customerId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_customer', {
      p_customer_id: customerId,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete customer' };
  }
}

export async function adminCreateCustomerUser(
  customerId: string,
  email: string,
  password: string,
  role: 'customer_admin' | 'customer_viewer' = 'customer_admin'
): Promise<{ success: boolean; user_id?: string; email?: string; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_create_customer_user', {
      p_customer_id: customerId,
      p_email: email,
      p_password: password,
      p_role: role,
    });
    if (error) throw error;
    return data as { success: boolean; user_id?: string; email?: string; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to create customer user' };
  }
}

export async function adminDeleteCustomerUser(
  userId: string,
  customerId?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_customer_user', {
      p_user_id: userId,
      p_customer_id: customerId || null,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete customer user' };
  }
}

/**
 * Super Admin Client Management Helpers
 */
export async function adminGetClients(): Promise<{ success: boolean; data?: ClientUserItem[]; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_get_clients');
    if (error) throw error;
    return data as { success: boolean; data?: ClientUserItem[]; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to fetch client accounts' };
  }
}

export async function adminCreateClient(
  email: string,
  password: string,
  campaignIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_create_client', {
      p_email: email,
      p_password: password,
      p_campaign_ids: campaignIds,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to create client user' };
  }
}

export async function adminUpdateClient(
  userId: string,
  password?: string | null,
  campaignIds?: string[] | null
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_update_client', {
      p_user_id: userId,
      p_password: password || null,
      p_campaign_ids: campaignIds || null,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update client user' };
  }
}

export async function adminDeleteClient(userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_delete_client', {
      p_user_id: userId,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to delete client user' };
  }
}

export async function adminSetCampaignClients(
  campaignId: string,
  clientUserIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_set_campaign_clients', {
      p_campaign_id: campaignId,
      p_client_user_ids: clientUserIds,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to assign clients to campaign' };
  }
}

export async function updateLeadClaimStatus(
  leadId: string,
  claimStatus: 'Claimed' | 'Unclaimed'
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('update_lead_claim_status', {
      p_lead_id: leadId,
      p_claim_status: claimStatus,
    });
    if (error) throw error;
    return data as { success: boolean; data?: any; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to update claim status' };
  }
}

export interface UpcomingPrizeItem {
  queue_id: string;
  slot_number: number;
  display_index: number;
  prize_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  weight: number;
  display_order: number;
  allocated_quantity: number;
  supplied_quantity: number;
  remaining_quantity: number;
  daily_limit: number;
  hourly_limit: number;
}

export async function getUpcomingPrizes(
  campaignId: string,
  limit: number = 10
): Promise<UpcomingPrizeItem[]> {
  if (!campaignId) return [];
  try {
    const { data, error } = await supabase.rpc('get_upcoming_prizes', {
      p_campaign_id: campaignId,
      p_limit: limit,
    });
    if (error) throw error;
    return (data as UpcomingPrizeItem[]) || [];
  } catch (err: any) {
    console.error('Error fetching upcoming prizes:', err);
    return [];
  }
}

export async function reshufflePrizeQueue(
  campaignId: string
): Promise<{ success: boolean; message?: string }> {
  if (!campaignId) return { success: false, message: 'No campaign specified' };
  try {
    const { data, error } = await supabase.rpc('reshuffle_prize_queue', {
      p_campaign_id: campaignId,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to reshuffle prize queue' };
  }
}

export async function setNextPrize(
  campaignId: string,
  prizeId: string
): Promise<{ success: boolean; message?: string; prize_id?: string; prize_name?: string }> {
  if (!campaignId || !prizeId) return { success: false, message: 'Missing campaign or prize ID' };
  try {
    const { data, error } = await supabase.rpc('set_next_prize', {
      p_campaign_id: campaignId,
      p_prize_id: prizeId,
    });
    if (error) throw error;
    return data as { success: boolean; message?: string; prize_id?: string; prize_name?: string };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to set next prize' };
  }
}

/**
 * Admin Dashboard Stats Fetcher
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

/**
 * Sanitizes campaign payload before inserting or updating in Supabase.
 * Strips computed/synthetic/relational fields (such as remaining_prizes, total_leads,
 * total_winners, customer object, id, created_at, updated_at).
 */
export function sanitizeCampaignPayload<T extends Record<string, any>>(data: T): Partial<Campaign> {
  const allowedColumns = [
    'customer_id',
    'name',
    'slug',
    'description',
    'logo_url',
    'banner_url',
    'instagram_url',
    'start_date',
    'end_date',
    'status',
    'require_name',
    'require_mobile',
    'require_email',
    'collect_dob',
    'require_dob',
    'whatsapp_claim_number',
    'whatsapp_message_template',
    'unique_mobile',
    'unique_email',
    'success_message',
    'scratch_title',
    'result_message',
    'cta_text',
    'cta_url',
  ];

  const sanitized: Record<string, any> = {};
  for (const col of allowedColumns) {
    if (col in data && data[col] !== undefined) {
      sanitized[col] = data[col];
    }
  }
  return sanitized as Partial<Campaign>;
}

