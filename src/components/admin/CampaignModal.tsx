import React, { useState, useEffect } from 'react';
import type { Campaign, CampaignStatus } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import { uploadCampaignAsset } from '@/lib/supabase';
import { Upload, Calendar, Settings2 } from 'lucide-react';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaignData: Partial<Campaign>) => Promise<void>;
  initialData?: Campaign | null;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
    instagram_url: 'https://instagram.com',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: 'Active' as CampaignStatus,
    require_name: true,
    require_mobile: true,
    require_email: false,
    unique_mobile: true,
    unique_email: false,
    scratch_title: 'Scratch to Reveal Your Exclusive Reward',
    success_message: '🎉 CONGRATULATIONS! You unlocked an exclusive prize!',
    result_message: 'Take a screenshot of this card to redeem your reward with our team.',
    cta_text: 'Claim Prize on WhatsApp',
    cta_url: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        start_date: initialData.start_date
          ? new Date(initialData.start_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        end_date: initialData.end_date
          ? new Date(initialData.end_date).toISOString().slice(0, 16)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        logo_url: '',
        banner_url: '',
        instagram_url: 'https://instagram.com',
        start_date: new Date().toISOString().slice(0, 16),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        status: 'Active' as CampaignStatus,
        require_name: true,
        require_mobile: true,
        require_email: false,
        unique_mobile: true,
        unique_email: false,
        scratch_title: 'Scratch to Reveal Your Exclusive Reward',
        success_message: '🎉 CONGRATULATIONS! You unlocked an exclusive prize!',
        result_message: 'Take a screenshot of this card to redeem your reward with our team.',
        cta_text: 'Claim Prize on WhatsApp',
        cta_url: '',
      });
    }
  }, [initialData, isOpen]);

  const handleNameChange = (nameVal: string) => {
    const autoSlug = nameVal
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: initialData ? prev.slug : autoSlug,
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingLogo(true);
      const url = await uploadCampaignAsset(e.target.files[0], 'logos');
      setIsUploadingLogo(false);
      if (url) {
        setFormData((prev) => ({ ...prev, logo_url: url }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Campaign' : 'Create New Campaign'}
      description="Configure promotional details, dates, validation rules, and Instagram action."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Campaign Name"
            placeholder="e.g. Diwali Super Scratch & Win"
            value={formData.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />

          <Input
            label="URL Slug (/c/:slug)"
            placeholder="e.g. diwali-2026"
            value={formData.slug || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            required
          />
        </div>

        <div className="w-full flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            Description
          </label>
          <textarea
            className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 p-3 text-sm min-h-[75px] focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            placeholder="Explain campaign rewards, terms, and excitement to players..."
            value={formData.description || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Logo & Instagram Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Brand Logo URL
            </label>
            <div className="flex space-x-2">
              <input
                className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                placeholder="https://.../logo.png"
                value={formData.logo_url || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
              />
              <label className="cursor-pointer p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                />
              </label>
            </div>
            {isUploadingLogo && <span className="text-[11px] text-amber-400">Uploading image...</span>}
          </div>

          <Input
            label="Instagram Profile URL"
            placeholder="https://instagram.com/your_handle"
            value={formData.instagram_url || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))}
            leftIcon={<InstagramIcon className="w-4 h-4 text-pink-500" />}
            required
          />
        </div>

        {/* Dates & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="datetime-local"
            value={formData.start_date || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
            required
          />

          <Input
            label="End Date"
            type="datetime-local"
            value={formData.end_date || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
            required
          />

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
              Campaign Status
            </label>
            <select
              className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
              value={formData.status || 'Active'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value as CampaignStatus }))
              }
            >
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Paused">Paused</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Validation & Duplicate Rules */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Settings2 className="w-4 h-4 text-amber-400" />
            <span>Form & Duplicate Validation Rules</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, require_name: e.target.checked }))}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Require Full Name</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_mobile}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, require_mobile: e.target.checked }))
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Require Mobile Number</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, require_email: e.target.checked }))
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Require Email Address</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.unique_mobile}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unique_mobile: e.target.checked }))
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Unique Mobile (1 Entry Per Mobile)</span>
            </label>
          </div>
        </div>

        {/* Custom Winning Copy & Call-to-Action */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Claim CTA Button Text"
            placeholder="Claim on WhatsApp"
            value={formData.cta_text || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
          />

          <Input
            label="Claim Action URL"
            placeholder="https://wa.me/... or https://yoursite.com"
            value={formData.cta_url || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, cta_url: e.target.value }))}
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" isLoading={isSaving}>
            {initialData ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
