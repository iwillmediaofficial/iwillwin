import React from 'react';
import type { Prize } from '@/types/database';
import { Badge } from '@/components/common/Badge';
import { Edit2, Trash2, Gift } from 'lucide-react';

interface PrizeDesktopTableProps {
  prizes: Prize[];
  onEdit: (prize: Prize) => void;
  onDelete: (id: string, name: string) => void;
  onToggleStatus: (prize: Prize) => void;
}

export const PrizeDesktopTable: React.FC<PrizeDesktopTableProps> = ({
  prizes,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
      <table className="w-full text-left text-sm text-slate-200">
        <thead className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 font-semibold">Image</th>
            <th className="py-3.5 px-4 font-semibold">Prize Name</th>
            <th className="py-3.5 px-4 font-semibold text-center">Allocated</th>
            <th className="py-3.5 px-4 font-semibold text-center">Supplied</th>
            <th className="py-3.5 px-4 font-semibold text-center">Remaining</th>
            <th className="py-3.5 px-4 font-semibold text-center">Max Cap</th>
            <th className="py-3.5 px-4 font-semibold text-center">Daily / Hourly</th>
            <th className="py-3.5 px-4 font-semibold text-center">Weight</th>
            <th className="py-3.5 px-4 font-semibold text-center">Status</th>
            <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {prizes.map((p) => {
            const isOutOfStock = p.remaining_quantity <= 0;
            return (
              <tr
                key={p.id}
                className="hover:bg-slate-800/40 transition-colors group"
              >
                {/* Image */}
                <td className="py-3 px-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Gift className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                </td>

                {/* Prize Name & Desc */}
                <td className="py-3 px-4 max-w-xs">
                  <div className="font-bold text-white text-sm">{p.name}</div>
                  {p.description && (
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">
                      {p.description}
                    </div>
                  )}
                </td>

                {/* Allocated */}
                <td className="py-3 px-4 text-center font-semibold text-slate-300">
                  {p.allocated_quantity}
                </td>

                {/* Supplied */}
                <td className="py-3 px-4 text-center font-bold text-amber-400">
                  {p.supplied_quantity}
                </td>

                {/* Remaining */}
                <td className="py-3 px-4 text-center">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isOutOfStock
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {p.remaining_quantity}
                  </span>
                </td>

                {/* Maximum Limit */}
                <td className="py-3 px-4 text-center text-xs text-slate-400">
                  {p.maximum_limit > 0 ? p.maximum_limit : '∞'}
                </td>

                {/* Daily / Hourly */}
                <td className="py-3 px-4 text-center text-xs font-medium text-slate-300">
                  <span className="text-amber-300">{p.daily_limit || '∞'}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="text-sky-300">{p.hourly_limit || '∞'}</span>
                </td>

                {/* Weight */}
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                    {p.weight}
                  </span>
                </td>

                {/* Status Toggle */}
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onToggleStatus(p)}
                    className="focus:outline-none"
                    title="Click to toggle status"
                  >
                    <Badge status={p.is_active ? 'active' : 'inactive'} />
                  </button>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      onClick={() => onEdit(p)}
                      className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Prize"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(p.id, p.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Prize"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
