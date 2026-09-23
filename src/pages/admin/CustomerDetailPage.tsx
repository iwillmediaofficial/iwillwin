import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  adminGetCustomerDetail,
  adminUpdateCustomer,
  adminDeleteCustomer,
  adminCreateCustomerUser,
  adminDeleteCustomerUser,
  uploadCampaignAsset,
  updateLeadClaimStatus,
  sanitizeCampaignPayload,
  adminGetPlans,
  adminAssignCustomerPlan,
  adminExtendCustomerPlan,
  adminSetSubscriptionStatus,
  supabase,
} from '@/lib/supabase';
import { CampaignModal } from '@/components/admin/CampaignModal';
import { CustomerUserModal } from '@/components/admin/CustomerUserModal';
import { CustomerLogo } from '@/components/admin/CustomerLogo';
import { LeadDetailModal } from '@/components/admin/LeadDetailModal';
import { AssignPlanModal } from '@/components/admin/AssignPlanModal';
import { ExtendPlanModal } from '@/components/admin/ExtendPlanModal';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatDate, exportToCsv } from '@/lib/utils';
import type {
  Customer,
  Campaign,
  CustomerUser,
  Lead,
  Prize,
  ClaimStatus,
  CustomerSubscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@/types/database';
import {
  ArrowLeft,
  Building2,
  Mail,
  Megaphone,
  Gift,
  Users,
  Settings,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Search,
  Download,
  Eye,
  ShieldCheck,
  Upload,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';

type TabType = 'overview' | 'campaigns' | 'leads' | 'prizes' | 'subscription' | 'users' | 'settings';

export const CustomerDetailPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  // Data States
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [campaigns, setCampaigns] = useState<
    (Campaign & {
      total_leads: number;
      total_winners: number;
      remaining_prizes: number;
    })[]
  >([]);
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [stats, setStats] = useState({
    total_campaigns: 0,
    active_campaigns: 0,
    total_leads: 0,
    total_winners: 0,
    total_prizes_remaining: 0,
  });

  // Leads Tab States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadCampaignFilter, setLeadCampaignFilter] = useState<string>('all');
  const [leadScratchFilter, setLeadScratchFilter] = useState<string>('all');
  const [leadClaimFilter, setLeadClaimFilter] = useState<string>('all');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [leadPage, setLeadPage] = useState(1);
  const [leadTotalCount, setLeadTotalCount] = useState(0);
  const LEADS_PAGE_SIZE = 15;

  // Prizes Tab States
  const [customerPrizes, setCustomerPrizes] = useState<
    (Prize & { campaign?: { id: string; name: string; slug: string } })[]
  >([]);
  const [prizesLoading, setPrizesLoading] = useState(false);

  // Modals & Interaction States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [copiedSlugId, setCopiedSlugId] = useState<string | null>(null);

  // Subscription States
  const [activeSubscription, setActiveSubscription] = useState<CustomerSubscription | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<CustomerSubscription[]>([]);
  const [masterPlans, setMasterPlans] = useState<SubscriptionPlan[]>([]);
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false);
  const [isExtendPlanModalOpen, setIsExtendPlanModalOpen] = useState(false);

  // Settings Tab State
  const [settingsForm, setSettingsForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    logo_url: '',
    address: '',
    notes: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoStatusMsg, setLogoStatusMsg] = useState<string | null>(null);

  // Fetch Customer Details
  const fetchCustomerData = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [res, plansRes] = await Promise.all([
        adminGetCustomerDetail(customerId),
        adminGetPlans(),
      ]);

      if (res.success && res.customer) {
        setCustomer(res.customer);
        setCampaigns(res.campaigns || []);
        setUsers(res.users || []);
        if (res.stats) setStats(res.stats);
        setActiveSubscription(res.active_subscription || null);
        setSubscriptionHistory(res.subscription_history || []);

        if (plansRes.success) {
          setMasterPlans(plansRes.data || []);
        }

        setSettingsForm({
          company_name: res.customer.company_name || '',
          contact_person: res.customer.contact_person || '',
          email: res.customer.email || '',
          phone: res.customer.phone || '',
          logo_url: res.customer.logo_url || '',
          address: res.customer.address || '',
          notes: res.customer.notes || '',
          status: res.customer.status || 'Active',
        });
      } else {
        alert(res.message || 'Failed to load customer profile');
        navigate('/admin/customers');
      }
    } catch (err: any) {
      console.error('Error loading customer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  // Subscription Actions
  const handleAssignPlan = async (data: {
    customerId: string;
    planId: string;
    startDate: string;
    endDate: string;
    maxCampaigns: number;
    pricePaid: number;
    notes: string;
  }) => {
    const res = await adminAssignCustomerPlan({
      customerId: data.customerId,
      planId: data.planId,
      startDate: data.startDate,
      endDate: data.endDate,
      maxCampaigns: data.maxCampaigns,
      pricePaid: data.pricePaid,
      notes: data.notes,
    });
    if (!res.success) {
      throw new Error(res.message || 'Failed to assign plan');
    }
    await fetchCustomerData();
  };

  const handleExtendPlan = async (params: {
    subscriptionId: string;
    days?: number;
    customEndDate?: string;
  }) => {
    const res = await adminExtendCustomerPlan(params);
    if (!res.success) {
      throw new Error(res.message || 'Failed to extend subscription');
    }
    await fetchCustomerData();
  };

  const handleSetSubscriptionStatus = async (status: SubscriptionStatus) => {
    if (!activeSubscription) return;
    if (!window.confirm(`Are you sure you want to change subscription status to "${status}"?`)) return;
    const res = await adminSetSubscriptionStatus(activeSubscription.id, status);
    if (!res.success) {
      alert(res.message || 'Failed to update subscription status');
      return;
    }
    await fetchCustomerData();
  };

  // Fetch Leads for this customer's campaigns
  const fetchCustomerLeads = async () => {
    if (!campaigns.length) {
      setLeads([]);
      setLeadTotalCount(0);
      return;
    }

    setLeadsLoading(true);
    try {
      const campaignIds =
        leadCampaignFilter === 'all'
          ? campaigns.map((c) => c.id)
          : [leadCampaignFilter];

      let query = supabase
        .from('leads')
        .select('*, campaign:campaigns(id, name, slug), prize:prizes(name, image_url)', {
          count: 'exact',
        })
        .in('campaign_id', campaignIds);

      if (leadScratchFilter !== 'all') {
        query = query.eq('scratch_status', leadScratchFilter);
      }
      if (leadClaimFilter !== 'all') {
        query = query.eq('claim_status', leadClaimFilter);
      }
      if (leadSearchQuery.trim()) {
        const q = leadSearchQuery.trim();
        query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%,claim_code.ilike.%${q}%`);
      }

      const from = (leadPage - 1) * LEADS_PAGE_SIZE;
      const to = from + LEADS_PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLeads((data as Lead[]) || []);
      setLeadTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching customer leads:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  // Fetch Consolidated Prizes
  const fetchCustomerPrizes = async () => {
    if (!campaigns.length) {
      setCustomerPrizes([]);
      return;
    }

    setPrizesLoading(true);
    try {
      const campaignIds = campaigns.map((c) => c.id);
      const { data, error } = await supabase
        .from('prizes')
        .select('*, campaign:campaigns(id, name, slug)')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomerPrizes((data as any) || []);
    } catch (err: any) {
      console.error('Error loading prizes:', err);
    } finally {
      setPrizesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leads' && campaigns.length > 0) {
      fetchCustomerLeads();
    }
    if (activeTab === 'prizes' && campaigns.length > 0) {
      fetchCustomerPrizes();
    }
    if (activeTab === 'overview' && campaigns.length > 0 && leads.length === 0) {
      fetchCustomerLeads();
    }
  }, [
    activeTab,
    campaigns,
    leadCampaignFilter,
    leadScratchFilter,
    leadClaimFilter,
    leadPage,
  ]);

  // Handle Save Campaign (Create or Update)
  const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
    if (!customerId) return;
    const cleanData = sanitizeCampaignPayload(campaignData);
    if (editingCampaign) {
      const { error } = await supabase
        .from('campaigns')
        .update(cleanData)
        .eq('id', editingCampaign.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('campaigns').insert({
        ...cleanData,
        customer_id: customerId,
      });
      if (error) throw error;
    }
    await fetchCustomerData();
  };

  // Handle Delete Campaign
  const handleDeleteCampaign = async (id: string, name: string) => {
    if (!isSuperAdmin) return;
    if (
      window.confirm(
        `Are you sure you want to delete campaign "${name}"?\nAll prize configurations and participant records will be deleted.`
      )
    ) {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) {
        alert(error.message);
      } else {
        await fetchCustomerData();
      }
    }
  };

  // Toggle Claim Status
  const handleToggleClaimStatus = async (lead: Lead) => {
    const nextStatus: ClaimStatus = lead.claim_status === 'Claimed' ? 'Unclaimed' : 'Claimed';
    setUpdatingLeadId(lead.id);
    try {
      const res = await updateLeadClaimStatus(lead.id, nextStatus);
      if (!res.success) throw new Error(res.message);

      const updatedClaimedAt = nextStatus === 'Claimed' ? new Date().toISOString() : null;
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, claim_status: nextStatus, claimed_at: updatedClaimedAt } : l
        )
      );
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead((prev) =>
          prev ? { ...prev, claim_status: nextStatus, claimed_at: updatedClaimedAt } : null
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update claim status');
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Add Customer User
  const handleAddCustomerUser = async (
    email: string,
    pass: string,
    role: 'customer_admin' | 'customer_viewer'
  ) => {
    if (!customerId) return;
    const res = await adminCreateCustomerUser(customerId, email, pass, role);
    if (!res.success) {
      throw new Error(res.message || 'Failed to create user');
    }
    await fetchCustomerData();
  };

  // Delete Customer User
  const handleDeleteCustomerUser = async (userId: string, email: string) => {
    if (!isSuperAdmin || !customerId) return;
    if (window.confirm(`Revoke login access for "${email}"?`)) {
      const res = await adminDeleteCustomerUser(userId, customerId);
      if (res.success) {
        await fetchCustomerData();
      } else {
        alert(res.message || 'Failed to delete user');
      }
    }
  };

  // Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    setIsSavingSettings(true);
    try {
      const res = await adminUpdateCustomer(customerId, {
        company_name: settingsForm.company_name.trim(),
        contact_person: settingsForm.contact_person.trim(),
        email: settingsForm.email.trim().toLowerCase(),
        phone: settingsForm.phone.trim() || null,
        logo_url: settingsForm.logo_url.trim() || null,
        address: settingsForm.address.trim() || null,
        notes: settingsForm.notes.trim() || null,
        status: settingsForm.status,
      });

      if (!res.success) throw new Error(res.message);
      alert('Customer settings updated successfully.');
      await fetchCustomerData();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Upload Logo in Settings with Instant Auto-Save
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customerId) return;
    setIsUploadingLogo(true);
    setLogoStatusMsg(null);
    try {
      const url = await uploadCampaignAsset(file, 'logos');
      if (url) {
        setSettingsForm((prev) => ({ ...prev, logo_url: url }));
        // Instantly save to database so the logo persists even if page is reloaded
        const res = await adminUpdateCustomer(customerId, { logo_url: url });
        if (res.success) {
          setCustomer((prev) => (prev ? { ...prev, logo_url: url } : prev));
          setLogoStatusMsg('✓ Logo uploaded and saved successfully to customer profile!');
          setTimeout(() => setLogoStatusMsg(null), 4000);
        } else {
          alert(`Logo uploaded to storage, but failed to save to database: ${res.message}`);
        }
      } else {
        alert('Failed to upload logo image. Please check file format and try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Remove Logo in Settings with Instant Auto-Save
  const handleRemoveLogo = async () => {
    if (!customerId) return;
    if (window.confirm('Are you sure you want to remove the customer brand logo?')) {
      setIsUploadingLogo(true);
      setLogoStatusMsg(null);
      try {
        const res = await adminUpdateCustomer(customerId, { logo_url: null });
        if (res.success) {
          setSettingsForm((prev) => ({ ...prev, logo_url: '' }));
          setCustomer((prev) => (prev ? { ...prev, logo_url: null } : prev));
          setLogoStatusMsg('✓ Customer logo removed.');
          setTimeout(() => setLogoStatusMsg(null), 3000);
        } else {
          alert(`Failed to remove logo: ${res.message}`);
        }
      } catch (err: any) {
        alert(err.message || 'Error removing logo');
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  // Export Leads to CSV
  const handleExportCsv = async () => {
    if (!campaigns.length) return;
    try {
      const campaignIds =
        leadCampaignFilter === 'all'
          ? campaigns.map((c) => c.id)
          : [leadCampaignFilter];

      const { data, error } = await supabase
        .from('leads')
        .select('*, campaign:campaigns(name, slug), prize:prizes(name)')
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || !data.length) {
        alert('No leads available to export.');
        return;
      }

      const rows = data.map((l: any) => ({
        'Player Name': l.name || 'Anonymous',
        'Mobile Number': l.mobile || '—',
        'Email Address': l.email || '—',
        'Date of Birth': l.dob || '—',
        Campaign: l.campaign?.name || '—',
        'Campaign Slug': l.campaign?.slug || '—',
        'Prize Won': l.prize?.name || 'Better Luck Next Time',
        'Verification Code': l.claim_code || '—',
        'Scratch Status': l.scratch_status,
        'Claim Status': l.claim_status,
        'Participated At': formatDate(l.participated_at),
        'Revealed At': formatDate(l.revealed_at),
        'Claimed At': formatDate(l.claimed_at),
        'IP Address': l.ip_address || '—',
      }));

      const filename = `${customer?.company_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_leads_${new Date().toISOString().slice(0, 10)}`;
      exportToCsv(filename, rows);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  // Copy Game Link Helper
  const handleCopyLink = (slug: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlugId(id);
    setTimeout(() => setCopiedSlugId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <p className="text-sm">Loading customer CRM workspace...</p>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-16">
      {/* Top Header & Navigation */}
      <div className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Customer Identity */}
            <div className="flex items-center space-x-4">
              {isSuperAdmin && (
                <Link
                  to="/admin/customers"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
                  title="Back to Customers List"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              )}

              <CustomerLogo
                logoUrl={customer.logo_url}
                name={customer.company_name}
                className="w-14 h-14"
                roundedClassName="rounded-2xl"
                textClassName="text-xl"
              />

              <div>
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-white font-display">
                    {customer.company_name}
                  </h1>
                  <span
                    className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      customer.status === 'Active'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        customer.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                    <span>{customer.status}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                  <span>Contact: <strong className="text-slate-200">{customer.contact_person}</strong></span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span>{customer.email}</span>
                  {customer.phone && (
                    <>
                      <span className="hidden sm:inline text-slate-600">•</span>
                      <span>{customer.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2.5 self-start md:self-auto">
              <Button
                onClick={() => {
                  setEditingCampaign(null);
                  setIsCampaignModalOpen(true);
                }}
                variant="gold"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Campaign
              </Button>

              <Button
                onClick={() => setActiveTab('settings')}
                variant="outline"
                size="sm"
                leftIcon={<Settings className="w-4 h-4" />}
              >
                Settings
              </Button>
            </div>
          </div>

          {/* CRM Tabs Navigation */}
          <div className="flex space-x-1 sm:space-x-2 mt-6 overflow-x-auto no-scrollbar border-b border-slate-800/60 pb-px">
            {[
              { id: 'overview', label: 'Overview', icon: Building2 },
              { id: 'subscription', label: 'Subscription & Plan', icon: Layers },
              { id: 'campaigns', label: `Campaigns (${campaigns.length})`, icon: Megaphone },
              { id: 'leads', label: 'Leads & Winners', icon: Users },
              { id: 'prizes', label: 'Prize Distribution', icon: Gift },
              { id: 'users', label: `Customer Users (${users.length})`, icon: ShieldCheck },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Active Subscription Banner / Snapshot */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition-all">
              {activeSubscription ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center space-x-4">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Active Subscription Plan
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            activeSubscription.status === 'active'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : activeSubscription.status === 'suspended'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {activeSubscription.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white font-display mt-0.5">
                        {activeSubscription.plan_name || activeSubscription.plan?.name || 'Custom Plan'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
                        <span>
                          Valid until:{' '}
                          <strong className="text-slate-200">
                            {formatDate(activeSubscription.end_date)}
                          </strong>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          {new Date(activeSubscription.end_date) < new Date() ? (
                            <span className="text-rose-400 font-semibold">Expired</span>
                          ) : (
                            <span className="text-amber-400 font-semibold">
                              {Math.ceil(
                                (new Date(activeSubscription.end_date).getTime() - Date.now()) /
                                  (1000 * 60 * 60 * 24)
                              )}{' '}
                              days remaining
                            </span>
                          )}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          Quota: <strong className="text-slate-200">{stats.active_campaigns}</strong> /{' '}
                          {activeSubscription.max_campaigns} Active Campaigns
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start md:self-auto">
                    {isSuperAdmin && (
                      <>
                        <Button
                          onClick={() => setIsExtendPlanModalOpen(true)}
                          variant="outline"
                          size="sm"
                          leftIcon={<Clock className="w-3.5 h-3.5" />}
                        >
                          Extend Validity
                        </Button>
                        <Button
                          onClick={() => setIsAssignPlanModalOpen(true)}
                          variant="outline"
                          size="sm"
                          leftIcon={<Layers className="w-3.5 h-3.5" />}
                        >
                          Change Plan
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => setActiveTab('subscription')}
                      variant="gold"
                      size="sm"
                    >
                      Manage Plan →
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">No Active Subscription Plan</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        This customer does not have an active plan. Campaign creation and live promotions are restricted.
                      </p>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <Button
                      onClick={() => setIsAssignPlanModalOpen(true)}
                      variant="gold"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Assign Plan Now
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* KPI Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Campaigns
                </span>
                <div className="text-2xl font-bold text-white font-display mt-2">
                  {stats.total_campaigns}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active Campaigns
                </span>
                <div className="text-2xl font-bold text-amber-400 font-display mt-2">
                  {stats.active_campaigns}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Leads
                </span>
                <div className="text-2xl font-bold text-purple-400 font-display mt-2">
                  {stats.total_leads.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Winners
                </span>
                <div className="text-2xl font-bold text-emerald-400 font-display mt-2">
                  {stats.total_winners.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 col-span-2 lg:col-span-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Prizes Remaining
                </span>
                <div className="text-2xl font-bold text-sky-400 font-display mt-2">
                  {stats.total_prizes_remaining.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Two Column Section: Latest Campaigns & Recent Leads */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaigns Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white font-display flex items-center space-x-2">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>Active Campaigns</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('campaigns')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      View All ({campaigns.length}) →
                    </button>
                  </div>

                  {campaigns.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No campaigns created for this customer yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-bold text-white line-clamp-1">{c.name}</h4>
                              <Badge status={c.status} />
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">/c/{c.slug}</p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <a
                              href={`/c/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="Open Game"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <Link
                              to={`/admin/prizes?campaign=${c.id}`}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              title="Prizes"
                            >
                              <Gift className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    setEditingCampaign(null);
                    setIsCampaignModalOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create New Campaign for {customer.company_name}
                </Button>
              </div>

              {/* Recent Leads Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white font-display flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>Recent Participants</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('leads')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      View All Leads →
                    </button>
                  </div>

                  {leads.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No customer leads recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {leads.slice(0, 4).map((l) => (
                        <div
                          key={l.id}
                          className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{l.name || 'Anonymous Player'}</div>
                            <div className="text-[11px] text-slate-400">{l.mobile || l.email || '—'}</div>
                          </div>

                          <div className="text-right">
                            <span className="text-amber-400 font-semibold block">
                              {l.prize?.name || 'No Prize'}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                l.claim_status === 'Claimed'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {l.claim_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleExportCsv}
                  className="w-full mt-4 flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Customer Leads (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: SUBSCRIPTION & PLAN ================= */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Subscription & Validity Plan
                </h3>
                <p className="text-xs text-slate-400">
                  Manage commercial plan tier, campaign quotas, and operational validity dates.
                </p>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center space-x-2">
                  {activeSubscription && (
                    <Button
                      onClick={() => setIsExtendPlanModalOpen(true)}
                      variant="outline"
                      size="sm"
                      leftIcon={<Clock className="w-4 h-4" />}
                    >
                      Extend Validity
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsAssignPlanModalOpen(true)}
                    variant="gold"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    {activeSubscription ? 'Upgrade / Switch Plan' : 'Assign Plan'}
                  </Button>
                </div>
              )}
            </div>

            {/* Active Subscription Hero Card */}
            {activeSubscription ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-800/80">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          activeSubscription.status === 'active'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : activeSubscription.status === 'suspended'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {activeSubscription.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Ref: {activeSubscription.id.slice(0, 8)}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display mt-2">
                      {activeSubscription.plan_name || activeSubscription.plan?.name || 'Custom Plan'}
                    </h2>
                    {(activeSubscription.plan?.description || activeSubscription.features) && (
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                        {activeSubscription.plan?.description || activeSubscription.features?.join(' • ')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
                    <div className="text-left lg:text-right">
                      <div className="text-3xl font-black text-amber-400 font-display">
                        {(activeSubscription.price_paid || 0) > 0
                          ? `₹${(activeSubscription.price_paid || 0).toLocaleString()}`
                          : 'Custom / Enterprise'}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {activeSubscription.plan?.duration_days
                          ? `${activeSubscription.plan.duration_days}-Day Commitment`
                          : 'Valid Commitment'}
                      </span>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center space-x-2">
                        <select
                          value={activeSubscription.status}
                          onChange={(e) =>
                            handleSetSubscriptionStatus(e.target.value as SubscriptionStatus)
                          }
                          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                        >
                          <option value="active">Status: Active</option>
                          <option value="suspended">Status: Suspended</option>
                          <option value="cancelled">Status: Cancelled</option>
                          <option value="expired">Status: Expired</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Validity Timeline & Progress */}
                {(() => {
                  const startMs = new Date(activeSubscription.start_date).getTime();
                  const endMs = new Date(activeSubscription.end_date).getTime();
                  const nowMs = Date.now();
                  const totalSpan = Math.max(1, endMs - startMs);
                  const elapsedSpan = Math.max(0, Math.min(totalSpan, nowMs - startMs));
                  const progressPct = Math.round((elapsedSpan / totalSpan) * 100);
                  const isExpired = nowMs >= endMs;
                  const daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));

                  return (
                    <div className="py-6 border-b border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 text-slate-400">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          <span>
                            Started: <strong className="text-white">{formatDate(activeSubscription.start_date)}</strong>
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>
                            Expires:{' '}
                            <strong className={isExpired ? 'text-rose-400' : 'text-white'}>
                              {formatDate(activeSubscription.end_date)}
                            </strong>
                          </span>
                          <span
                            className={`font-bold ml-2 px-2.5 py-0.5 rounded-full text-[11px] ${
                              isExpired
                                ? 'bg-rose-500/10 text-rose-400'
                                : daysRemaining < 15
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {isExpired ? 'EXPIRED' : `${daysRemaining} Days Left`}
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all rounded-full ${
                            isExpired
                              ? 'bg-rose-500'
                              : progressPct > 85
                              ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                              : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, progressPct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Quota & Feature Grid */}
                <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Campaigns Allocated
                    </span>
                    <div className="text-xl font-bold text-white font-display mt-1">
                      {stats.active_campaigns} / {activeSubscription.max_campaigns}
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((stats.active_campaigns / activeSubscription.max_campaigns) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Leads / Scratch Capacity
                    </span>
                    <div className="text-xl font-bold text-purple-400 font-display mt-1">
                      {stats.total_leads.toLocaleString()} / {(activeSubscription.max_leads || 5000).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Guaranteed server capacity
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Branding & Subdomain
                    </span>
                    <div className="text-base font-bold text-white mt-1 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Custom Logo & URLs</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Full white-label game experience
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Enforcement Strictness
                    </span>
                    <div className="text-base font-bold text-emerald-400 mt-1 flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Postgres Trigger Guard</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Dates clamped to plan validity
                    </span>
                  </div>
                </div>

                {activeSubscription.notes && (
                  <div className="mt-6 p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-400">
                    <strong className="text-slate-300">Contract / Operational Notes: </strong>
                    {activeSubscription.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center">
                <Layers className="w-12 h-12 text-slate-600 mb-3" />
                <h4 className="text-base font-bold text-white mb-1">No Active Subscription</h4>
                <p className="text-xs text-slate-400 mb-5 max-w-md">
                  This customer currently has no active subscription. Assign a plan from the master catalog to enable campaigns and set validity boundaries.
                </p>
                {isSuperAdmin && (
                  <Button
                    onClick={() => setIsAssignPlanModalOpen(true)}
                    variant="gold"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Assign Subscription Plan
                  </Button>
                )}
              </div>
            )}

            {/* Subscription History */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg mt-8">
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-display">Subscription History & Audit</h4>
                  <p className="text-xs text-slate-400">Record of all past, extended, or expired plans for this customer.</p>
                </div>
              </div>

              {subscriptionHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No subscription history records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Plan Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Start Date</th>
                        <th className="py-3 px-4">End Date</th>
                        <th className="py-3 px-4">Quota</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {subscriptionHistory.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                          <td className="py-3 px-4 font-bold text-white">
                            {sub.plan_name || sub.plan?.name || 'Custom Plan'}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                sub.status === 'active'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : sub.status === 'suspended'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                              }`}
                            >
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400">{formatDate(sub.start_date)}</td>
                          <td className="py-3 px-4 text-slate-400">{formatDate(sub.end_date)}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {sub.max_campaigns || 1} camps / {(sub.max_leads || 5000).toLocaleString()} leads
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-400">
                            {(sub.price_paid || 0) > 0 ? `₹${(sub.price_paid || 0).toLocaleString()}` : 'Free'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{sub.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: CAMPAIGNS ================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  {customer.company_name} Campaigns
                </h3>
                <p className="text-xs text-slate-400">
                  Promotional campaigns assigned exclusively under this customer
                </p>
              </div>

              <Button
                onClick={() => {
                  setEditingCampaign(null);
                  setIsCampaignModalOpen(true);
                }}
                variant="gold"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Campaign
              </Button>
            </div>

            {campaigns.length === 0 ? (
              <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
                <Megaphone className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No campaigns created yet</h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm">
                  Launch an instant win scratch card campaign for this customer.
                </p>
                <Button
                  onClick={() => {
                    setEditingCampaign(null);
                    setIsCampaignModalOpen(true);
                  }}
                  variant="gold"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge status={(camp.status === 'Active' && camp.end_date && new Date(camp.end_date) < new Date()) ? 'Completed' : camp.status} />
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCampaign(camp);
                              setIsCampaignModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Campaign"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-white font-display line-clamp-1 mb-1">
                        {camp.name}
                      </h3>
                      {camp.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {camp.description}
                        </p>
                      )}

                      {/* Timeline */}
                      <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {formatDate(camp.start_date)} – {formatDate(camp.end_date)}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-amber-300">
                          /c/{camp.slug}
                        </div>
                      </div>

                      {/* KPI Counters */}
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Leads</div>
                          <div className="text-xs font-bold text-purple-400 mt-0.5">
                            {camp.total_leads || 0}
                          </div>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Winners</div>
                          <div className="text-xs font-bold text-emerald-400 mt-0.5">
                            {camp.total_winners || 0}
                          </div>
                        </div>
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Remaining</div>
                          <div className="text-xs font-bold text-sky-400 mt-0.5">
                            {camp.remaining_prizes || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCopyLink(camp.slug, camp.id)}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                      >
                        {copiedSlugId === camp.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied Link!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`/c/${camp.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                        title="Launch Game"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <Link
                        to={`/admin/prizes?campaign=${camp.id}`}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Configure Prizes"
                      >
                        <Gift className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => {
                          setLeadCampaignFilter(camp.id);
                          setActiveTab('leads');
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-400 transition-colors"
                        title="Filter Leads by this Campaign"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: LEADS & WINNERS ================= */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                {/* Campaign Dropdown */}
                <select
                  value={leadCampaignFilter}
                  onChange={(e) => {
                    setLeadCampaignFilter(e.target.value);
                    setLeadPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">All Customer Campaigns ({campaigns.length})</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Scratch Filter */}
                <select
                  value={leadScratchFilter}
                  onChange={(e) => {
                    setLeadScratchFilter(e.target.value);
                    setLeadPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">All Scratch Status</option>
                  <option value="Revealed">Revealed</option>
                  <option value="Pending">Pending</option>
                </select>

                {/* Claim Filter */}
                <select
                  value={leadClaimFilter}
                  onChange={(e) => {
                    setLeadClaimFilter(e.target.value);
                    setLeadPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">All Claim Status</option>
                  <option value="Claimed">Claimed</option>
                  <option value="Unclaimed">Unclaimed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search player, mobile, code..."
                    value={leadSearchQuery}
                    onChange={(e) => setLeadSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setLeadPage(1);
                        fetchCustomerLeads();
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <Button
                  onClick={handleExportCsv}
                  variant="gold"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              {leadsLoading ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Loading customer leads...
                </div>
              ) : leads.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No participant leads match the criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-4">Campaign</th>
                        <th className="py-3 px-4">Prize Won</th>
                        <th className="py-3 px-4">Scratch</th>
                        <th className="py-3 px-4">Claim Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-slate-800/30 transition-colors group text-slate-300"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">
                              {lead.name || 'Anonymous Player'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {lead.mobile || lead.email || '—'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-200">
                              {lead.campaign?.name || '—'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              /c/{lead.campaign?.slug}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {lead.prize ? (
                              <span className="font-bold text-amber-400">
                                {lead.prize.name}
                              </span>
                            ) : (
                              <span className="text-slate-500">Better Luck Next Time</span>
                            )}
                            {lead.claim_code && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {lead.claim_code}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                lead.scratch_status === 'Revealed'
                                  ? 'bg-purple-500/10 text-purple-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {lead.scratch_status}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleClaimStatus(lead)}
                              disabled={updatingLeadId === lead.id}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                                lead.claim_status === 'Claimed'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                              }`}
                              title="Click to toggle Claimed / Unclaimed"
                            >
                              {lead.claim_status === 'Claimed' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-400" />
                              )}
                              <span>{lead.claim_status}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {formatDate(lead.created_at)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setIsLeadDetailOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              title="View Full Lead Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {leadTotalCount > LEADS_PAGE_SIZE && (
              <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                <div>
                  Showing {(leadPage - 1) * LEADS_PAGE_SIZE + 1} to{' '}
                  {Math.min(leadPage * LEADS_PAGE_SIZE, leadTotalCount)} of {leadTotalCount} leads
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setLeadPage((p) => Math.max(1, p - 1))}
                    disabled={leadPage === 1}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="font-semibold text-white">{leadPage}</span>
                  <button
                    onClick={() => setLeadPage((p) => p + 1)}
                    disabled={leadPage * LEADS_PAGE_SIZE >= leadTotalCount}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PRIZE DISTRIBUTION ================= */}
        {activeTab === 'prizes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Prize Inventory & Allocation
                </h3>
                <p className="text-xs text-slate-400">
                  Consolidated breakdown of prizes across all campaigns for this customer
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              {prizesLoading ? (
                <div className="p-12 text-center text-slate-500 text-xs">Loading prize data...</div>
              ) : customerPrizes.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No prizes configured for this customer’s campaigns yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Campaign</th>
                        <th className="py-3 px-4">Prize Item</th>
                        <th className="py-3 px-4 text-center">Allocated</th>
                        <th className="py-3 px-4 text-center">Supplied</th>
                        <th className="py-3 px-4 text-center">Remaining</th>
                        <th className="py-3 px-4 text-center">Max Limits</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {customerPrizes.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-800/30 transition-colors text-slate-300"
                        >
                          <td className="py-3 px-4 font-semibold text-white">
                            {p.campaign?.name || '—'}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-lg object-contain bg-slate-950 border border-slate-800 p-0.5 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                                  <Gift className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-white">{p.name}</div>
                                {p.description && (
                                  <div className="text-[10px] text-slate-500 line-clamp-1">
                                    {p.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-semibold text-white">
                            {p.allocated_quantity}
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-emerald-400">
                            {p.supplied_quantity}
                          </td>

                          <td className="py-3 px-4 text-center font-bold text-amber-400">
                            {p.remaining_quantity}
                          </td>

                          <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                            {p.maximum_limit} total / {p.daily_limit} day
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Link
                              to={`/admin/prizes?campaign=${p.campaign_id}`}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              <span>Edit</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: CUSTOMER USERS ================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Authorized Customer Users
                </h3>
                <p className="text-xs text-slate-400">
                  Client accounts who can log in to view and manage campaigns under {customer.company_name}
                </p>
              </div>

              {isSuperAdmin && (
                <Button
                  onClick={() => setIsUserModalOpen(true)}
                  variant="gold"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add User
                </Button>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              {users.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs">
                  No login users have been created for this customer yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Login Email</th>
                      <th className="py-3 px-4">Role & Access</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4">Status</th>
                      {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-800/30 transition-colors text-slate-300"
                      >
                        <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span>{u.email}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              u.role === 'customer_admin'
                                ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                                : 'bg-blue-400/10 text-blue-400 border border-blue-400/30'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>
                              {u.role === 'customer_admin'
                                ? 'Customer Admin'
                                : 'Customer Viewer'}
                            </span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        </td>

                        {isSuperAdmin && (
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteCustomerUser(u.auth_user_id, u.email)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Revoke Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 6: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-white font-display mb-1">
                Customer Profile & Branding
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Update enterprise customer details, contact persons, and logo assets.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={settingsForm.company_name}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, company_name: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={settingsForm.contact_person}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, contact_person: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={settingsForm.email}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, email: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      required
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={settingsForm.phone}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, phone: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Logo Section */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Customer Brand Logo
                    </label>
                    {logoStatusMsg && (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {logoStatusMsg}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <CustomerLogo
                      logoUrl={settingsForm.logo_url}
                      name={settingsForm.company_name || 'Customer'}
                      className="w-16 h-16"
                      roundedClassName="rounded-xl"
                      textClassName="text-xl"
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className="cursor-pointer">
                          <span className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isUploadingLogo ? 'Uploading & Saving...' : 'Upload Logo'}</span>
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="hidden"
                          />
                        </label>
                        {settingsForm.logo_url && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            disabled={isUploadingLogo}
                            className="text-xs text-rose-400 hover:text-rose-300 font-medium disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter logo URL..."
                        value={settingsForm.logo_url}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, logo_url: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                      />
                      <p className="text-[11px] text-slate-500">
                        PNG, JPG, or SVG. Uploaded logos are automatically saved to your company profile.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Address & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Business Address
                    </label>
                    <textarea
                      rows={3}
                      value={settingsForm.address}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, address: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">
                      Operational Notes
                    </label>
                    <textarea
                      rows={3}
                      value={settingsForm.notes}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, notes: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-white">Customer Account Status</div>
                    <div className="text-xs text-slate-400">
                      Inactive customers cannot launch active promotional campaigns.
                    </div>
                  </div>
                  <select
                    value={settingsForm.status}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        status: e.target.value as 'Active' | 'Inactive',
                      })
                    }
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" variant="gold" disabled={isSavingSettings}>
                    {isSavingSettings ? 'Saving Changes...' : 'Save Customer Changes'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Danger Zone (Super Admin only) */}
            {isSuperAdmin && (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider">
                      Danger Zone
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Deleting this customer permanently purges all linked campaigns, prize configurations, allocated queues, and participant lead records.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `CRITICAL: Are you absolutely sure you want to delete ${customer.company_name}? This cannot be undone.`
                          )
                        ) {
                          const res = await adminDeleteCustomer(customer.id);
                          if (res.success) {
                            navigate('/admin/customers');
                          } else {
                            alert(res.message || 'Failed to delete customer');
                          }
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors"
                    >
                      Delete {customer.company_name} Permanently
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign Modal */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => {
          setIsCampaignModalOpen(false);
          setEditingCampaign(null);
        }}
        onSave={handleSaveCampaign}
        initialData={editingCampaign}
        preselectedCustomerId={customerId}
        customersList={customer ? [customer as any] : undefined}
      />

      {/* Customer User Modal */}
      <CustomerUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        customerId={customerId || ''}
        customerName={customer.company_name}
        onSave={handleAddCustomerUser}
      />

      {/* Lead Detail Modal */}
      <LeadDetailModal
        isOpen={isLeadDetailOpen}
        onClose={() => {
          setIsLeadDetailOpen(false);
          setSelectedLead(null);
        }}
        lead={selectedLead}
        onToggleClaimStatus={handleToggleClaimStatus}
        isUpdatingClaim={Boolean(updatingLeadId)}
      />

      {/* Assign Plan Modal */}
      <AssignPlanModal
        isOpen={isAssignPlanModalOpen}
        onClose={() => setIsAssignPlanModalOpen(false)}
        customer={customer}
        plans={masterPlans}
        onAssign={handleAssignPlan}
      />

      {/* Extend Plan Modal */}
      <ExtendPlanModal
        isOpen={isExtendPlanModalOpen}
        onClose={() => setIsExtendPlanModalOpen(false)}
        customerName={customer.company_name}
        subscription={activeSubscription}
        onExtend={handleExtendPlan}
      />
    </div>
  );
};
