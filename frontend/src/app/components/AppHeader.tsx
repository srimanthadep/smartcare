import React from "react";
import { format } from "date-fns";
import {
  Bell,
  Command,
  Moon,
  Search,
  SunMedium,
  Wifi,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SidebarTrigger } from "@/shared/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import logo from "@/assets/logo.png";

export const AppHeader: React.FC<{ onSearchClick?: () => void }> = ({ onSearchClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const today = format(new Date(), "EEEE, d MMMM yyyy");
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SD";

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-3 md:hidden">
        <SidebarTrigger className="h-9 w-9" />
        <div className="flex items-center gap-2">
          <img src={logo} alt="Siara Dental" className="h-8 w-8" />
          <span className="text-sm font-heading font-semibold">Siara Dental</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-xl border border-border/40 bg-card"
            onClick={onSearchClick || (() => navigate("/patients"))}
          >
            <Search className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-xl border border-border/40 bg-card p-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl border-border/50 p-1.5 shadow-lg">
              <DropdownMenuLabel className="px-3 py-2 font-normal">
                <p className="font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">@{user?.username || "siara"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent" onClick={() => navigate("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent" onClick={() => navigate("/logs")}>
                Activity logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
                onClick={logout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="mx-auto hidden h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8 md:flex">
        {/* Search Bar – improved proportions and softer UI */}
        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/70" />
          <Input
            readOnly
            onClick={onSearchClick}
            placeholder="Search patients, appointments, invoices"
            className="h-11 w-full rounded-xl cursor-pointer border-border/50 bg-card pl-11 pr-16 text-sm shadow-sm transition-all placeholder:text-muted-foreground hover:border-border focus-visible:ring-1 focus-visible:ring-primary"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        {/* Right-side group – balanced spacing */}
        <div className="ml-auto flex items-center gap-3">
          {/* Date display – cleaner typography */}
          <div className="hidden flex-col items-start rounded-xl border border-border/30 bg-card/80 px-3 py-1.5 shadow-sm lg:flex">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Date
            </span>
            <span className="text-sm font-medium text-foreground">{today}</span>
          </div>

          {/* Status badge */}
          {isOnline ? (
            <div className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 sm:flex">
              <Wifi className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Online</span>
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-destructive shadow-sm sm:flex">
              <Wifi className="h-3.5 w-3.5 opacity-50" />
              <span className="text-xs font-medium">Offline</span>
            </div>
          )}

          {/* Theme toggle – consistent styling */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 rounded-xl border border-border/40 bg-card shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {theme === "dark" ? (
              <SunMedium className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </Button>

          {/* Notifications – subtle indicator */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl border border-border/40 bg-card shadow-sm transition-colors hover:bg-accent"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          </Button>

          {/* User menu – refined pill style */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card py-1.5 pl-2 pr-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
                <Avatar className="h-9 w-9 border border-primary/20 ring-1 ring-primary/10">
                  <AvatarImage src={user?.avatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-sm font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {user?.name || "Siara User"}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {user?.role || "doctor"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-60 rounded-xl border-border/50 p-1.5 shadow-lg"
            >
              <DropdownMenuLabel className="px-3 py-2 font-normal">
                <p className="font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  @{user?.username || "siara"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                onClick={() => navigate("/settings")}
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                onClick={() => navigate("/logs")}
              >
                Activity logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
                onClick={logout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
