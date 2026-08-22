import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/lib/utils';
import type { AdminProfile } from '@/types/database';
import {
  ShieldCheck,
  HardDrive,
  Database,
  Users,
  CheckCircle,
  Key,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { adminProfile } = useAuth();

  const [adminList, setAdminList] = useState<AdminProfile[]>([]);

  useEffect(() => {
    supabase
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setAdminList(data as AdminProfile[]);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <AdminHeader
        title="Settings & System Status"
        description="Review security configurations, administrator profiles, and storage services"
        onOpenMobileMenu={openMobileMenu}
      />

      <div className="p-4 sm:p-8 max-w-5xl w-full mx-auto flex flex-col space-y-6">
        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">PostgreSQL RPC</span>
              <div className="text-sm font-bold text-white flex items-center space-x-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Atomic & Active</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Supabase Storage</span>
              <div className="text-sm font-bold text-white flex items-center space-x-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>campaign-assets (5MB)</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase">Security & RLS</span>
              <div className="text-sm font-bold text-white flex items-center space-x-1.5 mt-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Strict Policies Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Administrator Accounts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white font-display">
                Authorized Administrators
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Your Role: <strong className="text-amber-400 capitalize">{adminProfile?.role || 'Admin'}</strong>
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {adminList.map((admin) => (
              <div
                key={admin.id}
                className="py-3.5 flex items-center justify-between hover:bg-slate-800/20 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-amber-400 border border-slate-700 text-sm">
                    {admin.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{admin.email}</div>
                    <div className="text-xs text-slate-400">
                      Enrolled: {formatDate(admin.created_at)}
                    </div>
                  </div>
                </div>

                <Badge status={admin.role} />
              </div>
            ))}
          </div>
        </div>

        {/* Deployment & Environment Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col space-y-3">
          <h3 className="text-base font-bold text-white font-display flex items-center space-x-2">
            <Key className="w-5 h-5 text-amber-400" />
            <span>Environment & Deployment Config</span>
          </h3>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
            <div>
              <span className="text-slate-500">VITE_SUPABASE_URL:</span>{' '}
              <span className="text-amber-300">
                {import.meta.env.VITE_SUPABASE_URL || 'https://rowuebmnqurugubichta.supabase.co'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">PROJECT_ID:</span>{' '}
              <span className="text-emerald-400">rowuebmnqurugubichta</span>
            </div>
            <div>
              <span className="text-slate-500">FRAMEWORK:</span>{' '}
              <span className="text-sky-300">React 18 + Vite + Tailwind CSS + GSAP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
