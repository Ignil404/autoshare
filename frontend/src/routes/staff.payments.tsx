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
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/payments")({ component: StaffPayments });

function StaffPayments() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["s-payments"], queryFn: () => api.get<PaymentOut[]>("/api/v1/payments/") });
  const [f, setF] = useState<PaymentCreateRequest>({ client_id: 0, amount: 0, payment_type: "topup", rental_id: null });
  const createM = useMutation({
    mutationFn: (p: PaymentCreateRequest) => api.post<PaymentOut>("/api/v1/payments/", p),
    onSuccess: () => { toast.success("Платёж создан"); qc.invalidateQueries({ queryKey: ["s-payments"] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Платежи</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-4">
        <div className="space-y-2"><Label>Клиент ID</Label><Input type="number" value={f.client_id || ""} onChange={(e) => setF({ ...f, client_id: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Аренда ID</Label><Input type="number" value={f.rental_id ?? ""} onChange={(e) => setF({ ...f, rental_id: e.target.value ? Number(e.target.value) : null })} /></div>
        <div className="space-y-2"><Label>Сумма</Label><Input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Тип</Label><Input value={f.payment_type} onChange={(e) => setF({ ...f, payment_type: e.target.value })} placeholder="topup / rental / fine" /></div>
        <div className="sm:col-span-4"><Button disabled={createM.isPending} onClick={() => createM.mutate(f)}>Провести платёж</Button></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Клиент</TableHead><TableHead>Аренда</TableHead><TableHead>Сумма</TableHead><TableHead>Тип</TableHead><TableHead>Статус</TableHead><TableHead>Дата</TableHead></TableRow></TableHeader>
           <TableBody>{(q.data ?? []).map((p) => (
             <TableRow key={p.payment_id}><TableCell>{p.payment_id}</TableCell><TableCell>#{p.client_id}</TableCell><TableCell>{p.rental_id ?? "—"}</TableCell>
               <TableCell>{fmtMoney(p.amount)}</TableCell><TableCell>{p.payment_type}</TableCell>
               <TableCell><Badge>{p.status ?? "—"}</Badge></TableCell><TableCell>{fmtDateTime(p.created_at)}</TableCell></TableRow>
           ))}</TableBody></Table></div>}
      </CardContent></Card>
    </div>
  );
}