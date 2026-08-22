import React, { useEffect, useState, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { PrizeModal } from '@/components/admin/PrizeModal';
import { PrizeDesktopTable } from '@/components/admin/PrizeDesktopTable';
import { PrizeMobileCard } from '@/components/admin/PrizeMobileCard';
import { Button } from '@/components/common/Button';
import { animateCardStagger } from '@/lib/gsap';
import type { Prize, Campaign } from '@/types/database';
import { Plus, Search, Filter, Gift, Sparkles } from 'lucide-react';

export const PrizesPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    searchParams.get('campaign') || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);

  const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch campaigns
      const { data: campData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      const camps = (campData as Campaign[]) || [];
      setCampaigns(camps);

      // Default campaign if none selected
      let targetCampId = selectedCampaignId;
      if (!targetCampId && camps.length > 0) {
        targetCampId = camps[0].id;
        setSelectedCampaignId(targetCampId);
      }

      // 2. Fetch prizes
      let query = supabase.from('prizes').select('*').order('display_order', { ascending: true });
      if (targetCampId) {
        query = query.eq('campaign_id', targetCampId);
      }

      const { data: prizeData, error } = await query;
      if (error) throw error;
      setPrizes((prizeData as Prize[]) || []);
    } catch (err) {
      console.error('Error fetching prize matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCampaignId]);

  // GSAP animation for mobile cards
  useEffect(() => {
    if (!loading && prizes.length > 0) {
      animateCardStagger(mobileCardRefs.current);
    }
  }, [loading, prizes]);

  const handleSavePrize = async (prizeData: Partial<Prize>) => {
    if (editingPrize) {
      const { error } = await supabase
        .from('prizes')
        .update(prizeData)
        .eq('id', editingPrize.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('prizes').insert(prizeData);
      if (error) throw error;
    }
    await fetchData();
  };

  const handleDeletePrize = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const { error } = await supabase.from('prizes').delete().eq('id', id);
      if (error) {
        alert(`Error deleting prize: ${error.message}`);
      } else {
        await fetchData();
      }
    }
  };

  const handleToggleStatus = async (prize: Prize) => {
    const newStatus = !prize.is_active;
    // Optimistic update
    setPrizes((prev) =>
      prev.map((p) => (p.id === prize.id ? { ...p, is_active: newStatus } : p))
    );

    const { error } = await supabase
      .from('prizes')
      .update({ is_active: newStatus })
      .eq('id', prize.id);

    if (error) {
      alert(`Error updating prize status: ${error.message}`);
      await fetchData();
    }
  };

  const filteredPrizes = prizes.filter((p) => {
    if (!searchQuery) return true;
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <AdminHeader
        title="Prize Configuration"
        description="Manage reward inventory, probability weights, daily/hourly caps, and active items"
        onOpenMobileMenu={openMobileMenu}
        actions={
          <Button
            onClick={() => {
              setEditingPrize(null);
              setIsModalOpen(true);
            }}
            variant="gold"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Prize
          </Button>
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col space-y-6">
        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            {/* Campaign Select */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <select
                className="bg-slate-950 text-slate-200 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setSearchParams({ campaign: e.target.value });
                }}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    Campaign: {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search prizes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 font-semibold flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{filteredPrizes.length} Prizes Configured</span>
          </div>
        </div>

        {/* Content View: Desktop Table vs Mobile Cards */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading prize inventory...</div>
        ) : filteredPrizes.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
            <Gift className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No prizes found</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-sm">
              Add your first prize to this campaign with custom inventory and allocation odds.
            </p>
            <Button
              onClick={() => {
                setEditingPrize(null);
                setIsModalOpen(true);
              }}
              variant="gold"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Prize
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <PrizeDesktopTable
                prizes={filteredPrizes}
                onEdit={(p) => {
                  setEditingPrize(p);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeletePrize}
                onToggleStatus={handleToggleStatus}
              />
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              {filteredPrizes.map((p, idx) => (
                <PrizeMobileCard
                  key={p.id}
                  ref={(el) => {
                    mobileCardRefs.current[idx] = el;
                  }}
                  prize={p}
                  onEdit={(prize) => {
                    setEditingPrize(prize);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDeletePrize}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <PrizeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePrize}
        campaigns={campaigns}
        defaultCampaignId={selectedCampaignId}
        initialData={editingPrize}
      />
    </div>
  );
};
