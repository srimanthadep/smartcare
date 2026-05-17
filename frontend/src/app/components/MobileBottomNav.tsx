import React from "react";
import {
  Activity,
  Bot,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  FileText,
  LayoutDashboard,
  Menu,
  Pill,
  Receipt,
  ScanLine,
  Settings,
  Users,
  Wallet,
  Trash2,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";
import { NavLink } from "@/app/components/NavLink";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/drawer";

const primaryTabs = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["doctor", "admin"] },
  { title: "Patients", url: "/patients", icon: Users, roles: ["doctor", "admin"] },
  { title: "Appointments", url: "/appointments", icon: CalendarDays, roles: ["doctor", "admin"] },
  { title: "Prescriptions", url: "/prescriptions", icon: FileText, roles: ["doctor", "admin"] },
];

const moreTabs = [
  { title: "Billing", url: "/billing", icon: Receipt, roles: ["doctor", "admin"] },
  { title: "Expenses", url: "/expenses", icon: Wallet, roles: ["doctor", "admin"] },
  { title: "Pharmacy", url: "/pharmacy", icon: Pill, roles: ["doctor", "admin"] },
  { title: "Analytics", url: "/analytics", icon: Activity, roles: ["doctor", "admin"] },
  { title: "AI Assistant", url: "/ai", icon: Bot, roles: ["doctor", "admin"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["doctor", "admin"] },
  { title: "Activity Logs", url: "/logs", icon: Activity, roles: ["admin"] },
  { title: "Delete History", url: "/delete-history", icon: Trash2, roles: ["doctor", "admin"] },
  { title: "Recall System", url: "/recalls", icon: CalendarClock, roles: ["doctor", "admin"] },
  { title: "X-Rays", url: "/xrays", icon: ScanLine, roles: ["doctor", "admin"] },
  { title: "Public Booking", url: "/book", icon: CalendarPlus, roles: ["doctor", "admin"] },
];

const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || "doctor";
  const location = useLocation();
  const tabs = primaryTabs.filter((item) => item.roles.includes(role));
  const mobileTabs = [...tabs, { title: "More", url: "#more", icon: Menu, roles: [role] }];

  return (
    <nav className="fixed bottom-0 left-0 z-50 h-16 w-full border-t border-border bg-background md:hidden">
      <div className="grid h-full grid-cols-5">
        {mobileTabs.map((item) =>
          item.title === "More" ? (
            <Drawer key={item.title}>
              <DrawerTrigger asChild>
                <button className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Menu className="h-4 w-4" />
                  <span className="text-[10px]">More</span>
                </button>
              </DrawerTrigger>
              <DrawerContent className="rounded-t-2xl">
                <DrawerHeader>
                  <DrawerTitle>More</DrawerTitle>
                </DrawerHeader>
                <div className="grid grid-cols-2 gap-2 px-4 pb-6">
                  {moreTabs.filter((link) => link.roles.includes(role)).map((link) => (
                    <NavLink
                      key={link.title}
                      to={link.url}
                      className="flex items-center gap-2 rounded-lg border border-border/50 p-3 text-sm"
                      activeClassName="border-primary text-primary"
                    >
                      <link.icon className="h-4 w-4" />
                      <span>{link.title}</span>
                    </NavLink>
                  ))}
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground"
              activeClassName="text-primary"
            >
              <item.icon
                className={`h-4 w-4 ${
                  item.url === "/"
                    ? location.pathname === "/"
                      ? "fill-current"
                      : ""
                    : location.pathname.startsWith(item.url)
                      ? "fill-current"
                      : ""
                }`}
              />
              <span className="text-[10px]">{item.title}</span>
            </NavLink>
          ),
        )}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
