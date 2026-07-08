import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import type { AuditLogOut } from "@/lib/api-types";
import { apiErrorMessage, fmtDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/audit")({ component: StaffAudit });

function StaffAudit() {
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");
  const [actorType, setActorType] = useState("");
  const q = useQuery({
    queryKey: ["s-audit", entity, entityId, actorType],
    queryFn: () => api.get<AuditLogOut[]>("/api/v1/audit-log/", {
      entity: entity || undefined,
      entity_id: entityId || undefined,
      actor_type: actorType || undefined,
      limit: 200,
    }),
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Журнал аудита</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>Сущность</Label><Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="booking, car, …" /></div>
        <div className="space-y-2"><Label>ID сущности</Label><Input value={entityId} onChange={(e) => setEntityId(e.target.value)} inputMode="numeric" /></div>
        <div className="space-y-2"><Label>Тип актора</Label><Input value={actorType} onChange={(e) => setActorType(e.target.value)} placeholder="client / staff / system" /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6">
        {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> :
         <div className="overflow-x-auto"><Table>
           <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Актор</TableHead><TableHead>Действие</TableHead><TableHead>Сущность</TableHead><TableHead>Детали</TableHead></TableRow></TableHeader>
           <TableBody>{(q.data ?? []).map((l) => (
             <TableRow key={l.log_id}><TableCell>{fmtDateTime(l.created_at)}</TableCell>
               <TableCell><Badge variant="secondary">{l.actor_type}</Badge> #{l.actor_id ?? "—"}</TableCell>
               <TableCell className="font-mono text-xs">{l.action}</TableCell>
               <TableCell>{l.entity} #{l.entity_id ?? "—"}</TableCell>
               <TableCell><pre className="text-xs">{l.details ? JSON.stringify(l.details) : "—"}</pre></TableCell></TableRow>
           ))}</TableBody></Table></div>}
      </CardContent></Card>
    </div>
  );
}