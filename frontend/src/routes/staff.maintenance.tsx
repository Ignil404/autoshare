import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { MaintenanceCreateRequest, MaintenanceOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export const Route = createFileRoute("/staff/maintenance")({ component: StaffMaintenance });

const STATUSES = ["open", "in_progress", "closed"];
const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-green-50 text-green-700 border-green-200",
};
const STATUS_LABELS: Record<string, string> = {
  open: "Открыто", in_progress: "В работе", closed: "Закрыто",
};

function StaffMaintenance() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-maint-all"], queryFn: () => api.get<MaintenanceOut[]>("/api/v1/maintenance/") });
  const [f, setF] = useState<MaintenanceCreateRequest>({ car_id: 0, work_type: "", description: "" });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const createM = useMutation({
    mutationFn: (p: MaintenanceCreateRequest) => api.post<MaintenanceOut>("/api/v1/maintenance/", p),
    onSuccess: () => { toast.success("Заявка на ТО создана"); qc.invalidateQueries({ queryKey: ["s-maint-all"] }); setF({ car_id: 0, work_type: "", description: "" }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const closeM = useMutation({
    mutationFn: (v: { id: number; description?: string }) => api.post(`/api/v1/maintenance/${v.id}/close`, { description: v.description ?? null }),
    onSuccess: () => { toast.success("ТО закрыто"); qc.invalidateQueries({ queryKey: ["s-maint-all"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  let items = (q.data ?? [])
    .filter((m) => !search || `${m.maintenance_id} ${m.car_id} ${m.work_type} ${m.assigned_to_staff_id ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .filter((m) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "closed") return !!m.completed_at || m.status === "closed";
      if (filterStatus === "open") return !m.completed_at && m.status !== "closed";
      return false;
    });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Техобслуживание</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Авто ID</Label><Input type="number" value={f.car_id || ""} onChange={(e) => setF({ ...f, car_id: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Тип работ</Label><Input value={f.work_type} onChange={(e) => setF({ ...f, work_type: e.target.value })} /></div>
        <div className="space-y-2"><Label>Механик (staff_id)</Label><Input type="number" value={f.assigned_to_staff_id ?? ""} onChange={(e) => setF({ ...f, assigned_to_staff_id: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-2 sm:col-span-3"><Label>Описание</Label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="sm:col-span-3"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать</Button></div>
      </CardContent></Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по ID, авто, типу работ…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-36"><SelectValue placeholder="Статус" /></SelectTrigger>
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
             <TableHead>ID</TableHead><TableHead>Авто</TableHead><TableHead>Тип</TableHead>
             <TableHead>Механик</TableHead><TableHead>Создано</TableHead><TableHead>Закрыто</TableHead>
             <TableHead>Статус</TableHead><TableHead></TableHead>
           </TableRow></TableHeader>
           <TableBody>
             {items.length === 0 ? (
               <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Нет записей по заданным фильтрам</TableCell></TableRow>
             ) : items.map((m) => {
               const isClosed = !!m.completed_at || m.status === "closed";
               const statusKey = isClosed ? "closed" : (m.status ?? "open");
               return (
                 <TableRow key={m.maintenance_id} className="hover:bg-secondary/30 transition-colors">
                   <TableCell className="font-mono text-xs">{m.maintenance_id}</TableCell>
                   <TableCell>#{m.car_id}</TableCell>
                   <TableCell>{m.work_type}</TableCell>
                   <TableCell>{m.assigned_to_staff_id ?? "—"}</TableCell>
                   <TableCell>{fmtDateTime(m.created_at)}</TableCell>
                   <TableCell>{fmtDateTime(m.completed_at)}</TableCell>
                   <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[statusKey] ?? ""}`}>{STATUS_LABELS[statusKey] ?? statusKey}</span></TableCell>
                   <TableCell className="text-right">{!isClosed && <Button size="sm" disabled={closeM.isPending} onClick={() => closeM.mutate({ id: m.maintenance_id })}>Закрыть</Button>}</TableCell>
                 </TableRow>
               );
             })}
           </TableBody>
         </Table></div>}
      </CardContent></Card>
    </div>
  );
}
