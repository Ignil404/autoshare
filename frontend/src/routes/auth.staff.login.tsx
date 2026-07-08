import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, saveTokens } from "@/lib/api";
import type { TokenResponse } from "@/lib/api-types";
import { apiErrorMessage } from "@/lib/format";
import { LogIn, Mail, Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth/staff/login")({ component: StaffLogin });

function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const t = await api.post<TokenResponse>("/api/v1/auth/staff/login", { email, password });
      saveTokens(t, "staff");
      toast.success("Добро пожаловать!");
      navigate({ to: "/staff" });
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }
  return (
    <AuthShell title="Вход для персонала" subtitle="Служебный кабинет AutoShare"
      footer={<Link to="/auth/login" className="text-primary font-medium hover:underline">← Вернуться ко входу клиента</Link>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg bg-secondary/30 px-3 py-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div className="text-xs font-medium text-muted-foreground">Доступ только для сотрудников</div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Служебный email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="admin@autoshare.by" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Пароль</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 shadow-md shadow-primary/15" disabled={loading}>
          {loading ? "Входим…" : <><LogIn className="h-4 w-4 mr-2" /> Войти</>}
        </Button>
      </form>
    </AuthShell>
  );
}
