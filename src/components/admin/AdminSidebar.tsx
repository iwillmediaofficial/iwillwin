import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Megaphone,
  Gift,
  Users,
  Settings,
  LogOut,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminSidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { adminProfile, signOut } = useAuth();

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
    { to: '/admin/prizes', label: 'Prize Configuration', icon: Gift },
    { to: '/admin/leads', label: 'Leads & Winners', icon: Users },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

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
                ADMIN CONSOLE
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
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm'
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
      <div className="pt-4 border-t border-slate-800 flex flex-col space-y-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-300 hover:bg-slate-800/50 transition-colors"
        >
          <span>Open Public Game</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col truncate pr-2">
            <span className="text-xs font-semibold text-white truncate">
              {adminProfile?.email || 'Administrator'}
            </span>
            <span className="text-[10px] text-amber-400/90 capitalize">
              {adminProfile?.role || 'Admin'}
            </span>
          </div>

          <button
            onClick={() => signOut()}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
