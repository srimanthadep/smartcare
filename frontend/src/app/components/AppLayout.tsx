import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/shared/ui/sidebar';
import { AppSidebar } from '@/app/components/AppSidebar';
import { AppHeader } from '@/app/components/AppHeader';
import { CommandPalette } from '@/app/components/CommandPalette';
import MobileBottomNav from '@/app/components/MobileBottomNav';
import { useRealTimeUpdates } from '@/shared/hooks/useRealTimeUpdates';

const AppLayout: React.FC = () => {
  useRealTimeUpdates();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader onSearchClick={() => setIsCommandPaletteOpen(true)} />
          <main className="flex-1 overflow-auto p-3 pb-16 md:p-6 md:pb-0">
            <Outlet />
          </main>
        </div>
        <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
