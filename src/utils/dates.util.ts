export function parseRange(from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);

  const start = from ? new Date(from) : new Date(end.getFullYear(), end.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date: Date | string) {
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
