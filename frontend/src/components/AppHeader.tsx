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
import { Search, Moon, Sun, Bell, LogOut, WifiOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/CommandPalette';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const AppHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const isOnline = useOnlineStatus();

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
