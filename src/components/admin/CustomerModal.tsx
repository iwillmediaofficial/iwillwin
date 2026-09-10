import React, { useState, useEffect } from 'react';
import type { Customer } from '@/types/database';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { uploadCampaignAsset, adminUpdateCustomer } from '@/lib/supabase';
import { CustomerLogo } from '@/components/admin/CustomerLogo';
import { Building2, User, Mail, Phone, MapPin, FileText, Upload, Sparkles } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: {
    company_name: string;
    contact_person: string;
    email: string;
    phone?: string | null;
    logo_url?: string | null;
    address?: string | null;
    notes?: string | null;
    status: 'Active' | 'Inactive';
  }) => Promise<void>;
  initialData?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    logo_url: '',
    address: '',
    notes: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoSaveStatus, setLogoSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setLogoSaveStatus(null);
    if (initialData) {
      setFormData({
        company_name: initialData.company_name || '',
        contact_person: initialData.contact_person || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        logo_url: initialData.logo_url || '',
        address: initialData.address || '',
        notes: initialData.notes || '',
        status: initialData.status || 'Active',
      });
    } else {
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        logo_url: '',
        address: '',
        notes: '',
        status: 'Active',
      });
    }
  }, [initialData, isOpen]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setLogoSaveStatus(null);
    try {
      const publicUrl = await uploadCampaignAsset(file, 'logos');
      if (publicUrl) {
        setFormData((prev) => ({ ...prev, logo_url: publicUrl }));
        if (initialData?.id) {
          const res = await adminUpdateCustomer(initialData.id, { logo_url: publicUrl });
          if (res.success) {
            setLogoSaveStatus('✓ Logo saved to profile');
          } else {
            setLogoSaveStatus('✓ Logo attached — click Update Customer to save');
          }
        } else {
          setLogoSaveStatus('✓ Logo attached — click Create Customer to save');
        }
      } else {
        alert('Failed to upload customer logo. Please try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setFormData((prev) => ({ ...prev, logo_url: '' }));
    if (initialData?.id) {
      await adminUpdateCustomer(initialData.id, { logo_url: null });
      setLogoSaveStatus('✓ Logo removed');
    } else {
      setLogoSaveStatus(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) {
      alert('Please enter a company name.');
      return;
    }
    if (!formData.contact_person.trim()) {
      alert('Please enter a contact person name.');
      return;
    }
    if (!formData.email.trim()) {
      alert('Please enter a contact email.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        company_name: formData.company_name.trim(),
        contact_person: formData.contact_person.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        logo_url: formData.logo_url.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? `Edit Customer: ${initialData.company_name}` : 'Create New Customer'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company / Customer Name *"
              placeholder="e.g. Woodysbrook Resort"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              leftIcon={<Building2 className="w-4 h-4 text-amber-400" />}
              required
            />

            <Input
              label="Contact Person *"
              placeholder="e.g. Rahul Nair"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              leftIcon={<User className="w-4 h-4 text-amber-400" />}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Email *"
              type="email"
              placeholder="e.g. client@company.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4 text-amber-400" />}
              required
            />

            <Input
              label="Phone Number"
              placeholder="e.g. +91 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              leftIcon={<Phone className="w-4 h-4 text-amber-400" />}
            />
          </div>
        </div>

        {/* Logo Upload Section */}
        <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
          <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center justify-between">
            <span>Customer Brand Logo</span>
            {logoSaveStatus ? (
              <span className="text-[11px] text-emerald-400 font-normal">{logoSaveStatus}</span>
            ) : formData.logo_url ? (
              <span className="text-[11px] text-emerald-400 font-normal">✓ Logo Attached</span>
            ) : null}
          </label>

          <div className="flex items-center space-x-4">
            <CustomerLogo
              logoUrl={formData.logo_url}
              name={formData.company_name || 'Customer'}
              className="w-16 h-16"
              roundedClassName="rounded-xl"
              textClassName="text-xl"
            />

            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Image'}</span>
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploadingLogo}
                    className="hidden"
                  />
                </label>

                {formData.logo_url && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Or paste external image URL..."
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400/50"
              />
            </div>
          </div>
        </div>

        {/* Address & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Business Address (Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 123 Resort Road, Wayanad, Kerala"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 tracking-wider uppercase flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Internal Notes (Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. High priority client, VIP support tier"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div>
            <span className="text-sm font-semibold text-white">Customer Account Status</span>
            <p className="text-xs text-slate-400">
              Inactive customers will have their public scratch cards paused.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'Active' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                formData.status === 'Active'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'Inactive' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                formData.status === 'Inactive'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="gold" disabled={isSaving || isUploadingLogo}>
            {isSaving ? (
              <span>Saving Customer...</span>
            ) : initialData ? (
              <span>Update Customer</span>
            ) : (
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Create Customer</span>
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
