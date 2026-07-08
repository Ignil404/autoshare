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
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/maintenance")({ component: StaffMaintenance });

function StaffMaintenance() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-maint-all"], queryFn: () => api.get<MaintenanceOut[]>("/api/v1/maintenance/") });
  const [f, setF] = useState<MaintenanceCreateRequest>({ car_id: 0, work_type: "", description: "" });
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
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Техобслуживание</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Авто ID</Label><Input type="number" value={f.car_id || ""} onChange={(e) => setF({ ...f, car_id: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Тип работ</Label><Input value={f.work_type} onChange={(e) => setF({ ...f, work_type: e.target.value })} /></div>
        <div className="space-y-2"><Label>Механик (staff_id)</Label><Input type="number" value={f.assigned_to_staff_id ?? ""} onChange={(e) => setF({ ...f, assigned_to_staff_id: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-2 sm:col-span-3"><Label>Описание</Label><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        <div className="sm:col-span-3"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать</Button></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Авто</TableHead><TableHead>Тип</TableHead><TableHead>Механик</TableHead><TableHead>Создано</TableHead><TableHead>Закрыто</TableHead><TableHead>Статус</TableHead><TableHead></TableHead></TableRow></TableHeader>
           <TableBody>{(q.data ?? []).map((m) => {
             const isClosed = !!m.completed_at || m.status === "closed";
             return <TableRow key={m.maintenance_id}><TableCell>{m.maintenance_id}</TableCell><TableCell>#{m.car_id}</TableCell><TableCell>{m.work_type}</TableCell>
               <TableCell>{m.assigned_to_staff_id ?? "—"}</TableCell><TableCell>{fmtDateTime(m.created_at)}</TableCell><TableCell>{fmtDateTime(m.completed_at)}</TableCell>
               <TableCell><Badge variant={isClosed ? "secondary" : "default"}>{m.status ?? (isClosed ? "closed" : "open")}</Badge></TableCell>
               <TableCell className="text-right">{!isClosed && <Button size="sm" disabled={closeM.isPending} onClick={() => closeM.mutate({ id: m.maintenance_id })}>Закрыть</Button>}</TableCell>
             </TableRow>;
           })}</TableBody></Table></div>}
      </CardContent></Card>
    </div>
  );
}