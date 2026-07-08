import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ClientOut } from "@/lib/api-types";
import { apiErrorMessage, fmtMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Wallet, ShieldCheck, Ban } from "lucide-react";

export const Route = createFileRoute("/staff/clients")({ component: StaffClients });

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен", PENDING: "Ожидает", BLOCKED: "Заблокирован",
};

function StaffClients() {
  const qc = useQueryClient();
  const [id, setId] = useState("");
  const [loaded, setLoaded] = useState<ClientOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [topupFor, setTopupFor] = useState<ClientOut | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupComment, setTopupComment] = useState("");

  async function lookup() {
    if (!id) return;
    setLoading(true);
    try {
      const c = await api.get<ClientOut>(`/api/v1/clients/${id}`);
      setLoaded((prev) => [c, ...prev.filter((p) => p.client_id !== c.client_id)]);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }

  const verifyM = useMutation({
    mutationFn: (client_id: number) => api.post("/api/v1/clients/verify", { client_id }),
    onSuccess: (_, cid) => { toast.success("Клиент верифицирован"); setLoaded((p) => p.map((c) => c.client_id === cid ? { ...c, status: "ACTIVE", is_email_verified: true } : c)); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const blockM = useMutation({
    mutationFn: (client_id: number) => api.post(`/api/v1/clients/${client_id}/block`),
    onSuccess: (_, cid) => { toast.success("Клиент заблокирован"); setLoaded((p) => p.map((c) => c.client_id === cid ? { ...c, status: "BLOCKED" } : c)); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const topupM = useMutation({
    mutationFn: (v: { id: number; amount: number; comment: string }) => api.post(`/api/v1/clients/${v.id}/topup`, { amount: v.amount, comment: v.comment }),
    onSuccess: (_, v) => {
      toast.success(`Баланс пополнен на ${fmtMoney(v.amount)}`);
      setLoaded((p) => p.map((c) => c.client_id === v.id ? { ...c, balance: Number(c.balance) + v.amount } : c));
      setTopupFor(null); setTopupAmount(""); setTopupComment("");
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Клиенты</h1>
      <Card><CardContent className="pt-6 space-y-3">
        <div className="text-sm text-muted-foreground">
          Найдите клиента по ID (получить его можно из брони/аренды).
        </div>
        <div className="flex gap-2">
          <Input placeholder="ID клиента" value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" />
          <Button onClick={lookup} disabled={loading} className="shadow-sm"><Search className="h-4 w-4 mr-2" />Найти</Button>
        </div>
      </CardContent></Card>

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}

      {loaded.length > 0 && (
        <Card><CardContent className="pt-6">
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>ID</TableHead><TableHead>ФИО</TableHead><TableHead>Контакты</TableHead>
              <TableHead>Статус</TableHead><TableHead>Баланс</TableHead><TableHead className="text-right">Действия</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loaded.map((c) => (
                <TableRow key={c.client_id} className="hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-mono text-xs">{c.client_id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{c.last_name} {c.first_name}</div>
                    <div className="text-xs text-muted-foreground">ВУ: {c.license_number}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{c.email}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </TableCell>
                  <TableCell><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ""}`}>{STATUS_LABELS[c.status] ?? c.status}</span></TableCell>
                  <TableCell className="font-medium">{fmtMoney(c.balance)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="hover:bg-green-50 hover:text-green-700 hover:border-green-300" onClick={() => { setTopupFor(c); setTopupAmount(""); setTopupComment(""); }}>
                        <Wallet className="h-3.5 w-3.5 mr-1" />Пополнить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => verifyM.mutate(c.client_id)} disabled={verifyM.isPending || c.status === "ACTIVE"}>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />Верифицировать
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => blockM.mutate(c.client_id)} disabled={blockM.isPending || c.status === "BLOCKED"}>
                        <Ban className="h-3.5 w-3.5 mr-1" />Заблокировать
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table></div>
        </CardContent></Card>
      )}

      <Dialog open={!!topupFor} onOpenChange={(o) => !o && setTopupFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Пополнение баланса</DialogTitle>
          </DialogHeader>
          {topupFor && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">{topupFor.last_name} {topupFor.first_name}</div>
                  <div className="text-xs text-muted-foreground">Текущий баланс: {fmtMoney(topupFor.balance)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Сумма пополнения (BYN)</Label>
                <Input type="number" min="0" step="0.01" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Комментарий</Label>
                <Input value={topupComment} onChange={(e) => setTopupComment(e.target.value)} placeholder="Необязательно" />
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                Новый баланс: {fmtMoney(Number(topupFor.balance) + (Number(topupAmount) || 0))}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setTopupFor(null)}>Отмена</Button>
            <Button disabled={topupM.isPending || !topupAmount || Number(topupAmount) <= 0} onClick={() => topupFor && topupM.mutate({ id: topupFor.client_id, amount: Number(topupAmount), comment: topupComment })}>
              {topupM.isPending ? "Пополняем…" : "Пополнить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
