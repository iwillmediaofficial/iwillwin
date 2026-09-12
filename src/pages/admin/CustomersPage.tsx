import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  adminGetCustomers,
  adminCreateCustomer,
  adminUpdateCustomer,
  adminDeleteCustomer,
  sanitizeCampaignPayload,
  supabase,
} from '@/lib/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CustomerModal } from '@/components/admin/CustomerModal';
import { CustomerLogo } from '@/components/admin/CustomerLogo';
import { CampaignModal } from '@/components/admin/CampaignModal';
import { Button } from '@/components/common/Button';
import type { CustomerWithStats, Campaign } from '@/types/database';
import {
  Plus,
  Building2,
  Users,
  Search,
  Mail,
  Phone,
  ArrowRight,
  Edit2,
  Trash2,
  Megaphone,
  Trophy,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { isSuperAdmin, customerId } = useAuth();

  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Customer Modal States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);

  // Campaign Modal States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignForCustomerId, setCampaignForCustomerId] = useState<string | undefined>(undefined);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await adminGetCustomers();
      if (res.success && res.data) {
        setCustomers(res.data);
      } else {
        console.error('Failed to load customers:', res.message);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If a customer_admin or customer_viewer visits /admin/customers, redirect directly to their customer page
    if (!isSuperAdmin && customerId) {
      navigate(`/admin/customers/${customerId}`, { replace: true });
      return;
    }
    fetchCustomers();
  }, [isSuperAdmin, customerId, navigate]);

  const handleSaveCustomer = async (data: any) => {
    if (editingCustomer) {
      const res = await adminUpdateCustomer(editingCustomer.id, data);
      if (!res.success) {
        throw new Error(res.message || 'Failed to update customer');
      }
    } else {
      const res = await adminCreateCustomer(data);
      if (!res.success) {
        throw new Error(res.message || 'Failed to create customer');
      }
    }
    await fetchCustomers();
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!isSuperAdmin) return;
    if (
      window.confirm(
        `Are you sure you want to delete customer "${name}"?\nWARNING: All associated campaigns, prizes, and participant data will be deleted.`
      )
    ) {
      const res = await adminDeleteCustomer(id);
      if (res.success) {
        await fetchCustomers();
      } else {
        alert(res.message || 'Failed to delete customer');
      }
    }
  };

  const handleToggleStatus = async (customer: CustomerWithStats) => {
    const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
    const res = await adminUpdateCustomer(customer.id, { status: newStatus });
    if (res.success) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, status: newStatus } : c))
      );
    } else {
      alert(res.message || 'Failed to update status');
    }
  };

  const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
    const cleanData = sanitizeCampaignPayload(campaignData);
    const { error } = await supabase.from('campaigns').insert(cleanData);
    if (error) throw error;
    await fetchCustomers();
  };

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery));

    const matchesStatus =
      statusFilter === 'All' ? true : c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'Active').length;
  const totalCampaigns = customers.reduce((acc, c) => acc + (c.campaigns_count || 0), 0);
  const totalLeads = customers.reduce((acc, c) => acc + (c.total_leads || 0), 0);
  const totalWinners = customers.reduce((acc, c) => acc + (c.total_winners || 0), 0);

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-16">
      <AdminHeader
        title="Customers"
        description="Customer-centric management: brands, dedicated campaigns, prize allocations, and lead tracking"
        onOpenMobileMenu={openMobileMenu}
        actions={
          isSuperAdmin ? (
            <Button
              onClick={() => {
                setEditingCustomer(null);
                setIsCustomerModalOpen(true);
              }}
              variant="gold"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Customer
            </Button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col space-y-6">
        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Customers
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-bold text-white font-display">
                {totalCustomers}
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                {activeCustomers} Active
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Campaigns
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Megaphone className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-white font-display">
                {totalCampaigns}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Leads
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-white font-display">
                {totalLeads.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Winners
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-white font-display">
                {totalWinners.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by company, contact person, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            {(['All', 'Active', 'Inactive'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            Loading customers and campaign statistics...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
            <Building2 className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No customers found</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-sm">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating your first client/customer account.'}
            </p>
            {isSuperAdmin && (
              <Button
                onClick={() => {
                  setEditingCustomer(null);
                  setIsCustomerModalOpen(true);
                }}
                variant="gold"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Customer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group hover:shadow-amber-500/5"
              >
                <div>
                  {/* Top Bar: Logo & Status Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <CustomerLogo
                        logoUrl={cust.logo_url}
                        name={cust.company_name}
                        className="w-12 h-12"
                        roundedClassName="rounded-xl"
                        textClassName="text-lg"
                      />

                      <div className="min-w-0">
                        <Link
                          to={`/admin/customers/${cust.id}`}
                          className="text-base font-bold text-white hover:text-amber-400 transition-colors line-clamp-1 flex items-center space-x-1"
                        >
                          <span>{cust.company_name}</span>
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">{cust.contact_person}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleToggleStatus(cust)}
                        title={cust.status === 'Active' ? 'Deactivate Customer' : 'Activate Customer'}
                        className={`inline-flex items-center space-x-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                          cust.status === 'Active'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cust.status === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        <span>{cust.status}</span>
                      </button>
                    </div>
                  </div>

                  {/* Contact Info Pills */}
                  <div className="space-y-1.5 mb-4 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center space-x-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                    {cust.phone && (
                      <div className="flex items-center space-x-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Campaign & Lead KPI Counters */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Campaigns
                      </div>
                      <div className="text-sm font-bold text-white mt-1">
                        <span className="text-amber-400">{cust.active_campaigns_count || 0}</span>
                        <span className="text-slate-500 font-normal">/{cust.campaigns_count || 0}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Leads
                      </div>
                      <div className="text-sm font-bold text-purple-400 mt-1">
                        {(cust.total_leads || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Winners
                      </div>
                      <div className="text-sm font-bold text-emerald-400 mt-1">
                        {(cust.total_winners || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <Link
                    to={`/admin/customers/${cust.id}`}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                  >
                    <span>View Customer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => {
                      setCampaignForCustomerId(cust.id);
                      setIsCampaignModalOpen(true);
                    }}
                    title="Quick Create Campaign"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors border border-slate-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingCustomer(cust);
                      setIsCustomerModalOpen(true);
                    }}
                    title="Edit Customer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={() => handleDeleteCustomer(cust.id, cust.company_name)}
                      title="Delete Customer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700 hover:border-rose-800/50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Modal (Create & Edit) */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
      />

      {/* Campaign Quick Modal */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSave={handleSaveCampaign}
        preselectedCustomerId={campaignForCustomerId}
        customersList={customers}
      />
    </div>
  );
};
