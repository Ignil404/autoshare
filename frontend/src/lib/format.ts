export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso; }
}
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("ru-RU"); } catch { return iso; }
}
export function fmtMoney(n?: number | null): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "BYN", maximumFractionDigits: 2 }).format(n);
}
export function fmtMinutes(m?: number | null): string {
  if (m === null || m === undefined) return "—";
  const h = Math.floor(m / 60); const min = m % 60;
  return h > 0 ? `${h} ч ${min} мин` : `${min} мин`;
}
export function apiErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Что-то пошло не так";
}