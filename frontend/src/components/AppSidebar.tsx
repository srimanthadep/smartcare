import React from 'react';
import {
  LayoutDashboard, Users, CalendarDays, FileText, Receipt, FlaskConical,
  Pill, Bot, Settings, Bell, Activity,
  CalendarClock, ShieldCheck
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import logo from '@/assets/smartcare-logo.svg';

const clinicalItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['dentist', 'admin', 'receptionist'] },
  { title: 'Patients', url: '/patients', icon: Users, roles: ['dentist', 'admin', 'receptionist'] },
  { title: 'Appointments', url: '/appointments', icon: CalendarDays, roles: ['dentist', 'admin', 'receptionist'] },
  { title: 'Prescriptions', url: '/prescriptions', icon: FileText, roles: ['dentist'] },
  { title: 'X-Ray & Imaging', url: '/lab', icon: FlaskConical, roles: ['dentist', 'admin'] },
];

const operationsItems = [
  { title: 'Recall System', url: '/recalls', icon: CalendarClock, roles: ['admin', 'receptionist'] },
  { title: 'Consent Forms', url: '/consents', icon: ShieldCheck, roles: ['dentist', 'admin', 'receptionist'] },
  { title: 'Dental Supplies', url: '/pharmacy', icon: Pill, roles: ['admin'] },
  { title: 'AI Assistant', url: '/ai', icon: Bot, roles: ['dentist', 'admin'] },
];

const adminItems = [
  { title: 'Billing', url: '/billing', icon: Receipt, roles: ['admin', 'receptionist'] },
  { title: 'Analytics', url: '/analytics', icon: Activity, roles: ['admin'] },
  { title: 'Notifications', url: '/notifications', icon: Bell, roles: ['dentist', 'admin', 'receptionist'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['admin'] },
];

export const AppSidebar: React.FC = () => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user } = useAuth();
  const role = user?.role || 'receptionist';



  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="SmartCare" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <span className="text-lg font-heading font-bold text-sidebar-primary-foreground tracking-tight">
              SmartDental
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            {!collapsed && 'Clinical'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clinicalItems.filter(i => i.roles.includes(role)).map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            {!collapsed && 'Operations'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems.filter(i => i.roles.includes(role)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">
            {!collapsed && 'Administrative'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.filter(i => i.roles.includes(role)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
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
          <p className="text-xs text-sidebar-muted">© 2026 SmartDental</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
