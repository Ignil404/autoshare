import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiErrorMessage, fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { Car, Calendar, KeyRound, Wallet, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/client/")({ component: ClientDashboard });

interface ClientStats {
  balance: number;
  total_bookings: number;
  active_bookings: number;
  total_rentals: number;
  active_rentals: number;
  completed_rentals: number;
  total_spent: number;
}

function ClientDashboard() {
  const { t } = useI18n();
  const statsQ = useQuery({
    queryKey: ["client-stats"],
    queryFn: () => api.get<ClientStats>("/api/v1/clients/me/stats"),
  });

  const s = statsQ.data;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("nav.home")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("dashboard.welcome")}</p>
      </div>

      {statsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-3"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-8 w-20" /><Skeleton className="h-4 w-28" /></div>
          ))}
        </div>
      ) : statsQ.error ? (
        <p className="text-destructive">{apiErrorMessage(statsQ.error)}</p>
      ) : s && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Wallet} label={t("dashboard.balance")} value={fmtMoney(s.balance)} sub={t("dashboard.topup")} to="/client/profile" color="text-green-600 bg-green-50" />
            <StatCard icon={Calendar} label={t("dashboard.active_bookings")} value={s.active_bookings} sub={`${t("common.loading").replace("…", "")} ${s.total_bookings}`} to="/client/bookings" color="text-amber-600 bg-amber-50" />
            <StatCard icon={KeyRound} label={t("dashboard.active_rentals")} value={s.active_rentals} sub={`${t("common.loading").replace("…", "")} ${s.completed_rentals}`} to="/client/rentals" color="text-blue-600 bg-blue-50" />
            <StatCard icon={TrendingUp} label={t("dashboard.spent")} value={fmtMoney(s.total_spent)} sub={`${s.total_rentals}`} to="/client/rentals" color="text-purple-600 bg-purple-50" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/client/cars">
              <div className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/25">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Car className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("dashboard.view_cars")}</h3>
                    <p className="text-sm text-muted-foreground">{t("dashboard.view_cars_sub")}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </div>
            </Link>
            <Link to="/client/bookings">
              <div className="group rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/25">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{t("dashboard.view_bookings")}</h3>
                    <p className="text-sm text-muted-foreground">{t("dashboard.view_bookings_sub")}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, to, color }: {
  icon: typeof Car; label: string; value: string | number; sub: string; to: string; color: string;
}) {
  return (
    <Link to={to} aria-label={`${label}: ${value}`}>
      <div className="group rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:border-primary/20 hover:-translate-y-0.5">
        <div className="flex items-center justify-between mb-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${color} transition-transform duration-300 group-hover:scale-[1.02]`}>
            <Icon className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground/30 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-primary/50" />
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-sm font-medium mt-1">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}
