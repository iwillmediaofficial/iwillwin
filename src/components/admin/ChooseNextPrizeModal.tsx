import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { setNextPrize } from '@/lib/supabase';
import type { Prize } from '@/types/database';
import {
  Gift,
  Sparkles,
  AlertCircle,
  Search,
  Flame,
  Target,
} from 'lucide-react';

interface ChooseNextPrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  prizes: Prize[];
  currentNextPrizeId?: string;
  onSuccess: (prizeName: string) => void;
}

export const ChooseNextPrizeModal: React.FC<ChooseNextPrizeModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  prizes,
  currentNextPrizeId,
  onSuccess,
}) => {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected prize when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSearchQuery('');
      if (currentNextPrizeId) {
        setSelectedPrizeId(currentNextPrizeId);
      } else {
        const firstAvailable = prizes.find((p) => p.is_active && p.remaining_quantity > 0);
        if (firstAvailable) setSelectedPrizeId(firstAvailable.id);
      }
    }
  }, [isOpen, currentNextPrizeId, prizes]);

  // Calculate active weights for odds display
  const eligiblePrizes = prizes.filter((p) => p.is_active && p.remaining_quantity > 0);
  const totalWeight = eligiblePrizes.reduce((sum, p) => sum + (p.weight || 0), 0);

  const filteredPrizes = eligiblePrizes.filter((p) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  });

  const handleConfirm = async () => {
    if (!campaignId || !selectedPrizeId || loading) return;

    const chosenPrize = prizes.find((p) => p.id === selectedPrizeId);
    if (!chosenPrize) return;

    setLoading(true);
    setError(null);

    try {
      const res = await setNextPrize(campaignId, selectedPrizeId);
      if (res.success) {
        onSuccess(chosenPrize.name);
        onClose();
      } else {
        setError(res.message || 'Failed to update next prize');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Next Prize"
      description="Select which prize will be guaranteed to be awarded to the very next participant who scratches."
      maxWidth="xl"
    >
      <div className="flex flex-col space-y-4">
        {/* Info Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-2.5">
          <Target className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-200">
            <span className="font-semibold">Real-Time Queue Override:</span> The selected prize will immediately take <strong>Slot #1</strong> in the live lottery engine. The next scratching player will be awarded this prize.
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search bar if multiple prizes */}
        {eligiblePrizes.length > 4 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search eligible prizes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        )}

        {/* Prizes List */}
        {eligiblePrizes.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-sm font-bold text-white">No Eligible Prizes</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              All prizes for this campaign are either inactive or out of remaining stock.
            </p>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 -mr-1">
            {filteredPrizes.map((prize) => {
              const isSelected = selectedPrizeId === prize.id;
              const isCurrentNext = currentNextPrizeId === prize.id;
              const odds =
                totalWeight > 0 ? Math.round(((prize.weight || 0) / totalWeight) * 100) : 0;

              return (
                <div
                  key={prize.id}
                  onClick={() => setSelectedPrizeId(prize.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-400/90 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/10'
                      : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Radio indicator & Prize Image */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-600 bg-slate-900'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {prize.image_url ? (
                        <img
                          src={prize.image_url}
                          alt={prize.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Gift className="w-5 h-5 text-amber-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-white truncate font-display">
                          {prize.name}
                        </h4>
                        {isCurrentNext && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center space-x-1 flex-shrink-0">
                            <Flame className="w-2.5 h-2.5" />
                            <span>Current Up Next</span>
                          </span>
                        )}
                      </div>
                      {prize.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {prize.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Stock & Odds */}
                  <div className="flex flex-col items-end flex-shrink-0 text-right space-y-0.5">
                    <span className="text-xs font-bold text-emerald-400">
                      {prize.remaining_quantity} left
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Natural Odds: <strong className="text-amber-300">{odds}%</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end space-x-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={handleConfirm}
            disabled={
              loading ||
              !selectedPrizeId ||
              eligiblePrizes.length === 0 ||
              (selectedPrizeId === currentNextPrizeId)
            }
            isLoading={loading}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            {selectedPrizeId === currentNextPrizeId
              ? 'Already Next Prize'
              : 'Set as Next Prize'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
