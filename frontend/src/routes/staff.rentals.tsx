import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { RentalOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime, fmtMinutes, fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/staff/rentals")({ component: StaffRentals });

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  PAUSED: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  FORCE_COMPLETED: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "В пути", PAUSED: "На паузе", COMPLETED: "Завершена", FORCE_COMPLETED: "Принудительно",
};

function StaffRentals() {
  const q = useQuery({ queryKey: ["s-rentals-all"], queryFn: () => api.get<RentalOut[]>("/api/v1/rentals/") });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState<"rental_id" | "started_at" | "total_cost">("started_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  let rentals = (q.data ?? [])
    .filter((r) => !search || `#${r.rental_id}`.includes(search) || `#${r.client_id}`.includes(search) || `#${r.car_id}`.includes(search))
    .filter((r) => filterStatus === "all" || r.status === filterStatus)
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : (Number(av) - Number(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Аренды</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по ID, клиенту, авто…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="pt-6">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow>
             <SortHead label="ID" field="rental_id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Клиент</TableHead><TableHead>Авто</TableHead>
             <SortHead label="Старт" field="started_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Финиш</TableHead><TableHead>Активно</TableHead><TableHead>Пауза</TableHead><TableHead>Км</TableHead>
             <SortHead label="Сумма" field="total_cost" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Статус</TableHead>
           </TableRow></TableHeader>
           <TableBody>
             {rentals.length === 0 ? (
               <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Нет аренд по заданным фильтрам</TableCell></TableRow>
             ) : rentals.map((r) => (
               <TableRow key={r.rental_id} className="hover:bg-secondary/30 transition-colors">
                 <TableCell className="font-mono text-xs">{r.rental_id}</TableCell>
                 <TableCell>#{r.client_id}</TableCell><TableCell>#{r.car_id}</TableCell>
                 <TableCell className="text-xs">{fmtDateTime(r.started_at)}</TableCell>
                 <TableCell className="text-xs">{fmtDateTime(r.finished_at)}</TableCell>
                 <TableCell>{fmtMinutes(r.active_minutes)}</TableCell><TableCell>{fmtMinutes(r.pause_minutes)}</TableCell>
                 <TableCell>{r.distance_km}</TableCell>
                 <TableCell className="font-medium">{fmtMoney(r.total_cost)}</TableCell>
                 <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status] ?? ""}`}>{STATUS_LABELS[r.status] ?? r.status}</span></TableCell>
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
