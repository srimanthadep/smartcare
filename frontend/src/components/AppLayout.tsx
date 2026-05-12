import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

const AppLayout: React.FC = () => {
  useRealTimeUpdates();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto p-3 pb-16 md:p-6 md:pb-0">
            <Outlet />
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
