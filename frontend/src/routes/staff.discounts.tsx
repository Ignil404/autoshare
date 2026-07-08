import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DiscountCreateRequest, DiscountOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/discounts")({ component: StaffDiscounts });

function StaffDiscounts() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-discounts"], queryFn: () => api.get<DiscountOut[]>("/api/v1/discounts/") });
  const [f, setF] = useState<DiscountCreateRequest>({ code: "", type: "percent", value: 10, valid_from: new Date().toISOString().slice(0, 10) });
  const createM = useMutation({
    mutationFn: (p: DiscountCreateRequest) => api.post<DiscountOut>("/api/v1/discounts/", p),
    onSuccess: () => { toast.success("Промокод создан"); qc.invalidateQueries({ queryKey: ["s-discounts"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Скидки</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Код</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
        <div className="space-y-2"><Label>Тип</Label><Input value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="percent / amount" /></div>
        <div className="space-y-2"><Label>Значение</Label><Input type="number" step="0.01" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Действует с</Label><Input type="date" value={f.valid_from ?? ""} onChange={(e) => setF({ ...f, valid_from: e.target.value })} /></div>
        <div className="space-y-2"><Label>Действует до</Label><Input type="date" value={f.valid_until ?? ""} onChange={(e) => setF({ ...f, valid_until: e.target.value || null })} /></div>
        <div className="space-y-2"><Label>Лимит использований</Label><Input type="number" value={f.usage_limit ?? ""} onChange={(e) => setF({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="sm:col-span-3"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать</Button></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
         <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Код</TableHead><TableHead>Тип</TableHead><TableHead>Значение</TableHead><TableHead>Период</TableHead><TableHead>Использ.</TableHead></TableRow></TableHeader>
           <TableBody>{(q.data ?? []).map((d) => (
             <TableRow key={d.discount_id}><TableCell>{d.discount_id}</TableCell><TableCell className="font-mono">{d.code}</TableCell><TableCell>{d.type}</TableCell><TableCell>{d.value}</TableCell>
               <TableCell>{fmtDate(d.valid_from)} — {fmtDate(d.valid_until)}</TableCell><TableCell>{d.used_count ?? 0}{d.usage_limit ? ` / ${d.usage_limit}` : ""}</TableCell></TableRow>
           ))}</TableBody></Table>}
      </CardContent></Card>
    </div>
  );
}