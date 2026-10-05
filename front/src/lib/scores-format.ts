import type { GameCard } from "@/api";

import {
  calendarWeekday,
  formatCalendarDate,
  parseCalendarDate,
  wallTimeInMonterreyToUtcMs,
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

function parseKickoffLabel(label: string) {
  if (label === "TBD") return { hour: 23, minute: 59 };
  const match = label.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return { hour: 12, minute: 0 };
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

/** Instantánea del kickoff en Monterrey (ms UTC). */
export function gameKickoffMs(game: GameCard) {
  const ymd = game.gameday?.slice(0, 10);
  if (!ymd) return Number.POSITIVE_INFINITY;
  const { hour, minute } = parseKickoffLabel(kickoffLabel(game));
  const ms = wallTimeInMonterreyToUtcMs(ymd, hour, minute);
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
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

export function kickoffLabel(game: GameCard) {
  const date = parseGameday(game.gameday);
  if (!date) return "TBD";
  const day = calendarWeekday(date);
  if (day === 4) return "8:15pm";
  if (day === 1) return "6:15pm";
  if (day === 0) return "1:00pm";
  return "TBD";
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
