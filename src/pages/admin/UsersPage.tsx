import React, { useEffect, useState } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase, adminGetClients, adminDeleteClient } from '@/lib/supabase';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { UserModal } from '@/components/admin/UserModal';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/lib/utils';
import type { Campaign, ClientUserItem } from '@/types/database';
import {
  UserCheck,
  Plus,
  Search,
  KeyRound,
  Trash2,
  Megaphone,
  Shield,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { isSuperAdmin } = useAuth();

  const [clients, setClients] = useState<ClientUserItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientUserItem | null>(null);

  // If not super admin, redirect to admin dashboard
  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch campaigns for assignments
      const { data: campData } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      setCampaigns((campData as Campaign[]) || []);

      // 2. Fetch clients
      const res = await adminGetClients();
      if (res.success && res.data) {
        setClients(res.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (client: ClientUserItem) => {
    if (client.role === 'super_admin') {
      alert('Super Admin accounts cannot be deleted.');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to revoke access and delete client user "${client.email}"?`
      )
    ) {
      const res = await adminDeleteClient(client.user_id);
      if (!res.success) {
        alert(`Error deleting user: ${res.message}`);
      } else {
        await fetchData();
      }
    }
  };

  const filteredClients = clients.filter((c) =>
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-12">
      <AdminHeader
        title="Client Access & User Management"
        description="Create scoped client accounts and assign them to specific campaigns with confidential access"
        onOpenMobileMenu={openMobileMenu}
        actions={
          <Button
            onClick={() => {
              setEditingClient(null);
              setIsModalOpen(true);
            }}
            variant="gold"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Client User
          </Button>
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex flex-col space-y-6">
        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="text-xs text-slate-400 font-semibold flex items-center space-x-2">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>{filteredClients.length} Accounts Registered</span>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading user accounts...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center">
            <UserCheck className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No client users found</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Create your first client account and assign them to specific campaigns.
            </p>
            <Button
              onClick={() => {
                setEditingClient(null);
                setIsModalOpen(true);
              }}
              variant="gold"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Client User
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-950/90 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User / Email</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Campaigns</th>
                  <th className="py-3.5 px-4 font-semibold">Created Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredClients.map((client) => {
                  const isSuper = client.role === 'super_admin';

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-slate-950 text-sm shadow-sm ${
                              isSuper
                                ? 'bg-gradient-to-tr from-amber-500 to-yellow-300'
                                : 'bg-gradient-to-tr from-sky-400 to-indigo-400 text-white'
                            }`}
                          >
                            {client.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{client.email}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ID: {client.user_id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuper ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full">
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span>Super Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-full">
                            <UserCheck className="w-3 h-3 text-sky-400" />
                            <span>Client User</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuper ? (
                          <span className="text-xs font-semibold text-amber-300">
                            All Campaigns (Full Platform Access)
                          </span>
                        ) : client.assigned_campaigns.length === 0 ? (
                          <span className="text-xs text-rose-400 italic">No campaigns assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {client.assigned_campaigns.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-lg"
                              >
                                <Megaphone className="w-3 h-3 text-amber-400" />
                                <span className="truncate max-w-[150px]">{c.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {formatDate(client.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {!isSuper && (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingClient(client);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Assignments / Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(client)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Revoke & Delete Client"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        campaigns={campaigns}
        initialData={editingClient}
      />
    </div>
  );
};
