/** Zona horaria de la app (Monterrey, México). */
export const APP_TIME_ZONE = "America/Monterrey";

const ISO_HAS_OFFSET = /(?:[zZ]|[+-]\d{2}:\d{2})$/;

/** Timestamps del backend se guardan en UTC sin sufijo Z. */
export function parseApiDateTime(iso: string) {
  const trimmed = iso.trim();
  if (!trimmed) return new Date(Number.NaN);
  if (ISO_HAS_OFFSET.test(trimmed)) return new Date(trimmed);
  return new Date(`${trimmed.replace(" ", "T")}Z`);
}

export function formatDateTimeMonterrey(iso: string | Date) {
  const date = typeof iso === "string" ? parseApiDateTime(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).format(date);
}

/** Temporada NFL según la fecha en Monterrey (marzo+ = año calendario). */
export function currentNflSeason(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(reference);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!year || !month) return reference.getFullYear();
  return month >= 3 ? year : year - 1;
}

/** Fecha calendario YYYY-MM-DD (sin desplazar por DST). */
export function parseCalendarDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function calendarWeekday(date: Date) {
  const label = new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? 0;
}

export function formatCalendarDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
) {
  return new Intl.DateTimeFormat(locale, { timeZone: APP_TIME_ZONE, ...options }).format(date);
}
