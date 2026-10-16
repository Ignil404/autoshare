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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export const Route = createFileRoute("/staff/discounts")({ component: StaffDiscounts });

function StaffDiscounts() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-discounts"], queryFn: () => api.get<DiscountOut[]>("/api/v1/discounts/") });
  const [f, setF] = useState<DiscountCreateRequest>({ code: "", type: "percent", value: 10, valid_from: new Date().toISOString().slice(0, 10) });
  const [search, setSearch] = useState("");

  const createM = useMutation({
    mutationFn: (p: DiscountCreateRequest) => api.post<DiscountOut>("/api/v1/discounts/", p),
    onSuccess: () => { toast.success("Промокод создан"); qc.invalidateQueries({ queryKey: ["s-discounts"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  let discounts = (q.data ?? [])
    .filter((d) => !search || d.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Скидки</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Код</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></div>
        <div className="space-y-2"><Label>Тип</Label><Input value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="percent / amount" /></div>
        <div className="space-y-2"><Label>Значение</Label><Input type="number" step="0.01" value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Действует с</Label><Input type="date" value={f.valid_from ?? ""} onChange={(e) => setF({ ...f, valid_from: e.target.value })} /></div>
        <div className="space-y-2"><Label>Действует до</Label><Input type="date" value={f.valid_until ?? ""} onChange={(e) => setF({ ...f, valid_until: e.target.value || null })} /></div>
        <div className="space-y-2"><Label>Лимит использований</Label><Input type="number" value={f.usage_limit ?? ""} onChange={(e) => setF({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="sm:col-span-3"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Создать</Button></div>
      </CardContent></Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по коду…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card><CardContent className="pt-6">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow>
             <TableHead>ID</TableHead><TableHead>Код</TableHead><TableHead>Тип</TableHead>
             <TableHead>Значение</TableHead><TableHead>Период</TableHead><TableHead>Использ.</TableHead>
           </TableRow></TableHeader>
           <TableBody>
             {discounts.length === 0 ? (
               <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Нет промокодов по заданному поиску</TableCell></TableRow>
             ) : discounts.map((d) => (
               <TableRow key={d.discount_id} className="hover:bg-secondary/30 transition-colors">
                 <TableCell className="font-mono text-xs">{d.discount_id}</TableCell>
                 <TableCell><span className="font-mono text-sm font-medium">{d.code}</span></TableCell>
                 <TableCell><Badge variant="secondary">{d.type}</Badge></TableCell>
                 <TableCell>{d.value}{d.type === "percent" ? "%" : ""}</TableCell>
                 <TableCell>{fmtDate(d.valid_from)} — {fmtDate(d.valid_until)}</TableCell>
                 <TableCell>{d.used_count ?? 0}{d.usage_limit ? ` / ${d.usage_limit}` : ""}</TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table></div>}
      </CardContent></Card>
    </div>
  );
}
