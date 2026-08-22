import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Megaphone,
  Gift,
  Users,
  UserCheck,
  Settings,
  LogOut,
  Sparkles,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminSidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { adminProfile, isSuperAdmin, signOut } = useAuth();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
    { to: '/admin/prizes', label: 'Prize Configuration', icon: Gift },
    { to: '/admin/leads', label: 'Leads & Winners', icon: Users },
  ];

  // Only Super Admins can manage Client Users and Global Settings
  if (isSuperAdmin) {
    navItems.push({ to: '/admin/users', label: 'Client Access & Users', icon: UserCheck, end: false });
    navItems.push({ to: '/admin/settings', label: 'Settings', icon: Settings, end: false });
  }

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between h-full p-4 select-none">
      {/* Brand Header */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-glow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white tracking-wider font-display leading-none">
                IWILLWIN
              </h2>
              <span className="text-[10px] text-amber-400 font-semibold tracking-widest uppercase">
                {isSuperAdmin ? 'SUPER ADMIN' : 'CLIENT PORTAL'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-amber-400/10 text-amber-300 border border-amber-400/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-col space-y-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-950/60 hover:bg-slate-800/80 rounded-xl border border-slate-800 transition-colors"
        >
          <span>View Public Game</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-bold text-white truncate">
              {adminProfile?.email || 'Admin'}
            </span>
            <span className="text-[10px] text-amber-400/90 font-medium flex items-center space-x-1">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>{isSuperAdmin ? 'Super Administrator' : 'Client Manager'}</span>
            </span>
          </div>

          <button
            onClick={() => signOut()}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
