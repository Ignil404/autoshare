import { createFileRoute, Link, Navigate, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Car, Users, KeyRound, Wrench, Tag, Percent, Calendar, ClipboardList, LineChart, ScrollText, BadgeCheck, LogOut, Menu, Sun, Moon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";

export const Route = createFileRoute("/staff")({ component: StaffLayout });

type Nav = { to: string; label: string; icon: typeof Car; exact?: boolean };
const NAV: Nav[] = [
  { to: "/staff", label: "Обзор", icon: LineChart, exact: true },
  { to: "/staff/clients", label: "Клиенты", icon: Users },
  { to: "/staff/staff", label: "Сотрудники", icon: BadgeCheck },
  { to: "/staff/cars", label: "Автопарк", icon: Car },
  { to: "/staff/tariffs", label: "Тарифы и зоны", icon: Tag },
  { to: "/staff/discounts", label: "Скидки", icon: Percent },
  { to: "/staff/bookings", label: "Бронирования", icon: Calendar },
  { to: "/staff/rentals", label: "Аренды", icon: KeyRound },
  { to: "/staff/payments", label: "Платежи", icon: ClipboardList },
  { to: "/staff/maintenance", label: "ТО", icon: Wrench },
  { to: "/staff/reports", label: "Отчёты", icon: LineChart },
  { to: "/staff/audit", label: "Аудит", icon: ScrollText },
  { to: "/staff/logs", label: "Логи", icon: FileText },
];

function StaffLayout() {
  const { isAuthenticated, userType, signOut, claims } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  if (!isAuthenticated) return <Navigate to="/auth/staff/login" />;
  if (userType !== "staff") return <Navigate to="/client" />;

  const role = typeof claims?.role === "string" ? claims.role : (typeof claims?.user_type === "string" ? claims.user_type : "staff");
  const roleLabels: Record<string, string> = { ADMIN: "Администратор", OPERATOR: "Оператор", MAINTENANCE: "Мастер" };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-5 flex items-center gap-2.5 font-bold text-base">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="tracking-tight">AutoShare</div>
            <div className="text-[10px] font-medium opacity-50 tracking-widest uppercase">Панель управления</div>
          </div>
        </div>
        <SideNav />
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2 text-xs">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-semibold text-[10px]">
              {roleLabels[role]?.[0] ?? "S"}
            </div>
            <div>
              <div className="font-medium">{roleLabels[role] ?? role}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-30 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="sm"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="bg-sidebar text-sidebar-foreground p-0 w-72">
                <div className="p-5 font-bold flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Car className="h-5 w-5" /></div>
                  AutoShare
                </div>
                <SideNav onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm">Панель управления</span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <header className="hidden md:flex border-b bg-card/80 backdrop-blur-md sticky top-0 z-30 items-center justify-between px-6 py-3">
          <div />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4 mr-2" />Выйти
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6"><div className="page-enter"><Outlet /></div></main>
      </div>
    </div>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const active = (to: string, exact?: boolean) => exact ? location.pathname === to : location.pathname.startsWith(to);
  return (
    <nav className="flex-1 overflow-auto p-2 space-y-0.5">
      {NAV.map((n) => {
        const isActive = active(n.to, n.exact);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`}
          >
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
