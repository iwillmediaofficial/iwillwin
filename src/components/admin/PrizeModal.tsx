import React, { useState, useEffect } from 'react';
import type { Prize, Campaign } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { uploadCampaignAsset } from '@/lib/supabase';
import { Upload, Gift, Calculator } from 'lucide-react';

interface PrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prizeData: Partial<Prize>) => Promise<void>;
  campaigns: Campaign[];
  initialData?: Prize | null;
  defaultCampaignId?: string;
}

export const PrizeModal: React.FC<PrizeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  campaigns,
  initialData,
  defaultCampaignId,
}) => {
  const [formData, setFormData] = useState<Partial<Prize>>({
    campaign_id: defaultCampaignId || (campaigns[0]?.id ?? ''),
    name: '',
    description: '',
    image_url: '',
    allocated_quantity: 100,
    supplied_quantity: 0,
    remaining_quantity: 100,
    maximum_limit: 100,
    daily_limit: 50,
    hourly_limit: 10,
    weight: 10,
    display_order: 0,
    is_active: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        campaign_id: defaultCampaignId || (campaigns[0]?.id ?? ''),
        name: '',
        description: '',
        image_url: '',
        allocated_quantity: 100,
        supplied_quantity: 0,
        remaining_quantity: 100,
        maximum_limit: 100,
        daily_limit: 50,
        hourly_limit: 10,
        weight: 10,
        display_order: 0,
        is_active: true,
      });
    }
  }, [initialData, defaultCampaignId, campaigns, isOpen]);

  // Safe inventory calculation formula: Remaining = Allocated - Supplied
  const handleAllocatedChange = (val: number) => {
    const allocated = Math.max(0, val);
    const supplied = formData.supplied_quantity || 0;
    const remaining = Math.max(0, allocated - supplied);

    setFormData((prev) => ({
      ...prev,
      allocated_quantity: allocated,
      remaining_quantity: remaining,
      maximum_limit: prev.maximum_limit || allocated,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingImg(true);
      const url = await uploadCampaignAsset(e.target.files[0], 'prizes');
      setIsUploadingImg(false);
      if (url) {
        setFormData((prev) => ({ ...prev, image_url: url }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Ensure remaining calculation is accurate before sending to DB constraint
      const allocated = Number(formData.allocated_quantity) || 0;
      const supplied = Number(formData.supplied_quantity) || 0;
      const remaining = allocated - supplied;

      if (remaining < 0) {
        alert('Allocated quantity cannot be less than already supplied quantity.');
        return;
      }

      await onSave({
        ...formData,
        allocated_quantity: allocated,
        supplied_quantity: supplied,
        remaining_quantity: remaining,
        maximum_limit: Number(formData.maximum_limit) || allocated,
        daily_limit: Number(formData.daily_limit) || 0,
        hourly_limit: Number(formData.hourly_limit) || 0,
        weight: Number(formData.weight) || 0,
        display_order: Number(formData.display_order) || 0,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Prize' : 'Add New Prize'}
      description="Configure prize details, inventory quotas, daily/hourly limits, and winning probability weight."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Campaign Selection */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Target Campaign
          </label>
          <select
            className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            value={formData.campaign_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, campaign_id: e.target.value }))}
            required
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.slug})
              </option>
            ))}
          </select>
        </div>

        {/* Prize Name & Image */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prize Name"
            placeholder="e.g. ₹300 Cashback"
            value={formData.name || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            leftIcon={<Gift className="w-4 h-4 text-amber-400" />}
            required
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Prize Image URL
            </label>
            <div className="flex space-x-2">
              <input
                className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                placeholder="https://.../prize.png"
                value={formData.image_url || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
              />
              <label className="cursor-pointer p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImg}
                />
              </label>
            </div>
            {isUploadingImg && <span className="text-[11px] text-amber-400">Uploading...</span>}
          </div>
        </div>

        {/* Description */}
        <div className="w-full flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Description / Coupon Code
          </label>
          <textarea
            className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 p-3 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            placeholder="Details, promo codes, or terms..."
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Quantities & Inventory Box */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Inventory & Limits</span>
            </span>
            <span className="text-xs text-amber-400 font-mono">
              Remaining: {Math.max(0, (formData.allocated_quantity || 0) - (formData.supplied_quantity || 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Allocated Qty"
              type="number"
              min="0"
              value={formData.allocated_quantity ?? 0}
              onChange={(e) => handleAllocatedChange(parseInt(e.target.value) || 0)}
              required
            />

            <Input
              label="Supplied (Given)"
              type="number"
              min="0"
              value={formData.supplied_quantity ?? 0}
              disabled
              helperText="Auto-tracked on win"
            />

            <Input
              label="Maximum Limit"
              type="number"
              min="0"
              value={formData.maximum_limit ?? 0}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, maximum_limit: parseInt(e.target.value) || 0 }))
              }
              helperText="Absolute cap"
            />
          </div>
        </div>

        {/* Rate Limits & Probability Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Daily Limit"
            type="number"
            min="0"
            value={formData.daily_limit ?? 0}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, daily_limit: parseInt(e.target.value) || 0 }))
            }
            helperText="Max per calendar day"
          />

          <Input
            label="Hourly Limit"
            type="number"
            min="0"
            value={formData.hourly_limit ?? 0}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, hourly_limit: parseInt(e.target.value) || 0 }))
            }
            helperText="Max per rolling hour"
          />

          <Input
            label="Weight (Odds)"
            type="number"
            min="0"
            value={formData.weight ?? 0}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, weight: parseInt(e.target.value) || 0 }))
            }
            helperText="Higher = more likely"
            required
          />
        </div>

        {/* Status & Display Order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
          <Input
            label="Display Order"
            type="number"
            value={formData.display_order ?? 0}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))
            }
          />

          <div className="flex items-center space-x-3 pt-5">
            <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Prize is Active & Available</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" isLoading={isSaving}>
            {initialData ? 'Update Prize' : 'Add Prize'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
