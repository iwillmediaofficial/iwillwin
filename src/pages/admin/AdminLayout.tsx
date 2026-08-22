import React, { useState, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Sparkles, X, Loader2 } from 'lucide-react';

const AdminContentFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
    <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs animate-pulse">
      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
      <span>Loading View...</span>
    </div>
  </div>
);

export const AdminLayout: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initial Full Screen Loader only on first boot
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex items-center space-x-3 text-amber-400 font-semibold animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin-slow" />
          <span>Verifying Admin Credentials...</span>
        </div>
      </div>
    );
  }

  // Guard: Must be authenticated and have admin role
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col lg:flex-row overflow-x-hidden">
      {/* Desktop Sidebar (Persistent & Fixed) */}
      <div className="hidden lg:block w-64 flex-shrink-0 h-screen sticky top-0">
        <AdminSidebar />
      </div>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-slate-900 h-full z-10 shadow-2xl flex flex-col">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area with isolated Suspense boundary to prevent sidebar flashing */}
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<AdminContentFallback />}>
          <Outlet context={{ openMobileMenu: () => setMobileMenuOpen(true) }} />
        </Suspense>
      </div>
    </div>
  );
};
