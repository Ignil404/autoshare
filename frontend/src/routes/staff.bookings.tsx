import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { BookingOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/staff/bookings")({ component: StaffBookings });

const STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-green-50 text-green-700 border-green-200",
  CONVERTED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED_CLIENT: "bg-gray-50 text-gray-600 border-gray-200",
  CANCELLED_STAFF: "bg-orange-50 text-orange-700 border-orange-200",
  CANCELLED_TIMER: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  CREATED: "Активна", CONVERTED: "В аренде",
  CANCELLED_CLIENT: "Отменена клиентом", CANCELLED_STAFF: "Отменена staff", CANCELLED_TIMER: "Истекла",
};

function StaffBookings() {
  const q = useQuery({ queryKey: ["s-bookings-all"], queryFn: () => api.get<BookingOut[]>("/api/v1/bookings/") });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortKey, setSortKey] = useState<"booking_id" | "created_at" | "expires_at">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  let bookings = (q.data ?? [])
    .filter((b) => !search || `#${b.booking_id}`.includes(search) || `#${b.client_id}`.includes(search) || `#${b.car_id}`.includes(search))
    .filter((b) => filterStatus === "all" || b.status === filterStatus)
    .sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" && typeof bv === "string" ? av.localeCompare(bv) : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Бронирования</h1>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по ID, клиенту, авто…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="sm:w-52"><SelectValue placeholder="Статус" /></SelectTrigger>
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
             <SortHead label="ID" field="booking_id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Клиент</TableHead><TableHead>Авто</TableHead><TableHead>Скидка</TableHead>
             <SortHead label="Создано" field="created_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <SortHead label="Истекает" field="expires_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
             <TableHead>Статус</TableHead>
           </TableRow></TableHeader>
           <TableBody>
             {bookings.length === 0 ? (
               <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет бронирований по заданным фильтрам</TableCell></TableRow>
             ) : bookings.map((b) => (
               <TableRow key={b.booking_id} className="hover:bg-secondary/30 transition-colors">
                 <TableCell className="font-mono text-xs">{b.booking_id}</TableCell>
                 <TableCell>#{b.client_id}</TableCell><TableCell>#{b.car_id}</TableCell>
                 <TableCell>{b.discount_id ?? "—"}</TableCell>
                 <TableCell className="text-xs">{fmtDateTime(b.created_at)}</TableCell>
                 <TableCell className="text-xs">{fmtDateTime(b.expires_at)}</TableCell>
                 <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? ""}`}>{STATUS_LABELS[b.status] ?? b.status}</span></TableCell>
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
