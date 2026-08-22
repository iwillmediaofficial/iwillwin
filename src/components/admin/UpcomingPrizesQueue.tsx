import React, { useState } from 'react';
import type { Prize } from '@/types/database';
import {
  ChevronDown,
  ChevronUp,
  Gift,
  ListOrdered,
  AlertCircle,
} from 'lucide-react';

interface UpcomingPrizesQueueProps {
  prizes: Prize[];
}

export const UpcomingPrizesQueue: React.FC<UpcomingPrizesQueueProps> = ({ prizes }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Filter only active prizes with inventory remaining
  const activeEligiblePrizes = prizes
    .filter((p) => p.is_active && p.remaining_quantity > 0)
    .sort((a, b) => a.display_order - b.display_order);

  // Generate sequence of upcoming 10 prizes following the display order
  const upcomingTen: { slotNumber: number; prize: Prize }[] = [];

  if (activeEligiblePrizes.length > 0) {
    // Keep track of simulated remaining stock for the preview
    const simulatedRemaining = new Map<string, number>();
    activeEligiblePrizes.forEach((p) => simulatedRemaining.set(p.id, p.remaining_quantity));

    let currentIndex = 0;
    let attempts = 0;
    const maxAttempts = 100;

    while (upcomingTen.length < 10 && attempts < maxAttempts) {
      attempts++;
      const currentPrize = activeEligiblePrizes[currentIndex % activeEligiblePrizes.length];
      const stock = simulatedRemaining.get(currentPrize.id) || 0;

      if (stock > 0) {
        upcomingTen.push({
          slotNumber: upcomingTen.length + 1,
          prize: currentPrize,
        });
        simulatedRemaining.set(currentPrize.id, stock - 1);
      }

      currentIndex++;

      // If all prizes are depleted in simulation, stop
      const totalSimRemaining = Array.from(simulatedRemaining.values()).reduce((a, b) => a + b, 0);
      if (totalSimRemaining === 0) break;
    }
  }

  // Calculate total weight for odds percentage
  const totalWeight = activeEligiblePrizes.reduce((sum, p) => sum + (p.weight || 0), 0);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Bar with Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-950/70 hover:bg-slate-950/90 transition-colors text-left select-none border-b border-slate-800/80"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400">
            <ListOrdered className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white font-display">
                Upcoming 10 Prizes Sequence
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Next 10 in Order
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              Live sequential preview of the next 10 prizes scheduled to be unlocked following display order & stock
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0 pl-3">
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline-block">
            {isOpen ? 'Collapse' : 'Expand Queue'}
          </span>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-4 sm:p-6 bg-slate-900/60 flex flex-col space-y-4 animate-fadeIn">
          {upcomingTen.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <h4 className="text-sm font-bold text-white mb-1">No Active Prizes Available</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Add active prizes with remaining stock and display orders to generate the upcoming sequence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {upcomingTen.map(({ slotNumber, prize }) => {
                const probability =
                  totalWeight > 0 ? Math.round(((prize.weight || 0) / totalWeight) * 100) : 0;

                return (
                  <div
                    key={`${prize.id}-${slotNumber}`}
                    className="p-3.5 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl flex flex-col justify-between shadow-md transition-all group"
                  >
                    {/* Top: Slot Number + Order Tag */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
                          #{slotNumber}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Slot
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        Order {prize.display_order}
                      </span>
                    </div>

                    {/* Middle: Prize Icon & Name */}
                    <div className="flex items-center space-x-2.5 my-1.5">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-amber-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
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
                        <h5 className="text-xs font-bold text-white group-hover:text-amber-200 transition-colors truncate">
                          {prize.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 truncate">
                          {prize.description || 'Exclusive reward'}
                        </p>
                      </div>
                    </div>

                    {/* Bottom: Stock & Odds */}
                    <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">
                        Stock: <span className="text-emerald-400 font-bold">{prize.remaining_quantity} left</span>
                      </span>
                      <span className="text-slate-400">
                        Weight: <span className="text-amber-300 font-semibold">{prize.weight} ({probability}%)</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
