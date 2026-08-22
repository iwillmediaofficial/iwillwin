import React, { useEffect, useState, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase, getAdminDashboardStats } from '@/lib/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatCard } from '@/components/admin/StatCard';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/lib/utils';
import { animateCardStagger } from '@/lib/gsap';
import type { Lead, Campaign } from '@/types/database';
import {
  Users,
  Trophy,
  Gift,
  Package,
  Megaphone,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();

  const [stats, setStats] = useState({
    totalParticipants: 0,
    totalRevealed: 0,
    totalCampaigns: 0,
    totalPrizesDistributed: 0,
    totalPrizesRemaining: 0,
    totalPrizesAllocated: 0,
  });

  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dashStats, leadsRes, campRes] = await Promise.all([
          getAdminDashboardStats(),
          supabase
            .from('leads')
            .select('*, campaign:campaigns(name, slug), prize:prizes(name, image_url)')
            .order('created_at', { ascending: false })
            .limit(6),
          supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(3),
        ]);

        setStats(dashStats);
        if (leadsRes.data) setRecentLeads(leadsRes.data as Lead[]);
        if (campRes.data) setActiveCampaigns(campRes.data as Campaign[]);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // GSAP animation for dashboard cards
  useEffect(() => {
    if (!loading) {
      animateCardStagger(cardRefs.current);
    }
  }, [loading]);

  const conversionRate =
    stats.totalParticipants > 0
      ? Math.round((stats.totalRevealed / stats.totalParticipants) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <AdminHeader
        title="Admin Overview"
        description="Monitor real-time campaign performance, prize inventory, and leads"
        onOpenMobileMenu={openMobileMenu}
        actions={
          <Link to="/admin/campaigns">
            <Button variant="gold" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              New Campaign
            </Button>
          </Link>
        }
      />

      <div className="p-4 sm:p-8 flex flex-col space-y-8 max-w-7xl w-full mx-auto">
        {/* Top 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            title="Total Participants"
            value={stats.totalParticipants}
            subtitle={`${stats.totalRevealed} revealed cards`}
            icon={<Users className="w-5 h-5" />}
            variant="blue"
            trend={`${conversionRate}% scratch rate`}
          />

          <StatCard
            ref={(el) => {
              cardRefs.current[1] = el;
            }}
            title="Cards Scratched"
            value={stats.totalRevealed}
            subtitle="Completed reveals"
            icon={<Trophy className="w-5 h-5" />}
            variant="gold"
          />

          <StatCard
            ref={(el) => {
              cardRefs.current[2] = el;
            }}
            title="Prizes Distributed"
            value={stats.totalPrizesDistributed}
            subtitle={`Out of ${stats.totalPrizesAllocated} allocated`}
            icon={<Gift className="w-5 h-5" />}
            variant="emerald"
          />

          <StatCard
            ref={(el) => {
              cardRefs.current[3] = el;
            }}
            title="Remaining Inventory"
            value={stats.totalPrizesRemaining}
            subtitle="Prizes available in stock"
            icon={<Package className="w-5 h-5" />}
            variant="purple"
          />
        </div>

        {/* Two Columns: Recent Leads & Active Campaigns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Leads Feed (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display">
                  Recent Participants & Winners
                </h3>
              </div>
              <Link
                to="/admin/leads"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                <span>View All Leads</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading stream...</div>
            ) : recentLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No participants yet. Share your campaign link to get started!
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700 text-sm flex-shrink-0">
                        {lead.name ? lead.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-white">
                          {lead.name || 'Anonymous Player'}
                        </span>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <span>{lead.mobile || lead.email || 'No contact'}</span>
                          <span>•</span>
                          <span>{formatDate(lead.participated_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 sm:self-center">
                      <div className="flex flex-col text-left sm:text-right">
                        <span className="text-xs font-semibold text-amber-300">
                          {lead.prize?.name || 'No Prize'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {lead.campaign?.name || 'Campaign'}
                        </span>
                      </div>
                      <Badge status={lead.scratch_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Campaigns Card (1 Col) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <h3 className="text-base font-bold text-white font-display">Campaigns</h3>
                </div>
                <Link
                  to="/admin/campaigns"
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                >
                  Manage
                </Link>
              </div>

              <div className="flex flex-col space-y-3">
                {activeCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex flex-col space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white truncate max-w-[170px]">
                        {camp.name}
                      </h4>
                      <Badge status={camp.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Slug: /{camp.slug}</span>
                      <a
                        href={`/c/${camp.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                      >
                        <span>Preview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-5 mt-4 border-t border-slate-800">
              <Link to="/admin/prizes" className="block">
                <Button variant="secondary" size="md" className="w-full text-xs font-bold">
                  Configure Prizes & Odds
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
