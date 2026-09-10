import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Mail, Lock, ShieldCheck, Eye, EyeOff, UserCheck } from 'lucide-react';

interface CustomerUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onSave: (email: string, password: string, role: 'customer_admin' | 'customer_viewer') => Promise<void>;
}

export const CustomerUserModal: React.FC<CustomerUserModalProps> = ({
  isOpen,
  onClose,
  customerName,
  onSave,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer_admin' | 'customer_viewer'>('customer_admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      alert('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(email.trim().toLowerCase(), password, role);
      setEmail('');
      setPassword('');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer user');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add User for ${customerName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <p className="text-xs text-slate-400">
          Create login credentials for this customer. This user will automatically have access to all campaigns under <strong className="text-amber-400">{customerName}</strong>.
        </p>

        <Input
          label="Login Email *"
          type="email"
          placeholder="e.g. manager@woodysbrook.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4 text-amber-400" />}
          required
        />

        <div className="relative">
          <Input
            label="Password (min 6 characters) *"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-amber-400" />}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-slate-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase">
            User Role & Permissions
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('customer_admin')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                role === 'customer_admin'
                  ? 'bg-amber-400/10 border-amber-400/50 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-xs text-amber-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Customer Admin</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Full access to view/edit campaigns, prizes, and export leads.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole('customer_viewer')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                role === 'customer_viewer'
                  ? 'bg-amber-400/10 border-amber-400/50 text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-xs text-blue-400">
                <UserCheck className="w-4 h-4" />
                <span>Customer Viewer</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Read-only access to view campaigns and participant lists.
              </p>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={isSaving}>
            {isSaving ? 'Creating User...' : 'Add Customer User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
