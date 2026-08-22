import React from 'react';
import { Menu } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  description?: string;
  onOpenMobileMenu: () => void;
  actions?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  description,
  onOpenMobileMenu,
  actions,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display flex items-center space-x-2">
            <span>{title}</span>
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center space-x-2.5">{actions}</div>}
    </header>
  );
};
