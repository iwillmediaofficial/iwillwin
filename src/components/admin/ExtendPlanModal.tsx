import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/lib/utils';
import type { CustomerSubscription } from '@/types/database';
import { Calendar, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExtendPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: CustomerSubscription | null;
  customerName: string;
  onExtend: (params: {
    subscriptionId: string;
    days?: number;
    customEndDate?: string;
  }) => Promise<void>;
}

export const ExtendPlanModal: React.FC<ExtendPlanModalProps> = ({
  isOpen,
  onClose,
  subscription,
  customerName,
  onExtend,
}) => {
  const [selectedDays, setSelectedDays] = useState<number | 'custom'>(30);
  const [customDate, setCustomDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!subscription) return null;

  const calculateNewEndDate = () => {
    if (selectedDays === 'custom') {
      return customDate ? new Date(customDate).toISOString() : null;
    }
    const currentEnd = new Date(subscription.end_date);
    const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
    const newEnd = new Date(baseDate.getTime() + selectedDays * 24 * 60 * 60 * 1000);
    return newEnd.toISOString();
  };

  const newEndDate = calculateNewEndDate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays === 'custom' && !customDate) {
      setError('Please select a custom extension date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (selectedDays === 'custom') {
        await onExtend({
          subscriptionId: subscription.id,
          customEndDate: new Date(customDate).toISOString(),
        });
      } else {
        await onExtend({
          subscriptionId: subscription.id,
          days: selectedDays,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to extend subscription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Extend Plan Validity – ${customerName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Validity Box */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Current Expiry Date
            </span>
            <span className="text-sm font-bold text-white mt-0.5">
              {formatDate(subscription.end_date)}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              new Date(subscription.end_date) < new Date()
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {new Date(subscription.end_date) < new Date() ? 'Expired' : 'Active'}
          </span>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col space-y-2">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Select Extension Period
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[7, 15, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDays(d)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                  selectedDays === d
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>+{d} Days</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedDays(365)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                selectedDays === 365
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span>+1 Year (365 Days)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDays('custom')}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                selectedDays === 'custom'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400 shadow-sm'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span>Custom Date...</span>
            </button>
          </div>
        </div>

        {/* Custom Date Input if selected */}
        {selectedDays === 'custom' && (
          <div className="pt-1 animate-fadeIn">
            <Input
              label="Select New Expiry Date"
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
              required
            />
          </div>
        )}

        {/* New Validity Preview */}
        {newEndDate && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-300">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div className="text-xs">
              <span className="text-emerald-400 font-semibold block">New Plan Expiry Date:</span>
              <span className="font-extrabold text-sm text-white">
                {formatDate(newEndDate)}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            isLoading={isSubmitting}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Confirm Extension
          </Button>
        </div>
      </form>
    </Modal>
  );
};
