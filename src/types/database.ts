export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed';
export type ScratchStatus = 'Pending' | 'Revealed';
export type AdminRole = 'super_admin' | 'client' | 'admin';

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  instagram_url: string;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  require_name: boolean;
  require_mobile: boolean;
  require_email: boolean;
  collect_dob: boolean;
  require_dob: boolean;
  whatsapp_claim_number: string | null;
  whatsapp_message_template: string | null;
  unique_mobile: boolean;
  unique_email: boolean;
  success_message: string;
  scratch_title: string;
  result_message: string;
  cta_text: string;
  cta_url: string;
  created_at: string;
  updated_at: string;
}

export interface Prize {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  allocated_quantity: number;
  supplied_quantity: number;
  remaining_quantity: number;
  maximum_limit: number;
  daily_limit: number;
  hourly_limit: number;
  weight: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  campaign_id: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
  dob?: string | null;
  claim_code?: string | null;
  prize_id: string | null;
  scratch_status: ScratchStatus;
  ip_address: string | null;
  user_agent: string | null;
  participated_at: string;
  revealed_at: string | null;
  created_at: string;
  // Joined fields
  campaign?: {
    name: string;
    slug: string;
  };
  prize?: {
    name: string;
    description: string | null;
    image_url: string | null;
  };
}

export interface PrizeAllocation {
  id: string;
  campaign_id: string;
  lead_id: string;
  prize_id: string;
  allocated_at: string;
}

export interface CampaignUserAssignment {
  id: string;
  user_id: string;
  campaign_id: string;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  auth_user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

export interface ClientUserItem {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  assigned_campaigns: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export interface AllocatedPrizeData {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
}

export interface ParticipationResponse {
  success: boolean;
  lead_id?: string;
  claim_code?: string;
  player_mobile?: string;
  whatsapp_claim_number?: string | null;
  prize?: AllocatedPrizeData | null;
  scratch_title?: string;
  success_message?: string;
  result_message?: string;
  cta_text?: string;
  cta_url?: string;
  code?: string;
  message?: string;
  scratch_status?: ScratchStatus;
}
