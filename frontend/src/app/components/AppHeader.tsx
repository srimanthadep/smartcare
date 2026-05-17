import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Bell,
  Command,
  Moon,
  Search,
  SunMedium,
  Wifi,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { Switch } from "@/shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { api } from "@/shared/lib/api";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
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
  const [waStatus, setWaStatus] = useState<{ status: string; qr: string | null }>({ status: 'disconnected', qr: null });
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchWaStatus();
    
    // Check WhatsApp status periodically
    const interval = setInterval(fetchWaStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchWaStatus = async () => {
    try {
      const res = await api.getWhatsAppStatus();
      setWaStatus(res);
    } catch (err) {
      console.error('Failed to fetch WA status', err);
    }
  };

  const handleWaToggle = async (checked: boolean) => {
    if (checked) {
      setIsConnecting(true);
      try {
        await api.connectWhatsApp();
        setIsWaModalOpen(true);
        startQrStream();
      } catch (err) {
        toast.error('Failed to initiate connection');
        setIsConnecting(false);
      }
    } else {
      try {
        await api.disconnectWhatsApp();
        setWaStatus({ status: 'disconnected', qr: null });
        toast.success('WhatsApp disconnected');
      } catch (err) {
        toast.error('Failed to disconnect');
      }
    }
  };

  const startQrStream = () => {
    const token = localStorage.getItem('smartcare_token');
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
    const es = new EventSource(`${apiBaseUrl}/api/whatsapp/qr-stream?token=${token}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWaStatus(data);

      if (data.status === 'connected') {
        es.close();
        setIsWaModalOpen(false);
        setIsConnecting(false);
        toast.success('WhatsApp connected successfully!');
      }
    };

    es.onerror = () => {
      es.close();
      if (waStatus.status !== 'connected') {
        setIsConnecting(false);
      }
    };

    return es;
  };

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

          {/* WhatsApp Connection Toggle */}
          <div className={cn(
            "hidden items-center gap-2.5 rounded-xl border px-3 py-1.5 shadow-sm transition-all duration-300 sm:flex",
            waStatus.status === 'connected'
              ? "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "border-border/60 bg-muted/20 text-muted-foreground"
          )}>
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-lg transition-transform duration-300",
              waStatus.status === 'connected'
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}>
              <MessageCircle className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 leading-none mb-0.5">
                WhatsApp
              </span>
              <span className="text-[11px] font-medium leading-none">
                {waStatus.status === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2 pl-1.5 border-l border-border/40 ml-1">
              {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
              <Switch
                checked={waStatus.status === 'connected' || waStatus.status === 'awaiting_qr'}
                onCheckedChange={handleWaToggle}
                disabled={isConnecting}
                className="scale-90"
              />
            </div>
          </div>

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
      <Dialog open={isWaModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleWaToggle(false);
          setIsWaModalOpen(false);
          setIsConnecting(false);
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-white/60 bg-white/95 p-0 shadow-[0_20px_60px_rgba(0,0,0,0.15)] backdrop-blur-xl dark:bg-zinc-950/95 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 dark:from-zinc-900/50 dark:via-zinc-950 dark:to-zinc-900/30 px-6 py-4 rounded-t-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-heading text-lg font-semibold text-foreground">Scan WhatsApp QR Code</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Open WhatsApp on your phone → Linked Devices → Link a Device
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex flex-col items-center justify-center p-8 space-y-5">
            {waStatus.qr ? (
              <div className="p-3 bg-white rounded-2xl shadow-inner border-2 border-primary/10 transition-all hover:scale-[1.02] duration-300">
                <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-60 h-60" />
              </div>
            ) : (
              <div className="w-60 h-60 flex flex-col items-center justify-center bg-secondary/20 rounded-2xl border-2 border-dashed border-border dark:bg-zinc-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Generating QR code...</p>
              </div>
            )}
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {waStatus.status === 'awaiting_qr' ? 'Waiting for scan...' : 'Establishing secure channel...'}
              </p>
              <p className="text-xs text-muted-foreground">This modal will close automatically once the connection is successful.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 bg-secondary/10 dark:bg-zinc-900/30 px-6 py-4 border-t border-border/60 rounded-b-2xl">
            <Button variant="ghost" className="rounded-xl" onClick={() => {
              handleWaToggle(false);
              setIsWaModalOpen(false);
            }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};
