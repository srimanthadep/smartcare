import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { AppHeader } from '@/components/AppHeader';
import { AIAssistantPanel } from '@/components/AIAssistantPanel';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

const AppLayout: React.FC = () => {
  useRealTimeUpdates();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global AI panel trigger */}
      <AIAssistantPanel>
        <Button
          size="icon"
          className="fixed bottom-5 right-5 h-12 w-12 rounded-full shadow-lg"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-5 w-5" />
        </Button>
      </AIAssistantPanel>
    </SidebarProvider>
  );
};

export default AppLayout;
