export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed';
export type ScratchStatus = 'Pending' | 'Revealed';
export type ClaimStatus = 'Unclaimed' | 'Claimed';
export type AdminRole = 'super_admin' | 'client' | 'admin' | 'customer_admin' | 'customer_viewer';

export interface Customer {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  logo_url: string | null;
  address: string | null;
  status: 'Active' | 'Inactive';
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CustomerWithStats extends Customer {
  campaigns_count: number;
  active_campaigns_count: number;
  total_leads: number;
  total_winners: number;
}

export interface CustomerUser {
  id: string;
  customer_id: string;
  auth_user_id: string;
  email: string;
  role: 'customer_admin' | 'customer_viewer';
  status: 'active' | 'inactive';
  created_at: string;
}

export type SubscriptionStatus = 'active' | 'expired' | 'pending' | 'suspended' | 'cancelled';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_days: number;
  price: number;
  currency: string;
  max_campaigns: number;
  max_leads: number;
  features: string[];
  is_active: boolean;
  display_order: number;
  active_subscribers_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerSubscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  max_campaigns: number;
  max_leads: number;
  price_paid: number;
  price?: number;
  notes: string | null;
  assigned_by?: string | null;
  activated_at?: string | null;
  created_at: string;
  updated_at?: string;
  plan_name?: string;
  plan_slug?: string;
  features?: string[];
  remaining_days?: number;
  plan_data?: SubscriptionPlan;
  plan?: SubscriptionPlan;
}

export interface CustomerDetailData {
  customer: Customer;
  campaigns: (Campaign & {
    total_leads: number;
    total_winners: number;
    remaining_prizes: number;
  })[];
  users: CustomerUser[];
  stats: {
    total_campaigns: number;
    active_campaigns: number;
    total_leads: number;
    total_winners: number;
    total_prizes_remaining: number;
  };
  active_subscription?: CustomerSubscription | null;
  subscription_history?: CustomerSubscription[];
}

export interface Campaign {
  id: string;
  customer_id: string;
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
  customer?: {
    id?: string;
    company_name: string;
    logo_url: string | null;
  };
  customer_name?: string;
  customer_logo_url?: string | null;
  is_expired?: boolean;
  is_upcoming?: boolean;
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
  claim_status: ClaimStatus;
  claimed_at?: string | null;
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
  player_name?: string;
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
