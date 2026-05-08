import React from 'react';
import {
  LayoutDashboard, Users, CalendarDays, FileText, Receipt,
  Pill, Bot, Settings, Bell, Activity,
  CalendarClock, History
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import logo from "@/assets/logo.png";

const allNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['doctor', 'admin'] },
  { title: 'Patients', url: '/patients', icon: Users, roles: ['doctor'] },
  { title: 'Appointments', url: '/appointments', icon: CalendarDays, roles: ['doctor'] },
  { title: 'Prescriptions', url: '/prescriptions', icon: FileText, roles: ['doctor'] },
  { title: 'Billing', url: '/billing', icon: Receipt, roles: ['doctor', 'admin'] },
  { title: 'Dental Supplies', url: '/pharmacy', icon: Pill, roles: ['doctor'] },
  { title: 'Recall System', url: '/recalls', icon: CalendarClock, roles: ['doctor'] },
  { title: 'AI Assistant', url: '/ai', icon: Bot, roles: ['doctor'] },
  { title: 'Analytics', url: '/analytics', icon: Activity, roles: ['doctor', 'admin'] },
  { title: 'Activity Logs', url: '/logs', icon: History, roles: ['admin'] },
  { title: 'Notifications', url: '/notifications', icon: Bell, roles: ['doctor', 'admin'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['doctor', 'admin'] },
];

export const AppSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user } = useAuth();
  const role = user?.role || 'doctor';

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Siara Dental" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <span className="text-lg font-heading font-bold text-sidebar-primary-foreground tracking-tight">
              Siara Dental
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allNavItems.filter(i => i.roles.includes(role)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-xs text-sidebar-muted">© 2026 Siara Dental</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
