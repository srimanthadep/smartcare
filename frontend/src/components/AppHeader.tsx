import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Moon, Sun, Bell, LogOut, WifiOff, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/CommandPalette';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { api } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.87 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const isOnline = useOnlineStatus();
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'awaiting_qr'>('disconnected');

  const checkWhatsAppStatus = async () => {
    try {
      const res = await api.getWhatsAppStatus();
      setWsStatus(res.status as any);
    } catch (err) {
      setWsStatus('disconnected');
    }
  };

  useEffect(() => {
    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      if (isK && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SC';

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-30">
      <SidebarTrigger className="shrink-0" />

      <button
        type="button"
        onClick={() => setCmdkOpen(true)}
        className="hidden md:flex items-center gap-2 bg-secondary/60 hover:bg-secondary/75 transition-colors rounded-md px-3 py-1.5 flex-1 max-w-md text-left"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients, appointments…"
          className="border-0 bg-transparent h-auto p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 pointer-events-none"
        />
        <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Offline indicator */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Offline</span>
          </div>
        )}
        <button
          onClick={() => navigate('/settings')}
          className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:bg-secondary/50 ${
            wsStatus === 'connected'
              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : wsStatus === 'connecting' || wsStatus === 'awaiting_qr'
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-destructive/5 border-destructive/20 text-destructive'
          }`}
        >
          <div className="relative">
            <WhatsAppIcon className="h-4 w-4" />
            {wsStatus === 'disconnected' && (
              <div className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 border border-background">
                <X className="h-2 w-2 stroke-[4]" />
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
            3
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => { await logout(); navigate('/login'); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </header>
  );
};
