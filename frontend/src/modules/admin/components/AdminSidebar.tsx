import React from 'react';
import {
  LayoutDashboard, Users, ScrollText, Trash2, Activity,
  Shield, Bell, Database, Bot, Settings, ArrowLeft, Gauge
} from 'lucide-react';
import { NavLink } from '@/app/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/shared/ui/sidebar';

const adminNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'User Management', url: '/admin/users', icon: Users },
  { title: 'Activity Logs', url: '/admin/audit-logs', icon: ScrollText },
  { title: 'Delete History', url: '/admin/delete-history', icon: Trash2 },
  { title: 'Queue Monitor', url: '/admin/queue', icon: Gauge },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell },
  { title: 'System Health', url: '/admin/health', icon: Activity },
  { title: 'Security Center', url: '/admin/security', icon: Shield },
  { title: 'Backup Center', url: '/admin/backups', icon: Database },
  { title: 'AI Analytics', url: '/admin/ai-analytics', icon: Bot },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

const AdminSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="hidden border-r-0 md:flex">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-orange-600 text-white font-bold text-sm">
            A
          </div>
          {!collapsed && (
            <div>
              <span className="text-base font-heading font-bold text-sidebar-primary-foreground tracking-tight">
                Admin Panel
              </span>
              <p className="text-[10px] text-sidebar-muted">Siara Dental</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Back to App */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to App">
                  <NavLink
                    to="/"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    activeClassName=""
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-xs">Back to App</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="my-2 mx-3 border-t border-sidebar-border" />

              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
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
          <p className="text-xs text-sidebar-muted">© 2026 Admin Console</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
