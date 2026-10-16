import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Car } from "lucide-react";

export function AuthShell({ title, subtitle, children, footer }: {
  title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-primary/[0.03] blur-3xl" />
      </div>
      <header className="relative border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" aria-label="AutoShare home" className="flex items-center gap-2.5 font-bold text-lg group">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Car className="h-5 w-5" />
            </div>
            <span className="tracking-tight">AutoShare</span>
          </Link>
        </div>
      </header>
      <main className="relative flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border bg-card/80 backdrop-blur-sm p-8 shadow-xl shadow-black/5 slide-up">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
