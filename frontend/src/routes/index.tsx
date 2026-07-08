import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Car, Users, ArrowRight, Zap, ShieldCheck, MapPin, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, userType } = useAuth();
  if (isAuthenticated && userType === "client") return <Navigate to="/client" />;
  if (isAuthenticated && userType === "staff") return <Navigate to="/staff" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5 font-bold text-lg">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Car className="h-5 w-5" />
            </div>
            <span className="tracking-tight">AutoShare</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth/login">Войти</Link>
            </Button>
            <Button asChild size="sm" className="shadow-md shadow-primary/15">
              <Link to="/auth/register">Регистрация</Link>
            </Button>
          </div>
        </div>
      </header>
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Минск · 3 зоны · 6 автомобилей
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl leading-[1.1]">
                Каршеринг{" "}
                <span className="text-primary">без бюрократии</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
                Забронируйте машину за 30 секунд, начните поездку с телефона и платите только за фактическое время.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="shadow-lg shadow-primary/20 px-6">
                  <Link to="/auth/register">
                    Начать пользоваться <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="px-6">
                  <Link to="/auth/login">У меня уже есть аккаунт</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Как это работает</h2>
              <p className="mt-2 text-muted-foreground">Три простых шага до поездки</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { step: "01", icon: Zap, title: "Забронируйте", text: "Выберите свободный автомобиль на карте и подтвердите бронь." },
                { step: "02", icon: Clock, title: "Начните поездку", text: "Откройте машину из приложения и езжайте куда хотите." },
                { step: "03", icon: CreditCard, title: "Оплатите", text: "Платите только за фактическое время использования." },
              ].map((f) => (
                <div key={f.step} className="group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                  <div className="absolute top-4 right-4 text-5xl font-black text-muted/30">{f.step}</div>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Всё под контролем</h2>
              <p className="mt-2 text-muted-foreground">Мы позаботились о каждом аспекте</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Zap, title: "Мгновенное бронирование", text: "Автомобиль резервируется за секунду." },
                { icon: MapPin, title: "Гибкие тарифы", text: "Поминутная и посуточная оплата." },
                { icon: ShieldCheck, title: "Верификация", text: "Проверка водительских прав." },
                { icon: CreditCard, title: "Промокоды", text: "Скидки для новых и постоянных клиентов." },
                { icon: Clock, title: "Пауза и возобновление", text: "Приостановите аренду в любой момент." },
                { icon: Car, title: "Разные классы", text: "Эконом, комфорт и бизнес." },
              ].map((f) => (
                <div key={f.title} className="flex gap-3 rounded-xl border p-4 transition-colors hover:bg-secondary/30">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-secondary/20">
          <div className="mx-auto max-w-6xl px-4 py-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Для клиентов</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Регистрация, бронирование, старт/пауза/завершение аренды, история поездок и оплаты.
              </p>
              <Button asChild className="mt-5" variant="secondary">
                <Link to="/auth/login">Войти как клиент</Link>
              </Button>
            </div>
            <div className="rounded-2xl border bg-card p-8 transition-all hover:shadow-lg hover:shadow-primary/5">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Для сотрудников</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Управление клиентами, автопарком, тарифами, скидками, ТО, платежами, отчётами и аудитом.
              </p>
              <Button asChild className="mt-5" variant="secondary">
                <Link to="/auth/staff/login">Вход для персонала</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} AutoShare · Каршеринг в Беларуси
      </footer>
    </div>
  );
}
