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
import { useI18n } from "@/lib/i18n";
import { UserPlus, Mail, Lock, Phone, CreditCard, Calendar } from "lucide-react";

export const Route = createFileRoute("/auth/register")({ component: Register });

function Register() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
      const resp = await api.post<TokenResponse>("/api/v1/auth/register", payload);
      saveTokens(resp, "client");
      toast.success(t("auth.register.success"));
      navigate({ to: "/client" });
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }
  return (
    <AuthShell title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}
      footer={<span>{t("auth.register.has_account")} <Link to="/auth/login" className="text-primary font-medium hover:underline">{t("auth.register.login")}</Link></span>}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-lg bg-secondary/30 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("auth.register.personal_data")}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">{t("auth.register.last_name")}</Label><Input required value={f.last_name} onChange={(e) => set("last_name", e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">{t("auth.register.first_name")}</Label><Input required value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">{t("auth.register.middle_name")}</Label><Input value={f.middle_name ?? ""} onChange={(e) => set("middle_name", e.target.value)} placeholder={t("auth.register.optional")} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {t("auth.register.birth_date")}</Label>
            <Input type="date" required value={f.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> {t("auth.register.phone")}</Label>
            <Input required placeholder="+375…" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg bg-secondary/30 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("auth.register.account")}</div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
          <Input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> {t("auth.register.password")}</Label>
          <Input type="password" required minLength={6} value={f.password} onChange={(e) => set("password", e.target.value)} placeholder={t("auth.register.min_chars")} />
        </div>
        <div className="rounded-lg bg-secondary/30 px-3 py-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("auth.register.license")}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><CreditCard className="h-3 w-3" /> {t("auth.register.license_number")}</Label>
            <Input required value={f.license_number} onChange={(e) => set("license_number", e.target.value)} placeholder="1234АВ1" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {t("auth.register.license_issued")}</Label>
            <Input type="date" required value={f.license_issued} onChange={(e) => set("license_issued", e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 shadow-md shadow-primary/15" disabled={loading}>
          {loading ? t("auth.register.creating") : <><UserPlus className="h-4 w-4 mr-2" /> {t("auth.register.create_account")}</>}
        </Button>
      </form>
    </AuthShell>
  );
}
