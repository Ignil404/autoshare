import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ClientOut, PaymentOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, IdCard, Wallet, Calendar, AlertTriangle, Plus, Lock, ArrowDownLeft, ArrowUpRight, CreditCard, Send } from "lucide-react";

export const Route = createFileRoute("/client/profile")({ component: ClientProfile });

function ClientProfile() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["client-me"], queryFn: () => api.get<ClientOut>("/api/v1/clients/me") });
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");

  const topupM = useMutation({
    mutationFn: (amount: number) => api.post<ClientOut>("/api/v1/clients/me/topup", { amount }),
    onSuccess: () => { toast.success("Баланс пополнен!"); qc.invalidateQueries({ queryKey: ["client-me"] }); qc.invalidateQueries({ queryKey: ["client-stats"] }); setTopupOpen(false); setTopupAmount(""); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const pwM = useMutation({
    mutationFn: (v: { old_password: string; new_password: string }) => api.post("/api/v1/auth/change-password", v),
    onSuccess: () => { toast.success("Пароль изменён"); setPwOpen(false); setPwOld(""); setPwNew(""); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const verifyM = useMutation({
    mutationFn: () => api.post("/api/v1/email/request", { email: q.data?.email }),
    onSuccess: (d: any) => { toast.success(`Письмо отправлено. Токен: ${d.token}`); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (q.isLoading) return (
    <div className="space-y-5 page-enter">
      <Skeleton className="h-8 w-32" />
      <div className="rounded-2xl border p-6 space-y-4"><div className="flex items-start justify-between"><div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-24" /></div><Skeleton className="h-5 w-20 rounded-full" /></div><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div></div>
      <div className="rounded-2xl border p-6 space-y-4"><div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-xl" /><div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-24" /></div></div></div>
    </div>
  );
  if (q.error) return <p className="text-destructive">{apiErrorMessage(q.error)}</p>;
  const me = q.data!;
  const verified = me.status === "ACTIVE" && me.is_email_verified;

  return (
    <div className="space-y-5 page-enter">
      <div><h1 className="text-2xl font-bold tracking-tight">Мой профиль</h1><p className="text-sm text-muted-foreground mt-1">Личные данные, баланс и история.</p></div>

      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 transition-all hover:shadow-md">
        <div className="flex items-start justify-between mb-4">
          <div><h2 className="text-xl font-bold">{me.last_name} {me.first_name} {me.middle_name ?? ""}</h2><p className="text-sm text-muted-foreground mt-0.5">Клиент #{me.client_id}</p></div>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${verified ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{verified ? "Верифицирован" : me.status}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row icon={Mail} label="Email" value={me.email} verified={me.is_email_verified} />
          <Row icon={Phone} label="Телефон" value={me.phone} />
          <Row icon={Calendar} label="Дата рождения" value={fmtDate(me.birth_date)} />
          <Row icon={IdCard} label="Вод. удостоверение" value={me.license_number} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-6 transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Wallet className="h-6 w-6" /></div>
            <div><div className="text-sm text-muted-foreground">Баланс</div><div className="text-2xl font-bold">{fmtMoney(me.balance)}</div></div>
          </div>
          <Button onClick={() => { setTopupOpen(true); setTopupAmount(""); }} className="shadow-md shadow-primary/15 hover-lift"><Plus className="h-4 w-4 mr-1.5" /> Пополнить</Button>
        </div>
        <div className="rounded-xl bg-secondary/30 p-3 text-xs text-muted-foreground">Пополнение через банковскую карту. Средства зачисляются мгновенно.</div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">История платежей</h2>
        <PaymentHistory />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Безопасность</h2>
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/50 text-muted-foreground"><Lock className="h-5 w-5" /></div>
            <div><div className="font-semibold">Смена пароля</div><div className="text-xs text-muted-foreground">Для изменения введите текущий и новый пароль</div></div>
          </div>
          <Button onClick={() => { setPwOpen(true); setPwOld(""); setPwNew(""); }} variant="outline">Изменить пароль</Button>
        </div>
      </div>

      {!verified && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 transition-all hover:shadow-md">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-600 shrink-0 mt-0.5"><AlertTriangle className="h-4 w-4" /></div>
            <div><h3 className="font-semibold text-sm text-amber-800">Требуется верификация</h3><p className="text-xs text-amber-700 mt-1 leading-relaxed">Для аренды автомобиля необходимо пройти верификацию водительского удостоверения.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => verifyM.mutate()} disabled={verifyM.isPending}>
                <Send className="h-3.5 w-3.5 mr-1" /> {verifyM.isPending ? "Отправляем…" : "Подтвердить email"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={topupOpen} onOpenChange={(o) => !o && setTopupOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-xl">Пополнение баланса</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></div><div><div className="text-sm text-muted-foreground">Текущий баланс</div><div className="font-semibold">{fmtMoney(me.balance)}</div></div></div>
            <div className="space-y-2"><Label className="text-sm">Сумма (BYN)</Label><Input type="number" min="1" max="10000" step="0.01" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="Введите сумму" /></div>
            <div className="grid grid-cols-3 gap-2">{[10, 50, 100].map((v) => (<Button key={v} variant="outline" size="sm" onClick={() => setTopupAmount(String(v))} className="hover:bg-primary/5 hover:border-primary/30">{v} BYN</Button>))}</div>
            {topupAmount && Number(topupAmount) > 0 && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">Новый баланс: {fmtMoney(Number(me.balance) + Number(topupAmount))}</div>}
          </div>
          <DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setTopupOpen(false)}>Отмена</Button><Button disabled={topupM.isPending || !topupAmount || Number(topupAmount) <= 0} onClick={() => topupM.mutate(Number(topupAmount))}>{topupM.isPending ? "Пополняем…" : "Пополнить"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwOpen} onOpenChange={(o) => !o && setPwOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-xl">Смена пароля</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label className="text-sm">Текущий пароль</Label><Input type="password" value={pwOld} onChange={(e) => setPwOld(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-sm">Новый пароль</Label><Input type="password" minLength={6} value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Минимум 6 символов" /></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="ghost" onClick={() => setPwOpen(false)}>Отмена</Button><Button disabled={pwM.isPending || !pwOld || !pwNew || pwNew.length < 6} onClick={() => pwM.mutate({ old_password: pwOld, new_password: pwNew })}>{pwM.isPending ? "Сохраняем…" : "Сохранить"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentHistory() {
  const q = useQuery({ queryKey: ["client-payments"], queryFn: () => api.get<PaymentOut[]>("/api/v1/clients/me/payments") });
  const typeLabels: Record<string, string> = { TOPUP: "Пополнение", RENTAL: "Аренда", FINE: "Штраф", REFUND: "Возврат" };
  const typeColors: Record<string, string> = { TOPUP: "text-green-600", RENTAL: "text-red-600", FINE: "text-orange-600", REFUND: "text-blue-600" };

  if (q.isLoading) return <div className="space-y-2 mt-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (q.error) return <p className="text-destructive mt-4">{apiErrorMessage(q.error)}</p>;
  const payments = q.data ?? [];

  return (
    <div className="rounded-2xl border bg-card p-6 mt-4">
      {payments.length === 0 ? (
        <div className="py-8 text-center"><div className="text-3xl mb-2">💳</div><p className="text-muted-foreground font-medium">Нет платежей</p></div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.payment_id} className="flex items-center gap-3 rounded-xl border p-3 hover:bg-secondary/30 transition-colors">
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${p.payment_type === "TOPUP" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                {p.payment_type === "TOPUP" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{typeLabels[p.payment_type] ?? p.payment_type}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(p.processed_at)}</div>
              </div>
              <div className={`font-semibold text-sm ${typeColors[p.payment_type] ?? ""}`}>
                {p.payment_type === "TOPUP" ? "+" : "−"}{fmtMoney(p.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value, verified }: { icon: typeof Mail; label: string; value: string; verified?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 hover:bg-secondary/30 hover:shadow-sm">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/50 text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="text-sm font-medium truncate flex items-center gap-1.5">{value}{verified !== undefined && <span className={`text-[10px] ${verified ? "text-green-600" : "text-amber-500"}`}>{verified ? "✓" : "○"}</span>}</div></div>
    </div>
  );
}
