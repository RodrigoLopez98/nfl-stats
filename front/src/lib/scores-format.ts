import type { GameCard } from "@/api";

import {
  calendarWeekday,
  formatCalendarDate,
  parseCalendarDate,
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
  if (day === 1) return "8:15pm";
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

export function groupGamesByDay(games: GameCard[]) {
  const map = new Map<string, GameCard[]>();
  for (const game of games) {
    const key = game.gameday ?? "unknown";
    const bucket = map.get(key) ?? [];
    bucket.push(game);
    map.set(key, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}
