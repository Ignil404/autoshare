import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { RentalOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime, fmtMinutes, fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Car as CarIcon, Clock, Pause, Play, CheckCircle, Route as RouteIcon } from "lucide-react";

export const Route = createFileRoute("/client/rentals")({ component: MyRentals });

function MyRentals() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["client-rentals"],
    queryFn: () => api.get<RentalOut[]>("/api/v1/rentals/"),
  });

  const [finishFor, setFinishFor] = useState<RentalOut | null>(null);
  const [distance, setDistance] = useState("");

  const pauseM = useMutation({
    mutationFn: ({ id }: { id: number }) => api.post(`/api/v1/rentals/${id}/pause`, {}),
    onSuccess: () => { toast.success("Аренда приостановлена"); qc.invalidateQueries({ queryKey: ["client-rentals"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const resumeM = useMutation({
    mutationFn: ({ id }: { id: number }) => api.post(`/api/v1/rentals/${id}/resume`, {}),
    onSuccess: () => { toast.success("Аренда возобновлена"); qc.invalidateQueries({ queryKey: ["client-rentals"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const completeM = useMutation({
    mutationFn: (v: { id: number; distance_km?: number }) =>
      api.post(`/api/v1/rentals/${v.id}/complete`, { distance_km: v.distance_km ?? null }),
    onSuccess: () => {
      toast.success("Аренда завершена!");
      qc.invalidateQueries({ queryKey: ["client-rentals"] });
      qc.invalidateQueries({ queryKey: ["client-bookings"] });
      setFinishFor(null); setDistance("");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const sorted = [...(q.data ?? [])].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const statusStyles: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700 border-green-200",
    PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
    COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
    FORCE_COMPLETED: "bg-red-50 text-red-600 border-red-200",
  };
  const statusLabels: Record<string, string> = {
    ACTIVE: "В пути",
    PAUSED: "На паузе",
    COMPLETED: "Завершена",
    FORCE_COMPLETED: "Принудительно",
  };

  return (
    <div className="space-y-5 page-enter">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Мои аренды</h1>
        <p className="text-sm text-muted-foreground mt-1">История и текущие поездки.</p>
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
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-14 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : q.error ? (
        <Card><CardContent className="py-10 text-center text-destructive">{apiErrorMessage(q.error)}</CardContent></Card>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <div className="text-4xl mb-3">🛣️</div>
          <p className="text-muted-foreground font-medium">Нет поездок</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Начните аренду из раздела «Брони»</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => (
            <div key={r.rental_id} className="rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <CarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">Аренда #{r.rental_id}</div>
                    <div className="text-xs text-muted-foreground">Автомобиль #{r.car_id}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? "bg-secondary text-secondary-foreground"}`}>
                  {statusLabels[r.status] ?? r.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
                  <div className="text-xs text-muted-foreground">Активно</div>
                  <div className="font-semibold text-sm mt-0.5">{fmtMinutes(r.active_minutes)}</div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
                  <div className="text-xs text-muted-foreground">Пауза</div>
                  <div className="font-semibold text-sm mt-0.5">{fmtMinutes(r.pause_minutes)}</div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><RouteIcon className="h-3 w-3" /> Пробег</div>
                  <div className="font-semibold text-sm mt-0.5">{r.distance_km} км</div>
                </div>
                <div className="rounded-lg bg-primary/5 p-2.5 text-center border border-primary/10">
                  <div className="text-xs text-muted-foreground">Стоимость</div>
                  <div className="font-bold text-sm mt-0.5 text-primary">{fmtMoney(r.total_cost)}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {fmtDateTime(r.started_at)}
                  {r.finished_at && <> — {fmtDateTime(r.finished_at)}</>}
                </div>
              </div>
              {r.status === "ACTIVE" && (
                <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" className="flex-1 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300" disabled={pauseM.isPending} onClick={() => pauseM.mutate({ id: r.rental_id })}>
                    <Pause className="h-4 w-4 mr-1.5" /> Пауза
                  </Button>
                  <Button className="flex-1 shadow-sm hover-lift" disabled={completeM.isPending} onClick={() => setFinishFor(r)}>
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Завершить
                  </Button>
                </div>
              )}
              {r.status === "PAUSED" && (
                <div className="pt-3 border-t">
                  <Button className="w-full shadow-sm hover-lift" disabled={resumeM.isPending} onClick={() => resumeM.mutate({ id: r.rental_id })}>
                    <Play className="h-4 w-4 mr-1.5" /> Продолжить
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!finishFor} onOpenChange={(o) => !o && setFinishFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Завершить аренду</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Пробег за поездку, км</Label>
            <Input type="number" min="0" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="Например, 12.5" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setFinishFor(null)}>Отмена</Button>
            <Button disabled={completeM.isPending} onClick={() => finishFor && completeM.mutate({ id: finishFor.rental_id, distance_km: distance ? Number(distance) : undefined })}>
              {completeM.isPending ? "Завершаем…" : "Завершить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
