import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BookingOut, CarOut } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Car as CarIcon, Palette, Hash, Gauge, Search, Calendar, MapPin, Fuel, Wrench, Clock, Tag, ArrowRight, Map, Camera } from "lucide-react";

export const Route = createFileRoute("/client/cars")({
  validateSearch: (search: Record<string, unknown>) => ({
    car_id: search.car_id ? Number(search.car_id) : undefined,
  }),
  component: BrowseCars,
});

function BrowseCars() {
  const { car_id } = Route.useSearch();
  const [carClass, setCarClass] = useState<string>("");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const carsQ = useQuery({
    queryKey: ["client-free-cars", carClass],
    queryFn: () => api.get<CarOut[]>("/api/v1/cars/free", carClass ? { car_class: carClass } : undefined),
  });

  const [viewCar, setViewCar] = useState<CarOut | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [promo, setPromo] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (car_id && carsQ.data) {
      const car = carsQ.data.find((c) => c.car_id === car_id);
      if (car) setViewCar(car);
    }
  }, [car_id, carsQ.data]);

  const bookM = useMutation({
    mutationFn: (payload: { car_id: number; discount_code?: string }) =>
      api.post<BookingOut>("/api/v1/bookings/", payload),
    onSuccess: () => {
      toast.success("Автомобиль забронирован! Бронь действует 20 минут.");
      qc.invalidateQueries({ queryKey: ["client-free-cars"] });
      qc.invalidateQueries({ queryKey: ["client-bookings"] });
      setShowBooking(false); setViewCar(null); setPromo("");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const filtered = (carsQ.data ?? []).filter((c) =>
    !search ? true : `${c.brand} ${c.model} ${c.plate_number}`.toLowerCase().includes(search.toLowerCase())
  );

  const classColors: Record<string, string> = {
    ECONOMY: "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMFORT: "bg-blue-50 text-blue-700 border-blue-200",
    BUSINESS: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const classLabels: Record<string, string> = {
    ECONOMY: "Эконом", COMFORT: "Комфорт", BUSINESS: "Бизнес",
  };
  const classEmoji: Record<string, string> = {
    ECONOMY: "🟢", COMFORT: "🔵", BUSINESS: "🟡",
  };

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Свободные автомобили</h1>
          <p className="text-sm text-muted-foreground mt-1">Нажмите на машину, чтобы посмотреть подробности и забронировать.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/client/zones" })}>
          <Map className="h-4 w-4 mr-1.5" /> На карте
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по марке, модели, номеру…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={carClass || "all"} onValueChange={(v) => setCarClass(v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Класс" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все классы</SelectItem>
            <SelectItem value="economy">Эконом</SelectItem>
            <SelectItem value="comfort">Комфорт</SelectItem>
            <SelectItem value="business">Бизнес</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {carsQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-24" /></div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : carsQ.error ? (
        <Card><CardContent className="py-10 text-center text-destructive">{apiErrorMessage(carsQ.error)}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <div className="text-4xl mb-3">🚗</div>
          <p className="text-muted-foreground font-medium">Свободных машин нет</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Попробуйте изменить фильтр или проверьте позже</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.car_id} className="group relative rounded-2xl border bg-card p-5 transition-all duration-200 hover:shadow-xl hover:shadow-primary/8 hover:border-primary/25 hover:-translate-y-0.5 cursor-pointer" onClick={() => setViewCar(c)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 group-hover:scale-110">
                    <CarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold group-hover:text-primary transition-colors">{c.brand} {c.model}</div>
                    <div className="text-xs text-muted-foreground">{c.year} г.</div>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classColors[c.car_class] ?? "bg-secondary text-secondary-foreground"}`}>
                  {classLabels[c.car_class] ?? c.car_class}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Hash className="h-3.5 w-3.5" /><span className="font-mono">{c.plate_number}</span></div>
                {c.color && <div className="flex items-center gap-2"><Palette className="h-3.5 w-3.5" /><span>{c.color}</span></div>}
                <div className="flex items-center gap-2"><Gauge className="h-3.5 w-3.5" /><span>{c.mileage?.toLocaleString()} км</span></div>
              </div>
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Подробнее</span>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewCar && !showBooking} onOpenChange={(o) => { if (!o) { setViewCar(null); setPromo(""); } }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {viewCar && (
            <>
                <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 pb-4">
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classColors[viewCar.car_class] ?? "bg-secondary text-secondary-foreground"}`}>
                    {classEmoji[viewCar.car_class]} {classLabels[viewCar.car_class] ?? viewCar.car_class}
                  </span>
                </div>
                <div className="flex items-end gap-4 mb-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                    <CarIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{viewCar.brand} {viewCar.model}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{viewCar.year} год выпуска</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/50 border overflow-hidden">
                  <img
                    src={`/api/v1/cars/${viewCar.car_id}/photo`}
                    alt={`${viewCar.brand} ${viewCar.model}`}
                    className="w-full h-40 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" /> Фото автомобиля
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon={Hash} label="Гос. номер" value={viewCar.plate_number} mono />
                  {viewCar.color && <InfoRow icon={Palette} label="Цвет" value={viewCar.color} />}
                  <InfoRow icon={Gauge} label="Пробег" value={`${viewCar.mileage?.toLocaleString()} км`} />
                  <InfoRow icon={Calendar} label="Год" value={`${viewCar.year}`} />
                  {viewCar.last_service && <InfoRow icon={Wrench} label="Последнее ТО" value={viewCar.last_service} />}
                  {viewCar.zone_id && <InfoRow icon={MapPin} label="Зона" value={`#${viewCar.zone_id}`} />}
                  {viewCar.lat && viewCar.lng && <InfoRow icon={Map} label="Координаты" value={`${viewCar.lat.toFixed(4)}, ${viewCar.lng.toFixed(4)}`} />}
                </div>
                {viewCar.lat && viewCar.lng && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setViewCar(null); navigate({ to: "/client/zones", search: { lat: viewCar.lat, lng: viewCar.lng } }); }}>
                    <Map className="h-4 w-4 mr-1.5" /> Показать на карте
                  </Button>
                )}
                <div className="rounded-xl bg-secondary/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Условия бронирования</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> Бронь действует 20 минут</div>
                    <div className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-primary" /> Оплата по тарифу после завершения</div>
                    <div className="flex items-center gap-2"><Fuel className="h-3.5 w-3.5 text-primary" /> Полный бак при выдаче</div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => { setViewCar(null); setPromo(""); }}>Закрыть</Button>
                <Button className="flex-1 shadow-md shadow-primary/15 hover-lift" onClick={() => setShowBooking(true)}>
                  Забронировать <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showBooking} onOpenChange={(o) => { if (!o) { setShowBooking(false); setPromo(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-xl">Подтвердите бронь</DialogTitle></DialogHeader>
          {viewCar && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><CarIcon className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold">{viewCar.brand} {viewCar.model}</div>
                  <div className="text-xs text-muted-foreground">{viewCar.year} · {viewCar.plate_number} · {viewCar.color}</div>
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm text-muted-foreground">
                Бронь будет действовать <span className="font-semibold text-foreground">20 минут</span>. Если за это время вы не начнёте аренду, бронь автоматически отменится.
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Промокод</Label>
                <Input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Введите код (необязательно)" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowBooking(false); setPromo(""); }}>Назад</Button>
            <Button disabled={bookM.isPending} onClick={() => viewCar && bookM.mutate({ car_id: viewCar.car_id, discount_code: promo || undefined })}>
              {bookM.isPending ? "Бронируем…" : "Подтвердить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: typeof CarIcon; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/50 text-muted-foreground shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
        <div className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
