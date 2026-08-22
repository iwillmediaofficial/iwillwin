import React, { useState, useEffect } from 'react';
import type { Campaign, CampaignStatus } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { InstagramIcon } from '@/components/common/InstagramIcon';
import { uploadCampaignAsset } from '@/lib/supabase';
import { Upload, Calendar, Settings2, MessageCircle, Sparkles } from 'lucide-react';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (campaignData: Partial<Campaign>) => Promise<void>;
  initialData?: Campaign | null;
}

const DEFAULT_MESSAGE_TEMPLATE = `Hi! I won *{prize}* on IWILLWIN! 🎉\nWinning Verification Code: *{code}*\nRegistered Mobile: *{mobile}*\nPlease guide me on how to claim my reward.`;

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
    collect_dob: true,
    require_dob: false,
    whatsapp_claim_number: '',
    whatsapp_message_template: DEFAULT_MESSAGE_TEMPLATE,
    unique_mobile: true,
    unique_email: false,
    scratch_title: 'Scratch to Reveal Your Exclusive Reward',
    success_message: '🎉 CONGRATULATIONS! You unlocked an exclusive prize!',
    result_message: 'Show this card or click the button below to redeem with our team.',
    cta_text: 'Claim on WhatsApp',
    cta_url: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        collect_dob: initialData.collect_dob ?? true,
        require_dob: initialData.require_dob ?? false,
        whatsapp_claim_number: initialData.whatsapp_claim_number || '',
        whatsapp_message_template:
          initialData.whatsapp_message_template || DEFAULT_MESSAGE_TEMPLATE,
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
        collect_dob: true,
        require_dob: false,
        whatsapp_claim_number: '',
        whatsapp_message_template: DEFAULT_MESSAGE_TEMPLATE,
        unique_mobile: true,
        unique_email: false,
        scratch_title: 'Scratch to Reveal Your Exclusive Reward',
        success_message: '🎉 CONGRATULATIONS! You unlocked an exclusive prize!',
        result_message: 'Show this card or click the button below to redeem with our team.',
        cta_text: 'Claim on WhatsApp',
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
      try {
        const url = await uploadCampaignAsset(e.target.files[0], 'logos');
        if (url) {
          setFormData((prev) => ({ ...prev, logo_url: url }));
        }
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      whatsapp_message_template: `${prev.whatsapp_message_template || ''} ${variable}`,
    }));
  };

  // Generate live sample preview based on user's editable template
  const getLivePreview = () => {
    const template = formData.whatsapp_message_template || DEFAULT_MESSAGE_TEMPLATE;
    return template
      .replace(/\{prize\}|\{\{prize\}\}|\{\{prize_name\}\}/gi, '₹500 Gift Voucher')
      .replace(/\{code\}|\{\{code\}\}|\{\{claim_code\}\}/gi, 'WIN-8K9F2A1B')
      .replace(/\{mobile\}|\{\{mobile\}\}|\{\{phone\}\}/gi, '+91 98765 43210')
      .replace(/\{name\}|\{\{name\}\}/gi, 'Rahul Sharma');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.slug?.trim()) {
      alert('Please fill campaign title and slug.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        start_date: new Date(formData.start_date!).toISOString(),
        end_date: new Date(formData.end_date!).toISOString(),
      });
      onClose();
    } catch (err: any) {
      alert(`Error saving campaign: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Campaign' : 'Create New Campaign'}
      description="Configure promotional details, validation rules, and custom WhatsApp prize claiming template."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 pt-2">
        {/* Campaign Name & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Campaign Title"
            placeholder="e.g. Grand Festival Scratch & Win"
            value={formData.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />

          <Input
            label="URL Slug (/c/your-slug)"
            placeholder="e.g. grand-launch"
            value={formData.slug || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              }))
            }
            required
          />
        </div>

        {/* Description */}
        <div className="flex flex-col space-y-1.5">
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
              className="w-full bg-slate-900 text-slate-100 rounded-xl border border-slate-700 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 cursor-pointer"
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

        {/* Participant Requirements & Date of Birth Settings */}
        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Settings2 className="w-4 h-4 text-amber-400" />
            <span>Participant Information Requirements</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-center space-x-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.require_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, require_name: e.target.checked }))}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Require Full Name</span>
            </label>

            <label className="flex items-center space-x-2.5 text-slate-300 cursor-pointer">
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

            <label className="flex items-center space-x-2.5 text-slate-300 cursor-pointer">
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

            <label className="flex items-center space-x-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.unique_mobile}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, unique_mobile: e.target.checked }))
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Unique Mobile (1 Entry Per Phone)</span>
            </label>

            {/* Date of Birth Controls */}
            <label className="flex items-center space-x-2.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.collect_dob}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    collect_dob: e.target.checked,
                    require_dob: e.target.checked ? prev.require_dob : false,
                  }))
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span className="font-semibold text-amber-300">Collect Date of Birth (Day & Month)</span>
            </label>

            <label
              className={`flex items-center space-x-2.5 cursor-pointer ${
                !formData.collect_dob ? 'opacity-40 pointer-events-none' : 'text-slate-300'
              }`}
            >
              <input
                type="checkbox"
                disabled={!formData.collect_dob}
                checked={formData.require_dob}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, require_dob: e.target.checked }))
                }
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>Make Date of Birth Mandatory</span>
            </label>
          </div>
        </div>

        {/* Customizable WhatsApp Prize Claiming */}
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex flex-col space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Custom WhatsApp Prize Claiming</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Customizable Template
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="WhatsApp Number (with Country Code)"
              placeholder="e.g. 919876543210"
              value={formData.whatsapp_claim_number || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  whatsapp_claim_number: e.target.value.replace(/[^0-9+]/g, ''),
                  cta_text: prev.cta_text || 'Claim on WhatsApp',
                }))
              }
              leftIcon={<MessageCircle className="w-4 h-4 text-emerald-400" />}
            />

            <Input
              label="Claim Button Text"
              placeholder="Claim on WhatsApp"
              value={formData.cta_text || 'Claim on WhatsApp'}
              onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
            />
          </div>

          {/* Editable WhatsApp Message Template */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
                WhatsApp Message Template
              </label>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Insert Variable:</span>
                <button
                  type="button"
                  onClick={() => insertVariable('{prize}')}
                  className="text-[10px] bg-slate-800 hover:bg-emerald-500/20 text-amber-300 hover:text-emerald-300 px-2 py-0.5 rounded border border-slate-700 font-mono transition-colors"
                >
                  +{'{prize}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{code}')}
                  className="text-[10px] bg-slate-800 hover:bg-emerald-500/20 text-amber-300 hover:text-emerald-300 px-2 py-0.5 rounded border border-slate-700 font-mono transition-colors"
                >
                  +{'{code}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{mobile}')}
                  className="text-[10px] bg-slate-800 hover:bg-emerald-500/20 text-amber-300 hover:text-emerald-300 px-2 py-0.5 rounded border border-slate-700 font-mono transition-colors"
                >
                  +{'{mobile}'}
                </button>
                <button
                  type="button"
                  onClick={() => insertVariable('{name}')}
                  className="text-[10px] bg-slate-800 hover:bg-emerald-500/20 text-amber-300 hover:text-emerald-300 px-2 py-0.5 rounded border border-slate-700 font-mono transition-colors"
                >
                  +{'{name}'}
                </button>
              </div>
            </div>

            <textarea
              className="w-full bg-slate-900 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 p-3 text-xs font-mono min-h-[95px] focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 leading-relaxed"
              placeholder="Hi! I won *{prize}* on IWILLWIN!..."
              value={formData.whatsapp_message_template || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, whatsapp_message_template: e.target.value }))
              }
            />
          </div>

          {/* Live Interactive Preview Box */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-emerald-500/30 text-xs text-slate-300 flex flex-col space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Live WhatsApp Message Preview</span>
              </span>
              <span className="text-[10px] text-slate-500 italic">Sample winner preview</span>
            </div>
            <div className="text-slate-200 font-mono text-[11px] bg-slate-900/90 p-3 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-wrap">
              {getLivePreview()}
            </div>
          </div>

          {/* Fallback Custom URL */}
          <Input
            label="Fallback / Custom Claim URL (Optional)"
            placeholder="https://yourstore.com/redeem or leave blank for WhatsApp"
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
