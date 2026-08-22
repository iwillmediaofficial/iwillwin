import React, { useState, useEffect } from 'react';
import type { Campaign, ClientUserItem } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { adminCreateClient, adminUpdateClient } from '@/lib/supabase';
import { Mail, Lock, Megaphone, ShieldCheck, AlertCircle } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaigns: Campaign[];
  initialData?: ClientUserItem | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  campaigns,
  initialData,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email);
      setPassword('');
      setSelectedCampaignIds(initialData.assigned_campaigns.map((c) => c.id));
      setError(null);
    } else {
      setEmail('');
      setPassword('');
      setSelectedCampaignIds([]);
      setError(null);
    }
  }, [initialData, isOpen]);

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaignIds((prev) =>
      prev.includes(campaignId) ? prev.filter((id) => id !== campaignId) : [...prev, campaignId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCampaignIds.length === campaigns.length) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(campaigns.map((c) => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }

    if (!initialData && (!password || password.length < 6)) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    try {
      if (initialData) {
        const res = await adminUpdateClient(
          initialData.user_id,
          password.trim() ? password : null,
          selectedCampaignIds
        );
        if (!res.success) {
          throw new Error(res.message || 'Failed to update client user.');
        }
      } else {
        const res = await adminCreateClient(email.trim(), password, selectedCampaignIds);
        if (!res.success) {
          throw new Error(res.message || 'Failed to create client user.');
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving client user.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Client User' : 'Create New Client User'}
      description="Create a scoped client account and assign specific campaigns they can view and manage."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Client Email Address"
          type="email"
          placeholder="client@brand.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={Boolean(initialData)}
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        <Input
          label={initialData ? 'Reset Password (leave empty to keep current)' : 'Account Password'}
          type="password"
          placeholder={initialData ? 'Enter new password...' : 'Minimum 6 characters'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          required={!initialData}
        />

        {/* Campaign Assignments Multi-select */}
        <div className="flex flex-col space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center space-x-1.5">
              <Megaphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Assigned Campaigns</span>
            </label>
            {campaigns.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                {selectedCampaignIds.length === campaigns.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            This client will ONLY have access to view, edit, configure prizes, and download leads for the checked campaigns.
          </p>

          <div className="max-h-48 overflow-y-auto bg-slate-950/70 border border-slate-800 rounded-xl p-3 divide-y divide-slate-800/60 space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">No campaigns found.</p>
            ) : (
              campaigns.map((c) => {
                const isSelected = selectedCampaignIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-900/50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCampaign(c.id)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-semibold text-slate-200 truncate">{c.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                      /c/{c.slug}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Strict Row Level Security ensures this client user cannot see, create, or access any other campaign data.
          </span>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" isLoading={isSaving}>
            {initialData ? 'Save Changes' : 'Create Client User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
