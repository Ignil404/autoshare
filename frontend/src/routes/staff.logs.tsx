import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage, fmtDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, Info, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/staff/logs")({ component: StaffLogs });

interface LogEntry {
  ts: string;
  level: string;
  message: string;
  extra?: Record<string, unknown>;
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: "bg-blue-50 text-blue-700 border-blue-200",
  WARN: "bg-amber-50 text-amber-700 border-amber-200",
  ERROR: "bg-red-50 text-red-700 border-red-200",
};
const LEVEL_ICONS: Record<string, typeof Info> = {
  INFO: Info, WARN: AlertTriangle, ERROR: AlertCircle,
};

function StaffLogs() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("all");

  const q = useQuery({
    queryKey: ["s-logs", level, search],
    queryFn: () => api.get<LogEntry[]>("/api/v1/logs/", { level: level === "all" ? undefined : level, search: search || undefined, limit: 300 }),
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Логи системы</h1>
          <p className="text-sm text-muted-foreground mt-1">Запросы API и события. Обновляется автоматически.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isRefetching}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${q.isRefetching ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Поиск по сообщению…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="sm:w-40"><SelectValue placeholder="Уровень" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все уровни</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARN">WARN</SelectItem>
            <SelectItem value="ERROR">ERROR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="pt-6">
        {q.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : q.error ? (
          <p className="text-destructive text-center py-8">{apiErrorMessage(q.error)}</p>
        ) : (q.data ?? []).length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-muted-foreground font-medium">Нет логов</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Логи появятся после запросов к API</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
            {(q.data ?? []).map((log, i) => {
              const Icon = LEVEL_ICONS[log.level] ?? Info;
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-secondary/30 transition-colors group">
                  <div className={`grid h-7 w-7 place-items-center rounded-md shrink-0 mt-0.5 ${LEVEL_COLORS[log.level] ?? "bg-gray-50 text-gray-600"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${log.level === "ERROR" ? "text-red-600" : log.level === "WARN" ? "text-amber-600" : "text-blue-600"}`}>
                        {log.level}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{fmtDateTime(log.ts)}</span>
                    </div>
                    <div className="text-sm font-medium truncate">{log.message}</div>
                    {log.extra && Object.keys(log.extra).length > 0 && (
                      <div className="mt-1 text-[11px] text-muted-foreground font-mono truncate">
                        {Object.entries(log.extra).map(([k, v]) => `${k}=${String(v)}`).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
