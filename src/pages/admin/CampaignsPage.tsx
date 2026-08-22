import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { CampaignModal } from '@/components/admin/CampaignModal';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/lib/utils';
import type { Campaign } from '@/types/database';
import {
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Megaphone,
  Calendar,
  Gift,
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data as Campaign[]) || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
    if (editingCampaign) {
      const { error } = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', editingCampaign.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('campaigns').insert(campaignData);
      if (error) throw error;
    }
    await fetchCampaigns();
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${name}"? All associated prizes, leads, and allocations will be deleted.`
      )
    ) {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) {
        alert(`Error deleting campaign: ${error.message}`);
      } else {
        await fetchCampaigns();
      }
    }
  };

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <AdminHeader
        title="Campaigns"
        description="Create, configure, and monitor promotional Scratch & Win campaigns"
        onOpenMobileMenu={openMobileMenu}
        actions={
          <Button
            onClick={() => {
              setEditingCampaign(null);
              setIsModalOpen(true);
            }}
            variant="gold"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Campaign
          </Button>
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
            <Megaphone className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No campaigns created yet</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-sm">
              Create your first promotional campaign with custom branding and instant prizes.
            </p>
            <Button
              onClick={() => {
                setEditingCampaign(null);
                setIsModalOpen(true);
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
                  {/* Top Bar: Status Badge + Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge status={camp.status} />
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingCampaign(camp);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Campaign"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Header Info */}
                  <h3 className="text-lg font-bold text-white font-display line-clamp-1 mb-1">
                    {camp.name}
                  </h3>

                  {camp.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {camp.description}
                    </p>
                  )}

                  {/* Timeline Details */}
                  <div className="flex flex-col space-y-1.5 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-4">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {formatDate(camp.start_date)} – {formatDate(camp.end_date)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Slug: <span className="text-amber-300 font-mono">/c/{camp.slug}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyLink(camp.slug, camp.id)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                  >
                    {copiedId === camp.id ? (
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
                    title="Launch Public Game"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCampaign}
        initialData={editingCampaign}
      />
    </div>
  );
};
