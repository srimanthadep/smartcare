import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Moon, SunMedium, ChevronRight, Home } from 'lucide-react';
import { useTheme } from '@/shared/contexts/ThemeContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { Button } from '@/shared/ui/button';
import { SidebarTrigger } from '@/shared/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api';

const breadcrumbMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/audit-logs': 'Activity Logs',
  '/admin/delete-history': 'Delete History',
  '/admin/queue': 'Queue Monitor',
  '/admin/notifications': 'Notifications',
  '/admin/health': 'System Health',
  '/admin/security': 'Security Center',
  '/admin/backups': 'Backup Center',
  '/admin/ai-analytics': 'AI Analytics',
  '/admin/settings': 'Settings',
};

const AdminNavbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: notifData } = useQuery({
    queryKey: ['admin-notifications-count'],
    queryFn: () => adminApi.getNotifications({ limit: 1 }),
    refetchInterval: 30000,
  });

  const unreadCount = notifData?.unreadCount || 0;
  const breadcrumb = breadcrumbMap[location.pathname] || 'Admin';
  const initials = user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'AD';

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      {/* Mobile header */}
      <div className="flex h-14 items-center justify-between px-3 md:hidden">
        <SidebarTrigger className="h-9 w-9" />
        <span className="text-sm font-heading font-semibold">Admin Panel</span>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/admin/notifications')}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </Button>
      </div>

      {/* Desktop header */}
      <div className="mx-auto hidden h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8 md:flex">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          <button onClick={() => navigate('/admin')} className="text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          <span className="font-medium text-foreground">{breadcrumb}</span>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-xl border border-border/40 bg-card shadow-sm">
            {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost" size="icon"
            className="relative h-9 w-9 rounded-xl border border-border/40 bg-card shadow-sm"
            onClick={() => navigate('/admin/notifications')}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-bold px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-xl border border-border/40 bg-card py-1.5 pl-2 pr-3 shadow-sm transition-all hover:border-primary/30">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-xs font-semibold text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-medium leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
              <DropdownMenuLabel className="px-3 py-1.5 text-xs font-normal text-muted-foreground">Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer rounded-lg px-3 py-2 text-sm">Back to App</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="cursor-pointer rounded-lg px-3 py-2 text-sm">Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-destructive">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
