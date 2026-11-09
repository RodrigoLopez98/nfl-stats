import type { GameCard } from "@/api";

import {
  calendarWeekday,
  EASTERN_TIME_ZONE,
  formatCalendarDate,
  formatClock,
  parseCalendarDate,
  SAN_LUIS_TIME_ZONE,
  wallTimeToUtcMs,
} from "@/lib/datetime";

export function parseGameday(value: string | null | undefined) {
  if (!value) return null;
  return parseCalendarDate(value.slice(0, 10));
}

export function formatShortDate(date: Date) {
  const month = formatCalendarDate(date, { month: "short" }).replace(/\./g, "").toUpperCase();
  const day = formatCalendarDate(date, { day: "numeric" });
  return `${month} ${day}`;
}

export function formatLongWeekdayDate(date: Date) {
  return formatCalendarDate(date, { weekday: "long", month: "long", day: "numeric" });
}

export function weekDateRangeLabel(games: GameCard[]) {
  const dates = games
    .map((game) => parseGameday(game.gameday))
    .filter((item): item is Date => item != null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) return "";
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first.getTime() === last.getTime()) return formatShortDate(first);
  return `${formatShortDate(first)} - ${formatShortDate(last)}`;
}

export function isFinal(game: GameCard) {
  return game.away_score != null && game.home_score != null;
}

const MONTHS_ES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

/** Hora del Este publicada, por ejemplo "20:15". Sin hora inventada por día de la semana. */
export function easternKickoff(game: GameCard) {
  const match = game.gametime?.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** Instantánea UTC del kickoff. La hora publicada es del Este. */
export function gameKickoffMs(game: GameCard) {
  const ymd = game.gameday?.slice(0, 10);
  if (!ymd) return Number.POSITIVE_INFINITY;
  const clock = easternKickoff(game);
  if (!clock) {
    const fallback = wallTimeToUtcMs(ymd, 23, 59, SAN_LUIS_TIME_ZONE);
    return Number.isNaN(fallback) ? Number.POSITIVE_INFINITY : fallback;
  }
  const ms = wallTimeToUtcMs(ymd, clock.hour, clock.minute, EASTERN_TIME_ZONE);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/** Kickoff en hora de San Luis Potosí, por ejemplo "6:15 PM". */
export function formatKickoffSanLuis(game: GameCard) {
  if (!easternKickoff(game)) return "Horario por definir";
  const ms = gameKickoffMs(game);
  if (!Number.isFinite(ms)) return "Horario por definir";
  return formatClock(ms, SAN_LUIS_TIME_ZONE) || "Horario por definir";
}

/** Día del kickoff en San Luis Potosí, por ejemplo "DOMINGO 9 NOV". */
export function formatKickoffDateSanLuis(game: GameCard) {
  const ymd = game.gameday?.slice(0, 10);
  if (!ymd) return "Fecha por definir";
  const clock = easternKickoff(game);
  const ms = clock ? gameKickoffMs(game) : Number.NaN;
  const date = Number.isFinite(ms) ? new Date(ms) : parseCalendarDate(ymd);
  if (!date) return "Fecha por definir";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("es-MX", {
      timeZone: clock ? SAN_LUIS_TIME_ZONE : "UTC",
      weekday: "long",
      day: "numeric",
      month: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const weekday = (parts.weekday ?? "").toUpperCase();
  const month = MONTHS_ES[(Number(parts.month) || 1) - 1] ?? "";
  if (!weekday || !parts.day || !month) return "Fecha por definir";
  return `${weekday} ${parts.day} ${month}`;
}

export function sortUpcomingGames(games: GameCard[], now = new Date()) {
  const nowMs = now.getTime();
  return [...games].sort((a, b) => {
    const ka = gameKickoffMs(a);
    const kb = gameKickoffMs(b);
    const aFuture = ka >= nowMs;
    const bFuture = kb >= nowMs;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return ka - kb;
  });
}

export function sortCompletedGames(games: GameCard[]) {
  return [...games].sort((a, b) => gameKickoffMs(b) - gameKickoffMs(a));
}

export function groupGamesPreservingOrder(games: GameCard[]) {
  const map = new Map<string, GameCard[]>();
  const order: string[] = [];
  for (const game of games) {
    const key = game.gameday ?? "unknown";
    if (!map.has(key)) order.push(key);
    const bucket = map.get(key) ?? [];
    bucket.push(game);
    map.set(key, bucket);
  }
  return order.map((key) => [key, map.get(key)!] as const);
}

export function broadcastEventTitle(date: Date) {
  const day = calendarWeekday(date);
  if (day === 4) return "Thursday Night Football";
  if (day === 1) return "Monday Night Football";
  if (day === 0) return "Sunday Night Football";
  return "NFL Football";
}

export function recordLabel(wins: number, losses: number, ties: number) {
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

export function winPct(wins: number, losses: number, ties: number) {
  const games = wins + losses + ties;
  if (!games) return ".000";
  const pct = (wins + ties * 0.5) / games;
  return pct >= 1 ? "1.000" : pct.toFixed(3).replace(/^0/, "");
}

export function groupGamesByDay(games: GameCard[], order: "asc" | "desc" = "asc") {
  const map = new Map<string, GameCard[]>();
  for (const game of games) {
    const key = game.gameday ?? "unknown";
    const bucket = map.get(key) ?? [];
    bucket.push(game);
    map.set(key, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => (order === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
}

export function gamedaySortKey(game: GameCard) {
  return parseGameday(game.gameday)?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function sortGamesByGameday(games: GameCard[], direction: "asc" | "desc") {
  const factor = direction === "asc" ? 1 : -1;
  return [...games].sort((a, b) => (gamedaySortKey(a) - gamedaySortKey(b)) * factor);
}
