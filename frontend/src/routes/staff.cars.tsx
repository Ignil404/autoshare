import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CarCreateRequest, CarOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, ArrowUpDown, ChevronUp, ChevronDown, Camera } from "lucide-react";

export const Route = createFileRoute("/staff/cars")({ component: StaffCars });

const STATUSES = ["FREE", "BOOKED", "RENTED", "MAINTENANCE", "UNAVAILABLE"];
const STATUS_COLORS: Record<string, string> = {
  FREE: "bg-green-50 text-green-700 border-green-200",
  BOOKED: "bg-blue-50 text-blue-700 border-blue-200",
  RENTED: "bg-amber-50 text-amber-700 border-amber-200",
  MAINTENANCE: "bg-red-50 text-red-700 border-red-200",
  UNAVAILABLE: "bg-gray-50 text-gray-600 border-gray-200",
};
const STATUS_LABELS: Record<string, string> = {
  FREE: "Свободна", BOOKED: "Забронирована", RENTED: "В аренде",
  MAINTENANCE: "ТО", UNAVAILABLE: "Недоступна",
};
const CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Эконом", COMFORT: "Комфорт", BUSINESS: "Бизнес",
};

function StaffCars() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-cars-all"], queryFn: () => api.get<CarOut[]>("/api/v1/cars/") });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState<"car_id" | "brand" | "mileage">("car_id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [f, setF] = useState<CarCreateRequest>({ plate_number: "", brand: "", model: "", year: new Date().getFullYear(), color: "", car_class: "ECONOMY" });
  const createM = useMutation({
    mutationFn: (p: CarCreateRequest) => api.post<CarOut>("/api/v1/cars/", p),
    onSuccess: () => { toast.success("Автомобиль добавлен"); qc.invalidateQueries({ queryKey: ["s-cars-all"] }); setOpen(false); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const statusM = useMutation({
    mutationFn: (v: { id: number; status: string }) => api.patch(`/api/v1/cars/${v.id}/status`, { status: v.status }),
    onSuccess: () => { toast.success("Статус обновлён"); qc.invalidateQueries({ queryKey: ["s-cars-all"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const photoM = useMutation({
    mutationFn: async (v: { id: number; file: File }) => {
      const auth = JSON.parse(localStorage.getItem("autoshare.auth") || "{}");
      const res = await fetch(`/api/v1/cars/${v.id}/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.access_token}` },
        body: (() => { const fd = new FormData(); fd.append("file", v.file); return fd; })(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => toast.success("Фото загружено"),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  let cars = (q.data ?? [])
    .filter((c) => !search || `${c.brand} ${c.model} ${c.plate_number}`.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => filterClass === "all" || c.car_class === filterClass)
    .filter((c) => filterStatus === "all" || c.status === filterStatus)
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : Number(av ?? 0) - Number(bv ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Автопарк</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="shadow-md shadow-primary/15"><Plus className="h-4 w-4 mr-2" />Добавить авто</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый автомобиль</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Госномер</Label><Input value={f.plate_number} onChange={(e) => setF({ ...f, plate_number: e.target.value })} /></div>
              <div className="space-y-2"><Label>Класс</Label>
                <Select value={f.car_class} onValueChange={(v) => setF({ ...f, car_class: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ECONOMY">Эконом</SelectItem><SelectItem value="COMFORT">Комфорт</SelectItem>
                    <SelectItem value="BUSINESS">Бизнес</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Марка</Label><Input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></div>
              <div className="space-y-2"><Label>Модель</Label><Input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></div>
              <div className="space-y-2"><Label>Год</Label><Input type="number" value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Цвет</Label><Input value={f.color ?? ""} onChange={(e) => setF({ ...f, color: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по марке, модели, номеру…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="sm:w-36"><SelectValue placeholder="Класс" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все классы</SelectItem>
            <SelectItem value="ECONOMY">Эконом</SelectItem>
            <SelectItem value="COMFORT">Комфорт</SelectItem>
            <SelectItem value="BUSINESS">Бизнес</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="pt-6">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow>
             <SortHead label="ID" field="car_id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <SortHead label="Авто" field="brand" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Номер</TableHead><TableHead>Класс</TableHead><TableHead>Статус</TableHead>
             <SortHead label="Пробег" field="mileage" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Посл. ТО</TableHead><TableHead>Действие</TableHead>
           </TableRow></TableHeader>
           <TableBody>
             {cars.length === 0 ? (
               <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Нет машин по заданным фильтрам</TableCell></TableRow>
             ) : cars.map((c) => (
                <TableRow key={c.car_id} className="hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-mono text-xs">{c.car_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`/api/v1/cars/${c.car_id}/photo`}
                        alt=""
                        className="h-9 w-12 rounded-lg object-cover border bg-secondary/30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div>
                        <div className="font-medium text-sm">{c.brand} {c.model}</div>
                        <div className="text-xs text-muted-foreground">{c.year}</div>
                      </div>
                    </div>
                  </TableCell>
                 <TableCell className="font-mono">{c.plate_number}</TableCell>
                 <TableCell><Badge variant="secondary">{CLASS_LABELS[c.car_class] ?? c.car_class}</Badge></TableCell>
                 <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ""}`}>{STATUS_LABELS[c.status] ?? c.status}</span></TableCell>
                 <TableCell>{c.mileage?.toLocaleString()} км</TableCell>
                 <TableCell>{fmtDate(c.last_service)}</TableCell>
                 <TableCell>
                   <div className="flex items-center gap-1">
                     <Select value={c.status} onValueChange={(v) => statusM.mutate({ id: c.car_id, status: v })}>
                       <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                       <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
                     </Select>
                     <label className="cursor-pointer">
                       <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) photoM.mutate({ id: c.car_id, file: f }); }} />
                       <div className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-secondary/50 transition-colors"><Camera className="h-3.5 w-3.5 text-muted-foreground" /></div>
                     </label>
                   </div>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table></div>}
      </CardContent></Card>
    </div>
  );
}

function SortHead({ label, field, sortKey, sortDir, onSort }: { label: string; field: string; sortKey: string; sortDir: string; onSort: (f: any) => void }) {
  const active = sortKey === field;
  return (
    <TableHead className="cursor-pointer select-none hover:bg-secondary/50 transition-colors" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </div>
    </TableHead>
  );
}
