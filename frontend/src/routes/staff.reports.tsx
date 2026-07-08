import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { apiErrorMessage, fmtMoney } from "@/lib/format";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { RefreshCw, Download } from "lucide-react";

export const Route = createFileRoute("/staff/reports")({ component: StaffReports });

type ReportKey = "fleet-utilization" | "financial" | "clients";

const LABELS: Record<string, string> = {
  "fleet-utilization": "Утилизация парка",
  "financial": "Финансы",
  "clients": "Клиенты",
};

function exportPDF(kind: string, data: Record<string, unknown>, start: string, end: string) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`AutoShare — ${LABELS[kind] ?? kind}`, 14, 22);
  doc.setFontSize(11);
  doc.text(`Период: ${start} — ${end}`, 14, 32);

  const rows = Object.entries(data)
    .filter(([, v]) => typeof v === "number" || typeof v === "string")
    .map(([k, v]) => [k.replace(/_/g, " "), String(v)]);

  if (rows.length > 0) {
    autoTable(doc, {
      startY: 40,
      head: [["Показатель", "Значение"]],
      body: rows,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 197, 94] },
    });
  }

  doc.save(`autoshare_${kind}_${start}_${end}.pdf`);
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function StaffReports() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);
  return (
    <div className="space-y-4 page-enter">
      <h1 className="text-2xl font-bold tracking-tight">Отчёты</h1>
      <Card><CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label>С</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="space-y-2"><Label>По</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div className="text-xs text-muted-foreground sm:col-span-3">Данные за выбранный период.</div>
      </CardContent></Card>
      <Tabs defaultValue="fleet-utilization">
        <TabsList>
          <TabsTrigger value="fleet-utilization">Утилизация парка</TabsTrigger>
          <TabsTrigger value="financial">Финансы</TabsTrigger>
          <TabsTrigger value="clients">Клиенты</TabsTrigger>
        </TabsList>
        {(["fleet-utilization", "financial", "clients"] as ReportKey[]).map((k) => (
          <TabsContent key={k} value={k}><ReportBlock kind={k} start={start} end={end} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ReportBlock({ kind, start, end }: { kind: ReportKey; start: string; end: string }) {
  const q = useQuery({
    queryKey: ["report", kind, start, end],
    queryFn: () => api.get<Record<string, unknown>>(`/api/v1/reports/${kind}`, { start, end }),
    enabled: !!start && !!end,
  });

  return (
    <Card><CardContent className="pt-6">
      {q.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-64 w-full" /><Skeleton className="h-4 w-32" /></div>
      ) : q.error ? <p className="text-destructive">{apiErrorMessage(q.error)}</p> : (
        <div className="space-y-4">
          {kind === "fleet-utilization" && <FleetChart data={q.data} />}
          {kind === "financial" && <FinancialChart data={q.data} />}
          {kind === "clients" && <ClientsChart data={q.data} />}
          <pre className="text-xs overflow-auto rounded-md bg-secondary p-3 max-h-[40vh]">{JSON.stringify(q.data, null, 2)}</pre>
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <Button onClick={() => q.refetch()} variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Обновить</Button>
        {q.data && <Button onClick={() => exportPDF(kind, q.data, start, end)} variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1.5" /> PDF</Button>}
      </div>
    </CardContent></Card>
  );
}

function FleetChart({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return null;
  const statusData = Object.entries(data)
    .filter(([k]) => k.includes("status") || k.includes("car") || k.includes("count") || k.includes("free") || k.includes("rented"))
    .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Number(v) || 0 }));

  if (statusData.length === 0) {
    const allData = Object.entries(data).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Number(v) || 0 })).filter((d) => d.value > 0);
    if (allData.length === 0) return <div className="text-center text-muted-foreground py-8">Нет данных за период</div>;
    return (
      <div>
        <h3 className="font-semibold text-sm mb-3">Утилизация парка</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={allData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">Статус автомобилей</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart><Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie><Tooltip /></PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function FinancialChart({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return null;
  const chartData = Object.entries(data)
    .filter(([k]) => k.includes("revenue") || k.includes("cost") || k.includes("total") || k.includes("payment") || k.includes("income"))
    .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Number(v) || 0 }));

  if (chartData.length === 0) {
    const allData = Object.entries(data).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Number(v) || 0 })).filter((d) => d.value > 0);
    if (allData.length === 0) return <div className="text-center text-muted-foreground py-8">Нет данных за период</div>;
    return (
      <div>
        <h3 className="font-semibold text-sm mb-3">Финансовые показатели</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={allData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => fmtMoney(v)} /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">Доходы и расходы</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip formatter={(v: number) => fmtMoney(v)} /><Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClientsChart({ data }: { data: Record<string, unknown> | undefined }) {
  if (!data) return null;
  const chartData = Object.entries(data)
    .filter(([k]) => k.includes("count") || k.includes("total") || k.includes("new") || k.includes("active"))
    .map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Number(v) || 0 }));

  if (chartData.length === 0) {
    const allData = Object.entries(data).map(([k, v]) => ({ name: k.replace(/_/g, " "), value: Number(v) || 0 })).filter((d) => d.value > 0);
    if (allData.length === 0) return <div className="text-center text-muted-foreground py-8">Нет данных за период</div>;
    return (
      <div>
        <h3 className="font-semibold text-sm mb-3">Клиенты</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={allData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-semibold text-sm mb-3">Статистика клиентов</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
      </ResponsiveContainer>
    </div>
  );
}
