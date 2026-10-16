import { createFileRoute, Link, Navigate, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Car, Calendar, User, KeyRound, LogOut, Sun, Moon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/client")({ component: ClientLayout });

type NavItem = { to: string; label: string; icon: typeof Car; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/client", label: "Главная", icon: Car, exact: true },
  { to: "/client/cars", label: "Машины", icon: Car },
  { to: "/client/zones", label: "Зоны", icon: MapPin },
  { to: "/client/bookings", label: "Брони", icon: Calendar },
  { to: "/client/rentals", label: "Аренды", icon: KeyRound },
  { to: "/client/profile", label: "Профиль", icon: User },
];

const BOTTOM_NAV = NAV.filter((n) => !n.exact);

function ClientLayout() {
  const { isAuthenticated, userType, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useI18n();

  if (!isAuthenticated) return <Navigate to="/auth/login" />;
  if (userType !== "client") return <Navigate to="/staff" />;

  const active = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/client" className="flex items-center gap-2.5 font-bold">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <Car className="h-4 w-4" />
            </div>
            AutoShare
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const isActive = active(n.to, n.exact);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-label={n.label}
                  aria-current={isActive ? "page" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs font-mono h-8 px-2" onClick={toggleLang}>
              {lang === "ru" ? "EN" : "RU"}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">{t("nav.logout")}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 page-enter"><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex flex-row flex-nowrap border-t bg-card/90 backdrop-blur-md md:hidden">
        {BOTTOM_NAV.map((n) => {
          const isActive = active(n.to, n.exact);
          return (
            <Link
              key={n.to}
              to={n.to}
              aria-label={n.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary" />}
              <n.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
