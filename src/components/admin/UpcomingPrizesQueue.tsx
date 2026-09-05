import React, { useState, useEffect, useCallback } from 'react';
import type { Prize } from '@/types/database';
import { getUpcomingPrizes, reshufflePrizeQueue, supabase, type UpcomingPrizeItem } from '@/lib/supabase';
import {
  ChevronDown,
  ChevronUp,
  Gift,
  ListOrdered,
  AlertCircle,
  Shuffle,
  RefreshCw,
  Sparkles,
  Flame,
} from 'lucide-react';

interface UpcomingPrizesQueueProps {
  campaignId: string;
  prizes: Prize[];
  onPrizesUpdated?: () => void;
}

export const UpcomingPrizesQueue: React.FC<UpcomingPrizesQueueProps> = ({
  campaignId,
  prizes,
  onPrizesUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [queue, setQueue] = useState<UpcomingPrizeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReshuffling, setIsReshuffling] = useState(false);

  // Fetch true database-backed upcoming prize queue
  const fetchQueue = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const items = await getUpcomingPrizes(campaignId, 10);
      setQueue(items);
    } catch (err) {
      console.error('Failed to load upcoming prize queue:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, prizes]);

  // Real-time subscription to prize queue changes
  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`prize_queue_${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_prize_queue',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchQueue();
          if (onPrizesUpdated) onPrizesUpdated();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchQueue, onPrizesUpdated]);

  // Handle manual queue reshuffle
  const handleReshuffle = async () => {
    if (!campaignId || isReshuffling) return;
    setIsReshuffling(true);
    try {
      const res = await reshufflePrizeQueue(campaignId);
      if (res.success) {
        await fetchQueue();
      } else {
        alert(res.message || 'Failed to reshuffle queue');
      }
    } catch (err: any) {
      alert(`Error reshuffling queue: ${err.message}`);
    } finally {
      setIsReshuffling(false);
    }
  };

  // Calculate total weight for odds calculation
  const totalWeight = prizes
    .filter((p) => p.is_active && p.remaining_quantity > 0)
    .reduce((sum, p) => sum + (p.weight || 0), 0);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Bar with Toggle & Action Buttons */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 border-b border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 min-w-0 text-left cursor-pointer flex-1"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white font-display">
                Upcoming 10 Prizes Sequence
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Engine Queue</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              Exact sequence of prizes scheduled to be unlocked by the next participants
            </p>
          </div>
        </button>

        <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          {/* Reshuffle Queue Button */}
          <button
            type="button"
            onClick={handleReshuffle}
            disabled={isReshuffling || loading}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            title="Re-roll upcoming queue based on current prize weights"
          >
            <Shuffle className={`w-3.5 h-3.5 ${isReshuffling ? 'animate-spin' : ''}`} />
            <span>{isReshuffling ? 'Shuffling...' : 'Reshuffle'}</span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 sm:p-6 bg-slate-900/60 flex flex-col space-y-4 animate-fadeIn">
          {loading && queue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Loading upcoming prize sequence...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">No Active Prizes in Queue</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Ensure your campaign has active prizes with inventory and weight greater than zero.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {queue.map((item) => {
                const isNext = item.display_index === 1;
                const probability =
                  totalWeight > 0 ? Math.round(((item.weight || 0) / totalWeight) * 100) : 0;

                return (
                  <div
                    key={`${item.queue_id}-${item.slot_number}`}
                    className={`p-3.5 rounded-xl flex flex-col justify-between shadow-md transition-all relative overflow-hidden group ${
                      isNext
                        ? 'bg-amber-950/40 border-2 border-amber-400/80 shadow-amber-500/10 shadow-lg ring-2 ring-amber-400/20'
                        : 'bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    {/* Next Winner Banner for Slot #1 */}
                    {isNext && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-bl-lg shadow-sm flex items-center space-x-1">
                        <Flame className="w-2.5 h-2.5" />
                        <span>Next Winner</span>
                      </div>
                    )}

                    {/* Top: Slot Number + Order Tag */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shadow-sm ${
                            isNext
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          #{item.display_index}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isNext ? 'Up Next' : 'In Queue'}
                        </span>
                      </div>

                      {!isNext && (
                        <span className="text-[9px] font-mono text-slate-500">
                          Slot #{item.slot_number}
                        </span>
                      )}
                    </div>

                    {/* Middle: Prize Icon & Name */}
                    <div className="flex items-center space-x-2.5 my-1.5">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-amber-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Gift className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5
                          className={`text-xs font-bold truncate transition-colors ${
                            isNext ? 'text-amber-300' : 'text-white group-hover:text-amber-200'
                          }`}
                        >
                          {item.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.description || 'Exclusive reward'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Stock & Odds */}
                    <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">
                        Stock: <span className="text-emerald-400 font-bold">{item.remaining_quantity} left</span>
                      </span>
                      <span className="text-slate-400">
                        Odds: <span className="text-amber-300 font-semibold">{probability}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Queue Explanation */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Prizes are allocated in exact sequential order. When a player scratches, #1 is awarded and the queue advances.
              </span>
            </span>
            <span className="font-mono text-slate-400">
              Showing top {queue.length} of queued slots
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
