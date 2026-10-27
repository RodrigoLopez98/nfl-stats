/** Zona horaria de la app (centro de México, misma hora que San Luis Potosí). */
export const APP_TIME_ZONE = "America/Monterrey";

/** Kickoffs de la NFL se publican en hora del Este. */
export const EASTERN_TIME_ZONE = "America/New_York";

/** San Luis Potosí usa el horario del centro de México, sin horario de verano. */
export const SAN_LUIS_TIME_ZONE = "America/Mexico_City";

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

/** Fecha de hoy (calendario) en Monterrey. */
export function todayInMonterrey() {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseCalendarDate(ymd);
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

/** Convierte una hora de reloj en la zona indicada a timestamp UTC. */
export function wallTimeToUtcMs(ymd: string, hour24: number, minute: number, timeZone: string) {
  const [y, mo, d] = ymd.split("-").map(Number);
  if (!y || !mo || !d) return Number.NaN;
  const anchor = parseCalendarDate(ymd)?.getTime() ?? Date.UTC(y, mo - 1, d, 12, 0, 0);
  for (let delta = -40 * 60 * 60 * 1000; delta <= 40 * 60 * 60 * 1000; delta += 60 * 1000) {
    const candidate = anchor + delta;
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      })
        .formatToParts(new Date(candidate))
        .map((part) => [part.type, part.value]),
    );
    const hour = Number(parts.hour);
    if (
      Number(parts.year) === y &&
      Number(parts.month) === mo &&
      Number(parts.day) === d &&
      (hour === hour24 || (hour === 24 && hour24 === 0)) &&
      Number(parts.minute) === minute
    ) {
      return candidate;
    }
  }
  return anchor;
}

/** Convierte hora local en Monterrey (24h) a timestamp UTC. */
export function wallTimeInMonterreyToUtcMs(ymd: string, hour24: number, minute: number) {
  return wallTimeToUtcMs(ymd, hour24, minute, APP_TIME_ZONE);
}

/** Hora de reloj en la zona indicada, por ejemplo "6:15 PM". */
export function formatClock(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(ms));
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const period = parts.find((part) => part.type === "dayPeriod")?.value?.toUpperCase();
  if (!hour || !minute || !period) return "";
  return `${hour}:${minute} ${period}`;
}
