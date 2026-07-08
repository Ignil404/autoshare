import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, saveTokens } from "@/lib/api";
import type { RegisterRequest, TokenResponse } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/format";
import { UserPlus, Mail, Lock, Phone, CreditCard, Calendar } from "lucide-react";

export const Route = createFileRoute("/auth/register")({ component: Register });

function Register() {
  const navigate = useNavigate();
  const [f, setF] = useState<RegisterRequest>({
    last_name: "", first_name: "", middle_name: "", birth_date: "", phone: "",
    email: "", password: "", license_number: "", license_issued: "",
  });
  const [loading, setLoading] = useState(false);
  function set<K extends keyof RegisterRequest>(k: K, v: RegisterRequest[K]) { setF((p) => ({ ...p, [k]: v })); }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const payload: RegisterRequest = { ...f, middle_name: f.middle_name || null };
      const t = await api.post<TokenResponse>("/api/v1/auth/register", payload);
      saveTokens(t, "client");
      toast.success("Аккаунт создан. Для аренды дождитесь верификации.");
      navigate({ to: "/client" });
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }
  return (
    <AuthShell title="Регистрация клиента" subtitle="Заполните данные для доступа к каршерингу"
      footer={<span>Уже есть аккаунт? <Link to="/auth/login" className="text-primary font-medium hover:underline">Войдите</Link></span>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg bg-secondary/30 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Личные данные</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Фамилия</Label><Input required value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Имя</Label><Input required value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Отчество</Label><Input value={f.middle_name ?? ""} onChange={(e) => set("middle_name", e.target.value)} placeholder="Необязательно" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Дата рождения</Label>
            <Input type="date" required value={f.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Телефон</Label>
            <Input required placeholder="+375…" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg bg-secondary/30 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Аккаунт</div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
          <Input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> Пароль</Label>
          <Input type="password" required minLength={6} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="Минимум 6 символов" />
        </div>
        <div className="rounded-lg bg-secondary/30 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Водительское удостоверение</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><CreditCard className="h-3 w-3" /> Номер</Label>
            <Input required value={f.license_number} onChange={(e) => set("license_number", e.target.value)} placeholder="1234АВ1" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Дата выдачи</Label>
            <Input type="date" required value={f.license_issued} onChange={(e) => set("license_issued", e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 shadow-md shadow-primary/15" disabled={loading}>
          {loading ? "Создаём…" : <><UserPlus className="h-4 w-4 mr-2" /> Создать аккаунт</>}
        </Button>
      </form>
    </AuthShell>
  );
}
