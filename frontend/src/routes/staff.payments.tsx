import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { PaymentCreateRequest, PaymentOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime, fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/staff/payments")({ component: StaffPayments });

const PAYMENT_TYPES = ["topup", "rental", "fine", "refund"];
const PAYMENT_STATUSES = ["COMPLETED", "PENDING", "FAILED"];
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};
const TYPE_LABELS: Record<string, string> = {
  topup: "Пополнение", rental: "Аренда", fine: "Штраф", refund: "Возврат",
};

function StaffPayments() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-payments"], queryFn: () => api.get<PaymentOut[]>("/api/v1/payments/") });
  const [f, setF] = useState<PaymentCreateRequest>({ client_id: 0, amount: 0, payment_type: "topup", rental_id: null });
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortKey, setSortKey] = useState<"payment_id" | "amount" | "created_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const createM = useMutation({
    mutationFn: (p: PaymentCreateRequest) => api.post<PaymentOut>("/api/v1/payments/", p),
    onSuccess: () => { toast.success("Платёж создан"); qc.invalidateQueries({ queryKey: ["s-payments"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  let payments = (q.data ?? [])
    .filter((p) => !search || `${p.payment_id} ${p.client_id} ${p.rental_id ?? ""} ${p.payment_type}`.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => filterType === "all" || p.payment_type === filterType)
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(String(bv)) : (av ?? 0) - (bv ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Платежи</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-4">
        <div className="space-y-2"><Label>Клиент ID</Label><Input type="number" value={f.client_id || ""} onChange={(e) => setF({ ...f, client_id: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Аренда ID</Label><Input type="number" value={f.rental_id ?? ""} onChange={(e) => setF({ ...f, rental_id: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-2"><Label>Сумма</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Тип</Label><Input value={f.payment_type} onChange={(e) => setF({ ...f, payment_type: e.target.value })} placeholder="topup / rental / fine" /></div>
        <div className="sm:col-span-4"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Провести платёж</Button></div>
      </CardContent></Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по ID, клиенту, типу…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-36"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {PAYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="pt-6">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow>
             <SortHead label="ID" field="payment_id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Клиент</TableHead><TableHead>Аренда</TableHead>
             <SortHead label="Сумма" field="amount" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Тип</TableHead><TableHead>Статус</TableHead>
             <SortHead label="Дата" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
           </TableRow></TableHeader>
           <TableBody>
             {payments.length === 0 ? (
               <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет платежей по заданным фильтрам</TableCell></TableRow>
             ) : payments.map((p) => (
               <TableRow key={p.payment_id} className="hover:bg-secondary/30 transition-colors">
                 <TableCell className="font-mono text-xs">{p.payment_id}</TableCell>
                 <TableCell>#{p.client_id}</TableCell>
                 <TableCell>{p.rental_id ?? "—"}</TableCell>
                 <TableCell>{fmtMoney(p.amount)}</TableCell>
                 <TableCell><Badge variant="secondary">{TYPE_LABELS[p.payment_type] ?? p.payment_type}</Badge></TableCell>
                 <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status ?? ""] ?? ""}`}>{p.status ?? "—"}</span></TableCell>
                 <TableCell>{fmtDateTime(p.created_at)}</TableCell>
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
