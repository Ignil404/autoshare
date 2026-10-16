import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { StaffCreateRequest, StaffOut } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";

export const Route = createFileRoute("/staff/staff")({ component: StaffPeople });

const ROLES = ["admin", "manager", "support", "mechanic"];
const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор", manager: "Менеджер", support: "Поддержка", mechanic: "Механик",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
};

function StaffPeople() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["staff-list"], queryFn: () => api.get<StaffOut[]>("/api/v1/staff/") });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<StaffCreateRequest>({ full_name: "", email: "", phone: "", password: "", role: "manager" });
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const createM = useMutation({
    mutationFn: (payload: StaffCreateRequest) => api.post<StaffOut>("/api/v1/staff/", payload),
    onSuccess: () => { toast.success("Сотрудник создан"); qc.invalidateQueries({ queryKey: ["staff-list"] }); setOpen(false); setF({ full_name: "", email: "", phone: "", password: "", role: "manager" }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const blockM = useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/staff/${id}/block`),
    onSuccess: () => { toast.success("Сотрудник заблокирован"); qc.invalidateQueries({ queryKey: ["staff-list"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  let staff = (q.data ?? [])
    .filter((s) => !search || `${s.full_name} ${s.email} ${s.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    .filter((s) => filterRole === "all" || s.role === filterRole);

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Сотрудники</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="shadow-md shadow-primary/15"><Plus className="h-4 w-4 mr-2" />Добавить</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новый сотрудник</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2"><Label>ФИО</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Телефон</Label><Input value={f.phone ?? ""} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Пароль</Label><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
              <div className="space-y-2"><Label>Роль</Label>
                <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="manager">Менеджер</SelectItem>
                    <SelectItem value="support">Поддержка</SelectItem>
                    <SelectItem value="mechanic">Механик</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
              <Button disabled={createM.isPending} onClick={() => createM.mutate({ ...f, phone: f.phone || null })}>Создать</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по ФИО, email, телефону…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Роль" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="pt-6">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow>
             <TableHead>ID</TableHead><TableHead>ФИО</TableHead><TableHead>Email</TableHead>
             <TableHead>Роль</TableHead><TableHead>Статус</TableHead><TableHead></TableHead>
           </TableRow></TableHeader>
           <TableBody>
             {staff.length === 0 ? (
               <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Нет сотрудников по заданным фильтрам</TableCell></TableRow>
             ) : staff.map((s) => (
               <TableRow key={s.staff_id} className="hover:bg-secondary/30 transition-colors">
                 <TableCell className="font-mono text-xs">{s.staff_id}</TableCell>
                 <TableCell>{s.full_name}</TableCell>
                 <TableCell>{s.email}<div className="text-xs text-muted-foreground">{s.phone}</div></TableCell>
                 <TableCell><Badge variant="secondary">{ROLE_LABELS[s.role] ?? s.role}</Badge></TableCell>
                 <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status] ?? ""}`}>{s.status === "active" ? "Активен" : s.status === "blocked" ? "Заблокирован" : s.status}</span></TableCell>
                 <TableCell className="text-right">
                   <Button variant="destructive" size="sm" disabled={blockM.isPending || s.status === "blocked"} onClick={() => blockM.mutate(s.staff_id)}>Заблокировать</Button>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table></div>}
      </CardContent></Card>
    </div>
  );
}
