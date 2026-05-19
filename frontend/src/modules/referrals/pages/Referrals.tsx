import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  GitFork,
  Users2,
  BadgePercent,
  TrendingUp,
} from 'lucide-react';

import ReferralDashboard from './ReferralDashboard';
import ReferralPipeline from './ReferralPipeline';
import ReferralCRM from './ReferralCRM';
import ReferralCommissions from './ReferralCommissions';
import ReferralAnalytics from './ReferralAnalytics';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: ReferralDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: GitFork, component: ReferralPipeline },
  { id: 'crm', label: 'Referral Sources CRM', icon: Users2, component: ReferralCRM },
  { id: 'commissions', label: 'Ledger & Rewards', icon: BadgePercent, component: ReferralCommissions },
  { id: 'analytics', label: 'ROI Analytics', icon: TrendingUp, component: ReferralAnalytics },
];

const Referrals: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    document.title = 'Referral Management System · Siara Dental';
  }, []);

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component || ReferralDashboard;

  return (
    <div className="luxury-page space-y-6">
      {/* Page Header */}
      <section className="luxury-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="luxury-subtitle mb-1">Growth & Collaboration Hub</p>
            <h1 className="luxury-title text-3xl font-bold tracking-tight sm:text-4xl">
              Referral Management System
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Monitor, nurture, and track patient and doctor referrals. Auto-calculate commissions, manage payouts, reward patients, and optimize acquisition ROI.
            </p>
          </div>
        </div>

        {/* Premium Tab Selection */}
        <div className="mt-8 flex flex-wrap border-b border-border/40 pb-px">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-primary' : 'text-muted-foreground/80'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.75 bg-primary rounded-t-full"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Workspace Container */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Referrals;
