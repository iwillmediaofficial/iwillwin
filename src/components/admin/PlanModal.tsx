import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import type { SubscriptionPlan } from '@/types/database';
import { Plus, X, Layers, CheckCircle2 } from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (planData: {
    name: string;
    slug: string;
    description: string;
    duration_days: number;
    price: number;
    currency: string;
    max_campaigns: number;
    max_leads: number;
    features: string[];
    is_active: boolean;
    display_order: number;
  }) => Promise<void>;
  initialData?: SubscriptionPlan | null;
}

const DEFAULT_FEATURE_SUGGESTIONS = [
  'Custom Brand Logo',
  'WhatsApp Winner Redemption',
  'Instagram Follow Gate Growth',
  'Excel / CSV Data Export',
  'Detailed Participant Analytics',
  'Custom Prize Shuffling Algorithm',
  'Priority 24/7 Technical Support',
];

export const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(1999);
  const [currency, setCurrency] = useState('INR');
  const [maxCampaigns, setMaxCampaigns] = useState(1);
  const [maxLeads, setMaxLeads] = useState(1000);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setSlug(initialData.slug || '');
        setDescription(initialData.description || '');
        setDurationDays(initialData.duration_days || 30);
        setPrice(initialData.price || 0);
        setCurrency(initialData.currency || 'INR');
        setMaxCampaigns(initialData.max_campaigns ?? 1);
        setMaxLeads(initialData.max_leads ?? 1000);
        setFeatures(Array.isArray(initialData.features) ? initialData.features : []);
        setIsActive(initialData.is_active ?? true);
        setDisplayOrder(initialData.display_order ?? 0);
      } else {
        setName('');
        setSlug('');
        setDescription('');
        setDurationDays(30);
        setPrice(1999);
        setCurrency('INR');
        setMaxCampaigns(1);
        setMaxLeads(1000);
        setFeatures([
          '1 Active Campaign',
          'Up to 1,000 Leads',
          'Custom Brand Logo & WhatsApp Claim',
          'Excel / CSV Data Export',
        ]);
        setIsActive(true);
        setDisplayOrder(0);
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData) {
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleAddFeature = (feat: string) => {
    const trimmed = feat.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setFeatures([...features, trimmed]);
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a plan name.');
      return;
    }
    if (!slug.trim()) {
      setError('Please provide a unique slug.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        duration_days: Number(durationDays),
        price: Number(price),
        currency,
        max_campaigns: Number(maxCampaigns),
        max_leads: Number(maxLeads),
        features,
        is_active: isActive,
        display_order: Number(displayOrder),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Plan Name & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Plan Name"
            placeholder="e.g. Festive Growth 90-Day Plan"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
          <Input
            label="Plan Slug (Identifier)"
            placeholder="e.g. festive-growth-90"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Description
          </label>
          <textarea
            rows={2}
            className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700/80 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            placeholder="Brief description of this plan and ideal customer target..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Duration, Price, Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Duration (Days)"
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            required
            helperText="e.g. 30, 90, 365 days"
          />
          <Input
            label="Price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            required
            helperText="Billing amount in currency"
          />
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Currency
            </label>
            <select
              className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED (د.إ)</option>
            </select>
          </div>
        </div>

        {/* Quotas: Max Campaigns & Max Leads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Max Active Campaigns"
            type="number"
            min={-1}
            value={maxCampaigns}
            onChange={(e) => setMaxCampaigns(Number(e.target.value))}
            required
            helperText="-1 for unlimited, or e.g. 1, 3, 5"
          />
          <Input
            label="Max Leads / Participants"
            type="number"
            min={-1}
            value={maxLeads}
            onChange={(e) => setMaxLeads(Number(e.target.value))}
            required
            helperText="-1 for unlimited, or e.g. 1000, 5000"
          />
        </div>

        {/* Plan Features Manager */}
        <div className="flex flex-col space-y-2 p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
          <label className="text-xs font-bold text-slate-300 tracking-wider uppercase flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Plan Highlights & Features</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              {features.length} features listed
            </span>
          </label>

          {/* Feature input */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Type a feature and click Add..."
              className="flex-1 bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddFeature(newFeatureText);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddFeature(newFeatureText)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add</span>
            </Button>
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {DEFAULT_FEATURE_SUGGESTIONS.filter((s) => !features.includes(s)).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => handleAddFeature(sug)}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 transition-colors"
              >
                + {sug}
              </button>
            ))}
          </div>

          {/* Current features list */}
          <div className="flex flex-wrap gap-2 pt-2">
            {features.map((feat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs px-2.5 py-1 rounded-xl"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{feat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(idx)}
                  className="text-slate-400 hover:text-rose-400 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Display Order & Active Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
          <Input
            label="Display Order Priority"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
            helperText="Lower numbers appear first"
          />

          <label className="flex items-center space-x-3 text-sm text-slate-200 cursor-pointer pt-4">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
            />
            <span className="font-semibold">Plan is Active & Visible to Customers</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" isLoading={isSubmitting}>
            {initialData ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
