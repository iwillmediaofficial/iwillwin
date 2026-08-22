import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { LeadDetailModal } from '@/components/admin/LeadDetailModal';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatDate, exportToCsv } from '@/lib/utils';
import type { Lead, Campaign } from '@/types/database';
import {
  Search,
  Download,
  Eye,
  Users,
  ChevronLeft,
  ChevronRight,
  Cake,
  ShieldCheck,
} from 'lucide-react';

const PAGE_SIZE = 15;

export const LeadsPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Detail Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch Campaigns
  useEffect(() => {
    supabase
      .from('campaigns')
      .select('id, name, slug')
      .then(({ data }) => {
        if (data) setCampaigns(data as Campaign[]);
      });
  }, []);

  // Fetch Leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*, campaign:campaigns(name, slug), prize:prizes(name, image_url)', {
          count: 'exact',
        });

      if (selectedCampaignId !== 'all') {
        query = query.eq('campaign_id', selectedCampaignId);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('scratch_status', selectedStatus);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%,claim_code.ilike.%${q}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setLeads((data as Lead[]) || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, selectedCampaignId, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchLeads();
  };

  // CSV Export Handler
  const handleExportCsv = async () => {
    try {
      let exportQuery = supabase
        .from('leads')
        .select('*, campaign:campaigns(name, slug), prize:prizes(name)');

      if (selectedCampaignId !== 'all') {
        exportQuery = exportQuery.eq('campaign_id', selectedCampaignId);
      }

      if (selectedStatus !== 'all') {
        exportQuery = exportQuery.eq('scratch_status', selectedStatus);
      }

      const { data, error } = await exportQuery.order('created_at', { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No leads available to export.');
        return;
      }

      const exportRows = data.map((lead: any) => ({
        'Lead ID': lead.id,
        'Winning Code': lead.claim_code || '',
        'Full Name': lead.name || 'Anonymous',
        'Mobile Number': lead.mobile || '',
        'Email Address': lead.email || '',
        'Date of Birth': lead.dob || '',
        'Campaign Name': lead.campaign?.name || '',
        'Prize Won': lead.prize?.name || 'None',
        'Scratch Status': lead.scratch_status,
        'Participated At': formatDate(lead.participated_at),
        'Revealed At': formatDate(lead.revealed_at),
        'IP Address': lead.ip_address || '',
        'User Agent': lead.user_agent || '',
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      exportToCsv(`IWILLWIN_Leads_${dateStr}`, exportRows);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <AdminHeader
        title="Leads & Participants"
        description="Search, view, filter, and export promotional participants, unique winning codes, and allocated prizes"
        onOpenMobileMenu={openMobileMenu}
        actions={
          <Button
            onClick={handleExportCsv}
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col space-y-6">
        {/* Filters Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1"
          >
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, mobile, email, or winning code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <Button type="submit" variant="gold" size="sm" className="text-xs">
              Search
            </Button>
          </form>

          <div className="flex items-center space-x-3">
            {/* Campaign Filter */}
            <select
              className="bg-slate-950 text-slate-200 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={selectedCampaignId}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="bg-slate-950 text-slate-200 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Scratch Statuses</option>
              <option value="Revealed">Revealed Only</option>
              <option value="Pending">Pending Only</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading participants...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
            <Users className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No leads found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              No participants matching your filter criteria were found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Participant & Code</th>
                  <th className="py-3.5 px-4 font-semibold">Contact Info</th>
                  <th className="py-3.5 px-4 font-semibold">Campaign</th>
                  <th className="py-3.5 px-4 font-semibold">Allocated Prize</th>
                  <th className="py-3.5 px-4 font-semibold">Participated</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{lead.name || 'Anonymous'}</div>
                      {lead.claim_code && (
                        <div className="text-[11px] text-amber-300 font-mono flex items-center space-x-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-amber-400" />
                          <span>{lead.claim_code}</span>
                        </div>
                      )}
                      {lead.dob && (
                        <div className="text-[11px] text-pink-300 font-normal flex items-center space-x-1 mt-0.5">
                          <Cake className="w-3 h-3 text-pink-400" />
                          <span>DOB: {lead.dob}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      <div>{lead.mobile || '—'}</div>
                      {lead.email && <div className="text-slate-400">{lead.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {lead.campaign?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-amber-300">
                      {lead.prize?.name || 'No Prize'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {formatDate(lead.participated_at)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={lead.scratch_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLead(lead);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} leads
            </span>

            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              <span className="font-semibold text-slate-200">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <LeadDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        lead={selectedLead}
      />
    </div>
  );
};
