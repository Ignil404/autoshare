import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BookingOut, CarOut, MaintenanceOut, RentalOut } from "@/lib/api-types";
import { Car, KeyRound, Calendar, Wrench, TrendingUp, Clock } from "lucide-react";

export const Route = createFileRoute("/staff/")({ component: StaffDashboard });

function StaffDashboard() {
  const cars = useQuery({ queryKey: ["s-cars"], queryFn: () => api.get<CarOut[]>("/api/v1/cars/") });
  const rentals = useQuery({ queryKey: ["s-rentals"], queryFn: () => api.get<RentalOut[]>("/api/v1/rentals/") });
  const bookings = useQuery({ queryKey: ["s-bookings"], queryFn: () => api.get<BookingOut[]>("/api/v1/bookings/") });
  const maint = useQuery({ queryKey: ["s-maint"], queryFn: () => api.get<MaintenanceOut[]>("/api/v1/maintenance/") });

  const allCars = cars.data ?? [];
  const freeCars = allCars.filter((c) => c.status === "FREE").length;
  const rentedCars = allCars.filter((c) => c.status === "RENTED").length;
  const activeRentals = (rentals.data ?? []).filter((r) => r.status === "ACTIVE" || r.status === "PAUSED").length;
  const activeBookings = (bookings.data ?? []).filter((b) => b.status === "CREATED").length;
  const openMaint = (maint.data ?? []).filter((m) => (m.status ?? "open") !== "closed" && !m.completed_at).length;

  const kpis = [
    { icon: Car, label: "Всего авто", value: allCars.length, sub: `${freeCars} свободных`, to: "/staff/cars", color: "text-blue-600 bg-blue-50" },
    { icon: Calendar, label: "Активные брони", value: activeBookings, sub: "ожидают старта", to: "/staff/bookings", color: "text-amber-600 bg-amber-50" },
    { icon: KeyRound, label: "Аренды в пути", value: activeRentals, sub: `${rentedCars} авто на ходу`, to: "/staff/rentals", color: "text-green-600 bg-green-50" },
    { icon: Wrench, label: "Открытое ТО", value: openMaint, sub: "требуют внимания", to: "/staff/maintenance", color: "text-red-600 bg-red-50" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="text-sm text-muted-foreground mt-1">Состояние автопарка и ключевые показатели.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to}>
            <div className="group rounded-2xl border bg-card p-5 transition-all hover:shadow-lg hover:shadow-black/5 hover:border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${k.color} transition-transform group-hover:scale-105`}>
                  <k.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/30" />
              </div>
              <div className="text-3xl font-bold tracking-tight">{k.value}</div>
              <div className="text-sm font-medium mt-1">{k.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Последние бронирования</h2>
          </div>
          {(bookings.data ?? []).slice(0, 5).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Нет данных</p>
          ) : (
            <div className="space-y-2">
              {(bookings.data ?? []).slice(0, 5).map((b) => (
                <div key={b.booking_id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                  <span className="font-medium">Бронь #{b.booking_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === "CREATED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Текущие аренды</h2>
          </div>
          {(rentals.data ?? []).filter((r) => r.status === "ACTIVE" || r.status === "PAUSED").slice(0, 5).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Нет активных аренд</p>
          ) : (
            <div className="space-y-2">
              {(rentals.data ?? []).filter((r) => r.status === "ACTIVE" || r.status === "PAUSED").slice(0, 5).map((r) => (
                <div key={r.rental_id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                  <span className="font-medium">Аренда #{r.rental_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {r.status === "ACTIVE" ? "В пути" : "На паузе"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
