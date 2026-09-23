import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  adminGetPlans,
  adminCreatePlan,
  adminUpdatePlan,
} from '@/lib/supabase';
import type { SubscriptionPlan } from '@/types/database';
import { PlanModal } from '@/components/admin/PlanModal';
import { Button } from '@/components/common/Button';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  Megaphone,
  Users,
  Sparkles,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';

export const PlansPage: React.FC = () => {
  const { isSuperAdmin, adminProfile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const res = await adminGetPlans();
    if (res.success && res.data) {
      setPlans(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (planData: any) => {
    if (editingPlan) {
      const res = await adminUpdatePlan(editingPlan.id, planData);
      if (!res.success) throw new Error(res.message || 'Failed to update plan');
    } else {
      const res = await adminCreatePlan(planData);
      if (!res.success) throw new Error(res.message || 'Failed to create plan');
    }
    await fetchPlans();
  };

  const handleTogglePlanActive = async (plan: SubscriptionPlan) => {
    if (!isSuperAdmin) return;
    const res = await adminUpdatePlan(plan.id, {
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      duration_days: plan.duration_days,
      price: plan.price,
      currency: plan.currency,
      max_campaigns: plan.max_campaigns,
      max_leads: plan.max_leads,
      features: plan.features,
      is_active: !plan.is_active,
      display_order: plan.display_order,
    });
    if (res.success) {
      await fetchPlans();
    }
  };

  const handleRequestPlan = (plan: SubscriptionPlan) => {
    const adminWhatsApp = '918136907666'; // Official IWILLWIN Admin Support Number
    const message = encodeURIComponent(
      `Hello IWILLWIN Team! I am interested in activating or upgrading our account to the *${plan.name}* (₹${plan.price.toLocaleString()} for ${plan.duration_days} days).\nAccount Email: ${adminProfile?.email || 'Customer'}\nPlease assist with activation.`
    );
    window.open(`https://wa.me/${adminWhatsApp}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isSuperAdmin ? 'Subscription Plans Management' : 'Subscription Plans & Tiers'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/30">
              {plans.length} Plans
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isSuperAdmin
              ? 'Configure promotional campaign quotas, validity duration, pricing tiers, and customer features.'
              : 'Choose a subscription plan suited for your upcoming promotional campaigns and brand growth.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPlans}
            disabled={loading}
            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          {isSuperAdmin && (
            <Button
              variant="gold"
              size="md"
              onClick={() => {
                setEditingPlan(null);
                setIsPlanModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse p-6"
            />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Subscription Plans Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {isSuperAdmin
              ? 'Click "Create New Plan" to set up your first subscription tier.'
              : 'No plans are currently active. Please contact support.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, index) => {
            const isFeatured = index === 1; // Highlight middle/growth plan
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 ${
                  isFeatured
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20 border-2 border-amber-400/80 shadow-glow-sm'
                    : 'bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg'
                } ${!plan.is_active ? 'opacity-60' : ''}`}
              >
                {/* Popular Pill */}
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md">
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span>MOST POPULAR</span>
                    </span>
                  </div>
                )}

                <div>
                  {/* Top Bar: Plan Name & Status */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {plan.description || 'Dedicated promotional campaign package.'}
                      </p>
                    </div>

                    {isSuperAdmin && (
                      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsPlanModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pricing Box */}
                  <div className="my-4 pb-4 border-b border-slate-800 flex items-baseline space-x-2">
                    <span className="text-3xl sm:text-4xl font-black text-white">
                      ₹{plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      / {plan.duration_days} days
                    </span>
                  </div>

                  {/* Quota Highlights */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center space-x-2.5">
                      <Megaphone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Campaigns
                        </span>
                        <span className="text-xs font-bold text-white">
                          {plan.max_campaigns === -1 ? 'Unlimited' : `${plan.max_campaigns} Active`}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                          Lead Quota
                        </span>
                        <span className="text-xs font-bold text-white">
                          {plan.max_leads === -1 ? 'Unlimited' : `${plan.max_leads.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 mb-6">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Plan Inclusions
                    </span>
                    <ul className="space-y-2">
                      {(plan.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col space-y-2">
                  {isSuperAdmin ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {plan.active_subscribers_count ?? 0} active subscribers
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePlanActive(plan)}
                        className={`text-xs font-bold px-3 py-1 rounded-xl border transition-colors cursor-pointer ${
                          plan.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant={isFeatured ? 'gold' : 'secondary'}
                      className="w-full font-bold"
                      onClick={() => handleRequestPlan(plan)}
                      leftIcon={<MessageCircle className="w-4 h-4" />}
                    >
                      Request This Plan
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Modal (Super Admin Create/Edit) */}
      {isSuperAdmin && (
        <PlanModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          onSave={handleSavePlan}
          initialData={editingPlan}
        />
      )}
    </div>
  );
};
