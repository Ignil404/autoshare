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
import { Loader2, Plus } from "lucide-react";

export const Route = createFileRoute("/staff/staff")({ component: StaffPeople });

function StaffPeople() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["staff-list"], queryFn: () => api.get<StaffOut[]>("/api/v1/staff/") });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<StaffCreateRequest>({ full_name: "", email: "", phone: "", password: "", role: "manager" });

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Сотрудники</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Добавить</Button></DialogTrigger>
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
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
         q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <Table>
           <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>ФИО</TableHead><TableHead>Email</TableHead><TableHead>Роль</TableHead><TableHead>Статус</TableHead><TableHead></TableHead></TableRow></TableHeader>
           <TableBody>
             {(q.data ?? []).map((s) => (
               <TableRow key={s.staff_id}>
                 <TableCell>{s.staff_id}</TableCell>
                 <TableCell>{s.full_name}</TableCell>
                 <TableCell>{s.email}<div className="text-xs text-muted-foreground">{s.phone}</div></TableCell>
                 <TableCell><Badge variant="secondary">{s.role}</Badge></TableCell>
                 <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                 <TableCell className="text-right">
                   <Button variant="destructive" size="sm" disabled={blockM.isPending || s.status === "blocked"} onClick={() => blockM.mutate(s.staff_id)}>Заблокировать</Button>
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>}
      </CardContent></Card>
    </div>
  );
}