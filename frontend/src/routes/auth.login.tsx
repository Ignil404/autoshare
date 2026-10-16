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
import { useI18n } from "@/lib/i18n";
import { LogIn, Mail, Lock } from "lucide-react";

export const Route = createFileRoute("/auth/login")({ component: ClientLogin });

function ClientLogin() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.post<TokenResponse>("/api/v1/auth/login", { email, password });
      saveTokens(resp, "client");
      toast.success(t("auth.login.welcome"));
      navigate({ to: "/client" });
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")} footer={
      <div className="flex flex-col gap-1.5">
        <span>{t("auth.login.no_account")} <Link to="/auth/register" className="text-primary font-medium hover:underline">{t("auth.login.register")}</Link></span>
        <span>{t("auth.login.is_staff")} <Link to="/auth/staff/login" className="text-primary font-medium hover:underline">{t("auth.login.staff_login")}</Link></span>
      </div>
    }>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">{t("auth.login.email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">{t("auth.login.password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 shadow-md shadow-primary/15" disabled={loading}>
          {loading ? t("auth.login.logging_in") : <><LogIn className="h-4 w-4 mr-2" /> {t("auth.login.login")}</>}
        </Button>
      </form>
    </AuthShell>
  );
}
