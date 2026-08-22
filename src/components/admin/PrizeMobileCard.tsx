import { forwardRef } from 'react';
import type { Prize } from '@/types/database';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Gift, Edit2, Trash2 } from 'lucide-react';

interface PrizeMobileCardProps {
  prize: Prize;
  onEdit: (prize: Prize) => void;
  onDelete: (id: string, name: string) => void;
  onToggleStatus: (prize: Prize) => void;
}

export const PrizeMobileCard = forwardRef<HTMLDivElement, PrizeMobileCardProps>(
  ({ prize, onEdit, onDelete, onToggleStatus }, ref) => {
    const isOutOfStock = prize.remaining_quantity <= 0;

    return (
      <div
        ref={ref}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col space-y-3 relative overflow-hidden"
      >
        {/* Header with Image & Title */}
        <div className="flex items-start space-x-3">
          <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
            {prize.image_url ? (
              <img
                src={prize.image_url}
                alt={prize.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Gift className="w-6 h-6 text-amber-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-base font-bold text-white font-display truncate">
                {prize.name}
              </h4>
              <button onClick={() => onToggleStatus(prize)} className="focus:outline-none flex-shrink-0">
                <Badge status={prize.is_active ? 'active' : 'inactive'} />
              </button>
            </div>

            {prize.description && (
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                {prize.description}
              </p>
            )}

            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[11px] text-slate-400">Weight:</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {prize.weight}
              </span>
            </div>
          </div>
        </div>

        {/* Quantities Matrix Box */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Allocated</span>
            <span className="text-sm font-bold text-slate-200">{prize.allocated_quantity}</span>
          </div>

          <div className="flex flex-col border-x border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Supplied</span>
            <span className="text-sm font-bold text-amber-400">{prize.supplied_quantity}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Remaining</span>
            <span
              className={`text-sm font-extrabold ${
                isOutOfStock ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {prize.remaining_quantity}
            </span>
          </div>
        </div>

        {/* Daily & Hourly Rate Caps */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Daily Limit: <strong className="text-amber-300">{prize.daily_limit || '∞'}</strong>
          </span>
          <span>
            Hourly Limit: <strong className="text-sky-300">{prize.hourly_limit || '∞'}</strong>
          </span>
        </div>

        {/* Card Actions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          <Button
            onClick={() => onEdit(prize)}
            variant="secondary"
            size="sm"
            className="flex-1 text-xs font-semibold"
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>

          <Button
            onClick={() => onDelete(prize.id, prize.name)}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-rose-400 text-xs"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }
);

PrizeMobileCard.displayName = 'PrizeMobileCard';
