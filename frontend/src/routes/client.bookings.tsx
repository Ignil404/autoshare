import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BookingOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Car as CarIcon, Play, X, CalendarX } from "lucide-react";

export const Route = createFileRoute("/client/bookings")({ component: MyBookings });

function MyBookings() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client-bookings"],
    queryFn: () => api.get<BookingOut[]>("/api/v1/bookings/"),
  });
  const cancelM = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/bookings/${id}/cancel`),
    onSuccess: () => { toast.success("Бронь отменена"); qc.invalidateQueries({ queryKey: ["client-bookings"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const startM = useMutation({
    mutationFn: (booking_id: number) => api.post("/api/v1/rentals/start", { booking_id }),
    onSuccess: () => { toast.success("Аренда начата!"); qc.invalidateQueries({ queryKey: ["client-bookings"] }); qc.invalidateQueries({ queryKey: ["client-rentals"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const sorted = [...(q.data ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const statusStyles: Record<string, string> = {
    CREATED: "bg-green-50 text-green-700 border-green-200",
    CONVERTED: "bg-blue-50 text-blue-700 border-blue-200",
    CANCELLED_CLIENT: "bg-gray-50 text-gray-600 border-gray-200",
    CANCELLED_STAFF: "bg-orange-50 text-orange-700 border-orange-200",
    CANCELLED_TIMER: "bg-red-50 text-red-600 border-red-200",
  };
  const statusLabels: Record<string, string> = {
    CREATED: "Активна",
    CONVERTED: "В аренде",
    CANCELLED_CLIENT: "Отменена",
    CANCELLED_STAFF: "Отменена staff",
    CANCELLED_TIMER: "Истекла",
  };

  return (
    <div className="space-y-5 page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Мои бронирования</h1>
        <p className="text-sm text-muted-foreground mt-1">Управляйте активными бронями.</p>
      </div>
      {q.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-4"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-32" /></div>
              <div className="flex gap-2 pt-3 border-t"><Skeleton className="h-10 flex-1 rounded-xl" /><Skeleton className="h-10 flex-1 rounded-xl" /></div>
            </div>
          ))}
        </div>
      ) : q.error ? (
        <Card><CardContent className="py-10 text-center text-destructive">{apiErrorMessage(q.error)}</CardContent></Card>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-muted-foreground font-medium">Нет бронирований</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Забронируйте автомобиль на главной странице</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((b) => (
            <div key={b.booking_id} className="rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Бронь #{b.booking_id}</div>
                    <div className="text-xs text-muted-foreground">Автомобиль #{b.car_id}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[b.status] ?? "bg-secondary text-secondary-foreground"}`}>
                  {statusLabels[b.status] ?? b.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Создано: {fmtDateTime(b.created_at)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Истекает: {fmtDateTime(b.expires_at)}
                </div>
              </div>
              {b.status === "CREATED" && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button className="flex-1 shadow-sm hover-lift" disabled={startM.isPending} onClick={() => startM.mutate(b.booking_id)}>
                    <Play className="h-4 w-4 mr-1.5" /> Начать аренду
                  </Button>
                  <Button variant="outline" className="flex-1 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30" disabled={cancelM.isPending} onClick={() => cancelM.mutate(b.booking_id)}>
                    <X className="h-4 w-4 mr-1.5" /> Отменить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
