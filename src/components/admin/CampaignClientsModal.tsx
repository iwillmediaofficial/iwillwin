import React, { useState, useEffect } from 'react';
import type { Campaign, ClientUserItem } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { adminSetCampaignClients } from '@/lib/supabase';
import { ShieldCheck, AlertCircle, Users } from 'lucide-react';

interface CampaignClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign: Campaign | null;
  clients: ClientUserItem[];
}

export const CampaignClientsModal: React.FC<CampaignClientsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  campaign,
  clients,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter only client users (exclude super admins since they have root access automatically)
  const clientUsers = clients.filter((c) => c.role === 'client');

  useEffect(() => {
    if (campaign && isOpen) {
      // Find all client user_ids that have this campaign assigned
      const assignedUserIds = clientUsers
        .filter((client) => client.assigned_campaigns.some((c) => c.id === campaign.id))
        .map((client) => client.user_id);

      setSelectedUserIds(assignedUserIds);
      setError(null);
    }
  }, [campaign, clients, isOpen]);

  if (!campaign) return null;

  const toggleClient = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === clientUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(clientUsers.map((c) => c.user_id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const res = await adminSetCampaignClients(campaign.id, selectedUserIds);
      if (!res.success) {
        throw new Error(res.message || 'Failed to update client access.');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating client access.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Clients to Campaign"
      description={`Manage which client accounts have confidential access to "${campaign.name}".`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Campaign Info Card */}
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h4 className="text-xs font-bold text-white truncate">{campaign.name}</h4>
            <span className="text-[11px] font-mono text-amber-300">/c/{campaign.slug}</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">
            {campaign.status}
          </span>
        </div>

        {/* Client Users Checklist */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Registered Client Users</span>
            </label>
            {clientUsers.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                {selectedUserIds.length === clientUsers.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Check the client users who should be allowed to view this campaign, edit details, manage prizes, and view/export leads.
          </p>

          <div className="max-h-52 overflow-y-auto bg-slate-950/70 border border-slate-800 rounded-xl p-3 divide-y divide-slate-800/60 space-y-2">
            {clientUsers.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                No client user accounts registered yet.
                <br />
                <span className="text-slate-400">
                  Create client users in the "Client Access & Users" tab.
                </span>
              </div>
            ) : (
              clientUsers.map((client) => {
                const isSelected = selectedUserIds.includes(client.user_id);
                return (
                  <label
                    key={client.id}
                    className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-900/50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClient(client.user_id)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                      />
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {client.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 truncate block">
                          {client.email}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isSelected ? 'Has Access' : 'No Access'}
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
            Only selected clients will be granted access. Unchecked clients will have zero visibility into this campaign and its leads.
          </span>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            isLoading={isSaving}
            disabled={clientUsers.length === 0}
          >
            Save Client Access
          </Button>
        </div>
      </form>
    </Modal>
  );
};
