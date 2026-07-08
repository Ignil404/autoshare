import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { TariffCreateRequest, TariffOut, ZoneCreateRequest, ZoneOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDate, fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/tariffs")({ component: StaffTariffs });

function StaffTariffs() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Тарифы и зоны</h1>
      <Tabs defaultValue="tariffs">
        <TabsList><TabsTrigger value="tariffs">Тарифы</TabsTrigger><TabsTrigger value="zones">Зоны</TabsTrigger></TabsList>
        <TabsContent value="tariffs"><TariffsTab /></TabsContent>
        <TabsContent value="zones"><ZonesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function TariffsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-tariffs"], queryFn: () => api.get<TariffOut[]>("/api/v1/tariffs/") });
  const [f, setF] = useState<TariffCreateRequest>({ name: "", tariff_type: "per_minute", rate_active: 0, rate_pause: 0, min_charge: 0 });
  const createM = useMutation({
    mutationFn: (p: TariffCreateRequest) => api.post<TariffOut>("/api/v1/tariffs/", p),
    onSuccess: () => { toast.success("Тариф создан"); qc.invalidateQueries({ queryKey: ["s-tariffs"] }); setF({ name: "", tariff_type: "per_minute", rate_active: 0, rate_pause: 0, min_charge: 0 }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const deactM = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/tariffs/${id}/deactivate`),
    onSuccess: () => { toast.success("Тариф деактивирован"); qc.invalidateQueries({ queryKey: ["s-tariffs"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="space-y-4 mt-4">
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2"><Label>Название</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-2"><Label>Тип</Label><Input value={f.tariff_type} onChange={(e) => setF({ ...f, tariff_type: e.target.value })} placeholder="per_minute / per_day" /></div>
        <div className="space-y-2"><Label>Зона ID</Label><Input type="number" value={f.zone_id ?? ""} onChange={(e) => setF({ ...f, zone_id: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-2"><Label>Ставка (активно)</Label><Input type="number" step="0.01" value={f.rate_active} onChange={(e) => setF({ ...f, rate_active: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Ставка (пауза)</Label><Input type="number" step="0.01" value={f.rate_pause} onChange={(e) => setF({ ...f, rate_pause: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Мин. заказ</Label><Input type="number" step="0.01" value={f.min_charge ?? 0} onChange={(e) => setF({ ...f, min_charge: Number(e.target.value) })} /></div>
        <div className="sm:col-span-2 lg:col-span-3"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать тариф</Button></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
         <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Название</TableHead><TableHead>Тип</TableHead><TableHead>Актив/Пауза</TableHead><TableHead>Мин</TableHead><TableHead>Зона</TableHead><TableHead>Статус</TableHead><TableHead>С</TableHead><TableHead></TableHead></TableRow></TableHeader>
           <TableBody>{(q.data ?? []).map((t) => (
             <TableRow key={t.tariff_id}><TableCell>{t.tariff_id}</TableCell><TableCell>{t.name}</TableCell><TableCell>{t.tariff_type}</TableCell>
               <TableCell>{fmtMoney(t.rate_active)} / {fmtMoney(t.rate_pause)}</TableCell><TableCell>{fmtMoney(t.min_charge)}</TableCell>
               <TableCell>{t.zone_id ?? "—"}</TableCell><TableCell><Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
               <TableCell>{fmtDate(t.valid_from)}</TableCell>
               <TableCell className="text-right"><Button size="sm" variant="destructive" disabled={t.status !== "active" || deactM.isPending} onClick={() => deactM.mutate(t.tariff_id)}>Деактивировать</Button></TableCell>
             </TableRow>))}
           </TableBody></Table>}
      </CardContent></Card>
    </div>
  );
}

function ZonesTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-zones"], queryFn: () => api.get<ZoneOut[]>("/api/v1/tariffs/zones") });
  const [f, setF] = useState<ZoneCreateRequest>({ name: "", zone_type: "operational", boundary: "" });
  const createM = useMutation({
    mutationFn: (p: ZoneCreateRequest) => api.post<ZoneOut>("/api/v1/tariffs/zones", p),
    onSuccess: () => { toast.success("Зона создана"); qc.invalidateQueries({ queryKey: ["s-zones"] }); setF({ name: "", zone_type: "operational", boundary: "" }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="space-y-4 mt-4">
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Название</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="space-y-2"><Label>Тип зоны</Label><Input value={f.zone_type} onChange={(e) => setF({ ...f, zone_type: e.target.value })} placeholder="operational / parking" /></div>
        <div className="space-y-2"><Label>Boundary (WKT/GeoJSON)</Label><Input value={f.boundary} onChange={(e) => setF({ ...f, boundary: e.target.value })} /></div>
        <div className="sm:col-span-3"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать зону</Button></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
         <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Название</TableHead><TableHead>Тип</TableHead></TableRow></TableHeader>
           <TableBody>{(q.data ?? []).map((z) => (
             <TableRow key={z.zone_id}><TableCell>{z.zone_id}</TableCell><TableCell>{z.name}</TableCell><TableCell>{z.zone_type}</TableCell></TableRow>
           ))}</TableBody></Table>}
      </CardContent></Card>
    </div>
  );
}