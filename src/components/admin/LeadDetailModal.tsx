import React, { useState } from 'react';
import type { Lead } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/lib/utils';
import {
  Phone,
  Mail,
  Megaphone,
  Gift,
  Calendar,
  Clock,
  Globe,
  Cake,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const [copied, setCopied] = useState(false);

  if (!lead) return null;

  const handleCopyCode = () => {
    if (lead.claim_code) {
      navigator.clipboard.writeText(lead.claim_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Participant Details"
      description="Detailed participation and prize allocation record."
      maxWidth="md"
    >
      <div className="flex flex-col space-y-4 pt-1">
        {/* User Card */}
        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-bold text-slate-950 text-lg shadow-sm">
            {lead.name ? lead.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-white truncate">
              {lead.name || 'Anonymous Player'}
            </h4>
            <div className="flex items-center space-x-2 mt-0.5">
              <Badge status={lead.scratch_status} />
              <span className="text-[11px] text-slate-400">ID: {lead.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Winning Claim Code Card */}
        {lead.claim_code && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex flex-col text-left pl-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Winning Verification Code</span>
              </span>
              <span className="font-mono font-black text-amber-200 text-base tracking-widest mt-0.5">
                {lead.claim_code}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1 text-xs font-semibold"
              title="Copy Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Contact Info & DOB */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Phone className="w-3 h-3 text-amber-400" />
              <span>Mobile</span>
            </span>
            <span className="font-semibold text-slate-200">{lead.mobile || '—'}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Mail className="w-3 h-3 text-amber-400" />
              <span>Email</span>
            </span>
            <span className="font-semibold text-slate-200 truncate">{lead.email || '—'}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Cake className="w-3 h-3 text-pink-400" />
              <span>Birth Day</span>
            </span>
            <span className="font-semibold text-slate-200">{lead.dob || '—'}</span>
          </div>
        </div>

        {/* Prize & Campaign Info */}
        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Gift className="w-4 h-4 text-amber-400" />
              <span>Assigned Prize</span>
            </span>
            <span className="text-xs font-bold text-amber-300">
              {lead.prize?.name || 'No Prize Allocated'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="flex items-center space-x-1">
              <Megaphone className="w-3.5 h-3.5 text-slate-400" />
              <span>Campaign</span>
            </span>
            <span className="font-semibold text-slate-200">{lead.campaign?.name || '—'}</span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-sky-400" />
              <span>Participated At</span>
            </span>
            <span className="font-medium text-slate-300">{formatDate(lead.participated_at)}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Revealed At</span>
            </span>
            <span className="font-medium text-slate-300">{formatDate(lead.revealed_at)}</span>
          </div>
        </div>

        {/* Device & Client Info */}
        {lead.user_agent && (
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex flex-col space-y-1">
            <span className="font-semibold text-slate-300 flex items-center space-x-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Client User Agent</span>
            </span>
            <p className="text-slate-500 font-mono break-all line-clamp-2">{lead.user_agent}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
