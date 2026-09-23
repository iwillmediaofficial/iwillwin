import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import type { SubscriptionPlan, Customer } from '@/types/database';
import { Calendar, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

interface AssignPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  plans: SubscriptionPlan[];
  onAssign: (data: {
    customerId: string;
    planId: string;
    startDate: string;
    endDate: string;
    maxCampaigns: number;
    pricePaid: number;
    notes: string;
  }) => Promise<void>;
}

export const AssignPlanModal: React.FC<AssignPlanModalProps> = ({
  isOpen,
  onClose,
  customer,
  plans,
  onAssign,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [maxCampaigns, setMaxCampaigns] = useState<number>(1);
  const [pricePaid, setPricePaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const startIso = now.toISOString().slice(0, 16);
      setStartDate(startIso);

      // Default select the first active plan
      const defaultPlan = plans.find((p) => p.is_active) || plans[0];
      if (defaultPlan) {
        setSelectedPlanId(defaultPlan.id);
        const end = new Date(now.getTime() + defaultPlan.duration_days * 24 * 60 * 60 * 1000);
        setEndDate(end.toISOString().slice(0, 16));
        setMaxCampaigns(defaultPlan.max_campaigns);
        setPricePaid(defaultPlan.price);
      }
      setNotes('');
      setError(null);
    }
  }, [isOpen, plans]);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const chosen = plans.find((p) => p.id === planId);
    if (chosen) {
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(start.getTime() + chosen.duration_days * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().slice(0, 16));
      setMaxCampaigns(chosen.max_campaigns);
      setPricePaid(chosen.price);
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    const chosen = plans.find((p) => p.id === selectedPlanId);
    if (chosen && newStart) {
      const start = new Date(newStart);
      const end = new Date(start.getTime() + chosen.duration_days * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().slice(0, 16));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError('Please select a subscription plan.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('Plan expiry date must be after the start date.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onAssign({
        customerId: customer.id,
        planId: selectedPlanId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        maxCampaigns: Number(maxCampaigns),
        pricePaid: Number(pricePaid),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePlanObj = plans.find((p) => p.id === selectedPlanId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Plan to ${customer.company_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Header Info */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block">Customer Workspace</span>
            <span className="font-bold text-white text-sm">{customer.company_name}</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            {customer.status}
          </span>
        </div>

        {/* Select Plan Dropdown */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Select Subscription Plan *
          </label>
          <select
            className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            value={selectedPlanId}
            onChange={(e) => handlePlanSelect(e.target.value)}
            required
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.price.toLocaleString()} ({p.duration_days} Days, {p.max_campaigns} Camps)
              </option>
            ))}
          </select>
        </div>

        {/* Plan Preview Banner */}
        {activePlanObj && (
          <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Standard validity: <strong>{activePlanObj.duration_days} days</strong> | Quota: <strong>{activePlanObj.max_campaigns} campaign(s)</strong>
            </span>
          </div>
        )}

        {/* Start Date & End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Plan Start Date"
            type="datetime-local"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
            required
          />
          <Input
            label="Plan Expiry Date (End Date)"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
            required
            helperText="Customer campaigns cannot exceed this date"
          />
        </div>

        {/* Max Campaigns Quota & Price Paid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Max Active Campaigns"
            type="number"
            min={1}
            value={maxCampaigns}
            onChange={(e) => setMaxCampaigns(Number(e.target.value))}
            required
            helperText="Can override plan default if needed"
          />
          <Input
            label="Price Paid (₹)"
            type="number"
            min={0}
            value={pricePaid}
            onChange={(e) => setPricePaid(Number(e.target.value))}
            required
          />
        </div>

        {/* Payment & Billing Notes */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Payment Notes / Transaction Reference
          </label>
          <textarea
            rows={2}
            className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            placeholder="e.g. Received via Bank Transfer ref #UTR9482928. Activated by Admin."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            isLoading={isSubmitting}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Activate & Assign Plan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
