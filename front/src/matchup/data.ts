import { api, type GameCard, type Rankings } from "@/api";
import { currentNflSeason, parseCalendarDate, todayInMonterrey } from "@/lib/datetime";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { kickoffLabel } from "@/lib/scores-format";
import { normalizeTeamAbbr, teamNickname } from "@/lib/team-meta";

export type ScheduleRow = {
  week: number;
  opp: string;
  oppAbbr: string;
  away: boolean;
  result: "W" | "L" | "T";
  score: string;
  oppRecord: string;
};

export type CompareRow = {
  label: string;
  away: number | null;
  home: number | null;
  digits: number;
  suffix?: string;
};

export type RankStat = {
  label: string;
  rank: number | null;
  value: string;
};

export type Injury = {
  name: string;
  pos: string;
  status: string;
  impact: string;
};

export type Factor = {
  icon: "pin" | "weather" | "rest" | "pace" | "key";
  label: string;
  value?: string;
  bullets?: string[];
};

export type MarketRow = {
  market: string;
  line: string;
  prob: string;
  probTone?: "green" | "red";
  value: string;
  valueTone?: "green" | "muted";
};

export type TeamSide = {
  abbr: string;
  city: string;
  name: string;
  record: string;
  split: string;
  schedule: ScheduleRow[];
  rivalsRecord: string;
  beatenRecord: string;
  offense: RankStat[];
  defense: RankStat[];
  injuries: Injury[];
  trendRecord: string;
  trendScored: string;
  trendAllowed: string;
  form: ("W" | "L" | "T")[];
  quarters: [number, number, number, number];
};

export type MatchupData = {
  gameId: string;
  weekLabel: string;
  dateLine: string;
  timeLine: string;
  stadium: string;
  confidence: string;
  away: TeamSide;
  home: TeamSide;
  winAway: number;
  winHome: number;
  scoreAway: number;
  scoreHome: number;
  marginText: string;
  total: number;
  line: number;
  hasLine: boolean;
  overProb: number;
  underProb: number;
  compare: CompareRow[];
  factors: Factor[];
  markets: MarketRow[];
  conclusion: string;
  notes: string[];
};

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const MISSING = "No encontrado";

export const IMAGE_MATCHUP: MatchupData = {
  gameId: "atl-chi",
  weekLabel: "X",
  confidence: "6 / 10 (moderada)",
  dateLine: "DOMINGO 18 OCT",
  timeLine: "1:00 PM (ET)",
  stadium: "Soldier Field, Chicago",
  winAway: 45,
  winHome: 55,
  scoreAway: 24,
  scoreHome: 27,
  marginText: "Diferencia esperada: Bears por 3 puntos",
  total: 51,
  line: 50.5,
  hasLine: true,
  overProb: 53,
  underProb: 47,
  away: {
    abbr: "ATL",
    city: "ATLANTA",
    name: "FALCONS",
    record: "2 - 3",
    split: "(1 - 2 local | 1 - 1 visita)",
    rivalsRecord: "12 - 12 (50%)",
    beatenRecord: "4 - 6 (40%)",
    schedule: [
      { week: 1, opp: "Steelers", oppAbbr: "PIT", away: false, result: "L", score: "13-20", oppRecord: "3-2" },
      { week: 2, opp: "Panthers", oppAbbr: "CAR", away: false, result: "L", score: "3-34", oppRecord: "2-2" },
      { week: 3, opp: "Packers", oppAbbr: "GB", away: true, result: "W", score: "35-14", oppRecord: "3-2" },
      { week: 4, opp: "Saints", oppAbbr: "NO", away: true, result: "W", score: "45-24", oppRecord: "1-4" },
      { week: 5, opp: "Ravens", oppAbbr: "BAL", away: false, result: "L", score: "23-30 (OT)", oppRecord: "3-2" },
    ],
    offense: [
      { label: "Puntos", rank: 16, value: "24.8" },
      { label: "Yardas totales", rank: 15, value: "335.6" },
      { label: "Yardas por jugada", rank: 18, value: "5.4" },
    ],
    defense: [
      { label: "Puntos", rank: 25, value: "25.4" },
      { label: "Yardas totales", rank: 28, value: "364.2" },
      { label: "Presión al QB", rank: 1, value: "97" },
    ],
    injuries: [
      { name: "M. Penix Jr.", pos: "QB", status: "Probable", impact: "Alto" },
      { name: "D. London", pos: "WR", status: "Probable", impact: "Medio" },
      { name: "B. Robinson", pos: "RB", status: "Probable", impact: "Medio" },
      { name: "T. Matthews", pos: "OL", status: "Cuestionable", impact: "Medio" },
      { name: "A. Terrell", pos: "CB", status: "Cuestionable", impact: "Alto" },
    ],
    trendRecord: "1-2",
    trendScored: "20.3",
    trendAllowed: "28.3",
    form: ["L", "W", "L"],
    quarters: [6, 6, 6, 6],
  },
  home: {
    abbr: "CHI",
    city: "CHICAGO",
    name: "BEARS",
    record: "3 - 2",
    split: "(2 - 0 local | 1 - 2 visita)",
    rivalsRecord: "14 - 10 (58%)",
    beatenRecord: "6 - 8 (43%)",
    schedule: [
      { week: 1, opp: "Panthers", oppAbbr: "CAR", away: false, result: "W", score: "59-37", oppRecord: "2-2" },
      { week: 2, opp: "Vikings", oppAbbr: "MIN", away: true, result: "L", score: "3-9", oppRecord: "5-0" },
      { week: 3, opp: "Eagles", oppAbbr: "PHI", away: false, result: "W", score: "27-7", oppRecord: "2-3" },
      { week: 4, opp: "Jets", oppAbbr: "NYJ", away: true, result: "W", score: "23-12", oppRecord: "2-3" },
      { week: 5, opp: "Packers", oppAbbr: "GB", away: false, result: "L", score: "7-31", oppRecord: "3-2" },
    ],
    offense: [
      { label: "Puntos", rank: 14, value: "25.0" },
      { label: "Yardas totales", rank: 11, value: "352.4" },
      { label: "Yardas por jugada", rank: 12, value: "5.8" },
    ],
    defense: [
      { label: "Puntos", rank: 10, value: "20.6" },
      { label: "Yardas totales", rank: 12, value: "315.0" },
      { label: "Presión al QB", rank: 8, value: "74" },
    ],
    injuries: [
      { name: "Caleb Williams", pos: "QB", status: "Probable", impact: "Alto" },
      { name: "K. Allen", pos: "WR", status: "Probable", impact: "Medio" },
      { name: "G. Dexter Sr.", pos: "DL", status: "Cuestionable", impact: "Medio" },
      { name: "J. Brisker", pos: "S", status: "Cuestionable", impact: "Medio" },
      { name: "T. Edwards", pos: "LB", status: "Probable", impact: "Medio" },
    ],
    trendRecord: "2-1",
    trendScored: "29.7",
    trendAllowed: "16.7",
    form: ["W", "W", "L"],
    quarters: [7, 7, 7, 6],
  },
  compare: [
    { label: "Puntos anotados por partido", away: 24.8, home: 25.0, digits: 1 },
    { label: "Puntos permitidos por partido", away: 25.4, home: 20.6, digits: 1 },
    { label: "Yardas totales por partido", away: 335.6, home: 352.4, digits: 1 },
    { label: "Yardas por jugada", away: 5.4, home: 5.8, digits: 1 },
    { label: "Tercera oportunidad", away: 46, home: 43, digits: 0, suffix: "%" },
    { label: "Zona roja (TD)", away: 68, home: 62, digits: 0, suffix: "%" },
    { label: "Presiones al QB", away: 97, home: 74, digits: 0 },
    { label: "Entregas de balón", away: 12, home: 7, digits: 0 },
  ],
  factors: [
    { icon: "pin", label: "Localía", value: "Bears (Soldier Field)" },
    { icon: "weather", label: "Clima", value: "10°C, sin lluvia (favorable)" },
    { icon: "rest", label: "Descanso", value: "Ambos con 7 días" },
    { icon: "pace", label: "Ritmo de juego", value: "Medio-Alto (más posesiones)" },
    {
      icon: "key",
      label: "Enfrentamientos clave",
      bullets: [
        "Presión ATL vs protección de Williams",
        "Juego terrestre ATL vs defensa de Chicago",
        "Receptores CHI vs secundarios ATL",
      ],
    },
  ],
  markets: [
    { market: "Ganador - Falcons", line: "+104", prob: "45%", value: "-", valueTone: "muted" },
    { market: "Ganador - Bears", line: "-122", prob: "55%", value: "-", valueTone: "muted" },
    { market: "Hándicap - Falcons", line: "+1.5", prob: "52%", value: "Neutral", valueTone: "muted" },
    { market: "Hándicap - Bears", line: "-1.5", prob: "48%", value: "Neutral", valueTone: "muted" },
    { market: "Total - Más de 50.5", line: "50.5", prob: "53%", value: "Ligero valor", valueTone: "green" },
    { market: "Total - Menos de 50.5", line: "50.5", prob: "47%", value: "-", valueTone: "muted" },
  ],
  conclusion:
    "Partido muy cerrado con ligera ventaja para Chicago. Atlanta tiene un techo ofensivo alto, pero es inconsistente. Chicago ha mostrado mayor estabilidad y mejor calendario.",
  notes: [
    "Marcador proyectado: Bears 27 - Falcons 24 | Total esperado: 51 puntos",
    "Probabilidad de victoria: Bears 55% | Falcons 45%",
    "Confianza del pronóstico: 6 / 10 (moderada)",
    "El resultado puede cambiar con el reporte definitivo de inactivos.",
  ],
};

function cloneMatchup(): MatchupData {
  return JSON.parse(JSON.stringify(IMAGE_MATCHUP)) as MatchupData;
}

function formatRecord(side: GameCard["away"]) {
  return side.ties ? `${side.wins} - ${side.losses} - ${side.ties}` : `${side.wins} - ${side.losses}`;
}

function formatKickoff(ymd: string) {
  const date = parseCalendarDate(ymd);
  if (!date) return ymd;
  const weekday = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "long" })
    .format(date)
    .toUpperCase();
  const day = date.getUTCDate();
  return `${weekday} ${day} ${MONTHS[date.getUTCMonth()]}`;
}

function formatSpread(value: number) {
  const abs = Math.abs(value).toFixed(1);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

export type SlateGame = {
  week: number;
  game: GameCard;
};

export type MatchupSlate = {
  games: SlateGame[];
  rankingsByWeek: Record<number, Rankings>;
  index: number;
};

type Rec = { w: number; l: number; t: number };

function teamCity(abbr: string) {
  const code = normalizeTeamAbbr(abbr);
  return NFL_TEAMS.find((team) => team.abbr === code)?.name ?? code;
}

function nick(abbr: string) {
  return teamNickname(abbr);
}

function pretty(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isBefore(item: SlateGame, cutoff: SlateGame) {
  const a = item.game.gameday ?? "9999-99-99";
  const b = cutoff.game.gameday ?? "9999-99-99";
  if (a !== b) return a < b;
  if (item.week !== cutoff.week) return item.week < cutoff.week;
  return item.game.game_id < cutoff.game.game_id;
}

function playedBefore(games: SlateGame[], cutoff: SlateGame) {
  return games.filter(
    (item) => item.game.away_score != null && item.game.home_score != null && isBefore(item, cutoff),
  );
}

function teamResult(item: SlateGame, abbr: string) {
  const code = normalizeTeamAbbr(abbr);
  const away = normalizeTeamAbbr(item.game.away.abbr) === code;
  const home = normalizeTeamAbbr(item.game.home.abbr) === code;
  if (!away && !home) return null;
  const scored = away ? item.game.away_score! : item.game.home_score!;
  const allowed = away ? item.game.home_score! : item.game.away_score!;
  const opp = away ? item.game.home.abbr : item.game.away.abbr;
  const result: "W" | "L" | "T" = scored > allowed ? "W" : scored < allowed ? "L" : "T";
  return { result, scored, allowed, opp, away };
}

function recordOf(games: SlateGame[], abbr: string, cutoff: SlateGame): Rec {
  const rec: Rec = { w: 0, l: 0, t: 0 };
  for (const item of playedBefore(games, cutoff)) {
    const row = teamResult(item, abbr);
    if (!row) continue;
    if (row.result === "W") rec.w += 1;
    else if (row.result === "L") rec.l += 1;
    else rec.t += 1;
  }
  return rec;
}

function formatRec(rec: Rec, tight = false) {
  const sep = tight ? "-" : " - ";
  return rec.t ? `${rec.w}${sep}${rec.l}${sep}${rec.t}` : `${rec.w}${sep}${rec.l}`;
}

function recPct(rec: Rec) {
  const games = rec.w + rec.l + rec.t;
  if (!games) return "0 - 0 (0%)";
  const pct = Math.round(((rec.w + rec.t * 0.5) / games) * 100);
  return `${formatRec(rec)} (${pct}%)`;
}

function sumRecs(recs: Rec[]) {
  return recs.reduce<Rec>((sum, rec) => ({ w: sum.w + rec.w, l: sum.l + rec.l, t: sum.t + rec.t }), { w: 0, l: 0, t: 0 });
}

function priorGames(games: SlateGame[], abbr: string, cutoff: SlateGame) {
  return playedBefore(games, cutoff)
    .map((item) => ({ item, row: teamResult(item, abbr) }))
    .filter((entry): entry is { item: SlateGame; row: NonNullable<ReturnType<typeof teamResult>> } => entry.row != null)
    .sort((a, b) => (isBefore(a.item, b.item) ? -1 : 1));
}

function rankMap(rows: { abbr: string; value: number }[], lowerIsBetter: boolean) {
  const sorted = [...rows].sort((a, b) => (lowerIsBetter ? a.value - b.value : b.value - a.value));
  const ranks = new Map<string, number>();
  sorted.forEach((item, index) => {
    const previous = sorted[index - 1];
    if (previous && previous.value === item.value) ranks.set(item.abbr, ranks.get(previous.abbr) ?? index + 1);
    else ranks.set(item.abbr, index + 1);
  });
  return ranks;
}

function pointsAllowedTable(games: SlateGame[], cutoff: SlateGame) {
  const totals = new Map<string, { allowed: number; games: number }>();
  for (const item of playedBefore(games, cutoff)) {
    const bump = (abbr: string, allowed: number) => {
      const code = normalizeTeamAbbr(abbr);
      const row = totals.get(code) ?? { allowed: 0, games: 0 };
      row.allowed += allowed;
      row.games += 1;
      totals.set(code, row);
    };
    bump(item.game.away.abbr, item.game.home_score ?? 0);
    bump(item.game.home.abbr, item.game.away_score ?? 0);
  }
  const rows = [...totals.entries()].map(([abbr, row]) => ({
    abbr,
    value: row.games ? row.allowed / row.games : 0,
  }));
  return { ranks: rankMap(rows, true), rates: new Map(rows.map((row) => [row.abbr, row.value])) };
}

function offenseYards(rankings: Rankings | undefined) {
  const rows = (rankings?.teams ?? [])
    .map((team) => {
      const games = team.totals.stat_games || team.wins + team.losses;
      const passing = team.totals.passing;
      const rushing = team.totals.rushing;
      if (!games || passing == null || rushing == null) return null;
      return { abbr: normalizeTeamAbbr(team.abbr), value: (passing + rushing) / games };
    })
    .filter((row): row is { abbr: string; value: number } => row != null);
  return { ranks: rankMap(rows, false), rates: new Map(rows.map((row) => [row.abbr, row.value])) };
}

type RateTable = { ranks: Map<string, number>; rates: Map<string, number> };

function metricTable(
  rankings: Rankings | undefined,
  valueOf: (team: Rankings["teams"][number]) => number | null,
  lowerIsBetter: boolean,
): RateTable {
  const rows = (rankings?.teams ?? [])
    .map((team) => {
      const value = valueOf(team);
      if (value == null || Number.isNaN(value)) return null;
      return { abbr: normalizeTeamAbbr(team.abbr), value };
    })
    .filter((row): row is { abbr: string; value: number } => row != null);
  return { ranks: rankMap(rows, lowerIsBetter), rates: new Map(rows.map((row) => [row.abbr, row.value])) };
}

function perGame(team: Rankings["teams"][number], key: string) {
  const games = team.totals.stat_games || team.wins + team.losses;
  const total = team.totals[key];
  if (!games || total == null) return null;
  return total / games;
}

function yardsPerPlay(team: Rankings["teams"][number]) {
  const attempts = team.totals.attempts;
  const carries = team.totals.carries;
  const passing = team.totals.passing;
  const rushing = team.totals.rushing;
  if (attempts == null || carries == null || passing == null || rushing == null) return null;
  const plays = attempts + carries;
  if (!plays) return null;
  return (passing + rushing) / plays;
}

function epaPerPlay(team: Rankings["teams"][number]) {
  const attempts = team.totals.attempts;
  const carries = team.totals.carries;
  const passing = team.totals.passing_epa;
  const rushing = team.totals.rushing_epa;
  if (attempts == null || carries == null || passing == null || rushing == null) return null;
  const plays = attempts + carries;
  if (!plays) return null;
  return (passing + rushing) / plays;
}

function rankedStat(label: string, table: RateTable, abbr: string, digits: number): RankStat {
  const value = table.rates.get(abbr);
  if (value == null) return { label, rank: null, value: MISSING };
  return { label, rank: table.ranks.get(abbr) ?? null, value: value.toFixed(digits) };
}

const STATUS_ES: Record<string, string> = {
  Questionable: "Cuestionable",
  Doubtful: "Dudoso",
  Out: "Fuera",
  "Injured Reserve": "Reserva",
  Suspension: "Suspendido",
};

const BODY_PARTS: [RegExp, string][] = [
  [/hamstring/, "isquiotibiales"],
  [/quadriceps|\bquads?\b/, "cuádriceps"],
  [/concussion/, "conmoción"],
  [/hip flexor/, "flexor de cadera"],
  [/ankle/, "tobillo"],
  [/shoulder/, "hombro"],
  [/knee/, "rodilla"],
  [/neck/, "cuello"],
  [/thumb/, "pulgar"],
  [/\btoes?\b/, "dedo del pie"],
  [/groin/, "ingle"],
  [/\bcalf\b/, "pantorrilla"],
  [/achilles/, "aquiles"],
  [/\bback\b/, "espalda"],
  [/\bribs?\b/, "costilla"],
  [/wrist/, "muñeca"],
  [/\bhand\b/, "mano"],
  [/\bfoot\b/, "pie"],
  [/elbow/, "codo"],
  [/oblique/, "oblicuo"],
  [/pectoral|\bpec\b/, "pectoral"],
  [/biceps/, "bíceps"],
  [/triceps/, "tríceps"],
  [/finger/, "dedo"],
  [/\bhip\b(?! flexor)/, "cadera"],
  [/illness|sick/, "enfermedad"],
];

const NUMBER_WORDS: Record<string, string> = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
};

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function bodyParts(text: string) {
  const paren = text.match(/\(([^)]+)\)/);
  const source = (paren?.[1] ?? text).toLowerCase();
  const found = BODY_PARTS.filter(([pattern]) => pattern.test(source)).map(([, label]) => label);
  return [...new Set(found)];
}

function injuryOutcome(text: string) {
  const note = text.toLowerCase();
  const suspended = note.match(/suspended (\w+|\d+) games?/);
  if (suspended) {
    const count = NUMBER_WORDS[suspended[1]] ?? suspended[1];
    return `suspensión de ${count} partidos`;
  }
  if (/full participant/.test(note)) return "práctica completa";
  if (/limited participant/.test(note)) return "práctica limitada";
  if (/non-?participant/.test(note)) return "no practicó";
  if (/unlikely|probably won't|will not play|won't play|ruled out|not expected to play/.test(note)) return "difícil que juegue";
  if (/hopeful to return|could return|expected to return/.test(note)) return "podría volver pronto";
  if (/isn't expected to face a long-term|not expected to face a long-term/.test(note)) return "sin baja larga";
  if (/long-term/.test(note)) return "baja larga";
  if (/injured reserve/.test(note)) return "reserva de lesionados";
  return null;
}

function injuryImpact(detail: string | null | undefined) {
  const text = detail?.trim() ?? "";
  if (!text) return MISSING;
  const parts = bodyParts(text);
  const outcome = injuryOutcome(text);
  if (parts.length && outcome) return sentenceCase(`${parts.join(" y ")} · ${outcome}`);
  if (outcome) return sentenceCase(outcome);
  if (parts.length) return sentenceCase(parts.join(" y "));
  return MISSING;
}

function sideInjuries(game: GameCard, abbr: string): Injury[] {
  const rows = normalizeTeamAbbr(game.away.abbr) === abbr ? game.away_injuries : game.home_injuries;
  return (rows ?? []).map((row) => ({
    name: row.name,
    pos: row.pos || "—",
    status: STATUS_ES[row.status] ?? row.status,
    impact: injuryImpact(row.detail),
  }));
}

function weatherLabel(game: GameCard) {
  const temp = game.weather_c != null ? Math.round(game.weather_c) : game.temp != null ? Math.round(((game.temp - 32) * 5) / 9) : null;
  const precip = game.weather_precip;
  const wind = game.weather_wind != null ? game.weather_wind : game.wind != null ? Math.round(game.wind * 1.609) : null;
  if (temp == null && precip == null && wind == null) return MISSING;
  const parts: string[] = [];
  if (temp != null) parts.push(`${temp}°C`);
  if (precip != null) parts.push(`lluvia ${precip}%`);
  if (wind != null) parts.push(`viento ${wind} km/h`);
  return parts.join(", ");
}

function moneyLabel(odds: number | null | undefined) {
  if (odds == null) return MISSING;
  const rounded = Math.round(odds);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function impliedPct(odds: number) {
  const probability = odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
  return Math.round(probability * 100);
}

function marketEdge(model: number, odds: number | null | undefined) {
  if (odds == null) return { text: MISSING, tone: "muted" as const };
  const gap = model - impliedPct(odds);
  if (gap >= 5) return { text: "Valor", tone: "green" as const };
  if (gap >= 2) return { text: "Ligero valor", tone: "green" as const };
  return { text: "Neutral", tone: "muted" as const };
}

function splitQuarters(total: number): [number, number, number, number] {
  const weights = [0.22, 0.27, 0.24, 0.27];
  const raw = weights.map((weight) => Math.floor(total * weight));
  let remainder = total - raw.reduce((sum, value) => sum + value, 0);
  const order = [1, 3, 2, 0];
  let cursor = 0;
  while (remainder > 0) {
    raw[order[cursor % order.length]] += 1;
    remainder -= 1;
    cursor += 1;
  }
  return [raw[0], raw[1], raw[2], raw[3]];
}

function lineText(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatTimeEt(game: GameCard) {
  const raw = kickoffLabel(game);
  const match = raw.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!match) return "Horario por definir";
  return `${match[1]}:${match[2]} ${match[3].toUpperCase()} (ET)`;
}

function stadiumLine(game: GameCard, homeCity: string) {
  const stadium = game.stadium?.trim();
  const city = pretty(homeCity);
  if (!stadium) return city;
  if (/wembley/i.test(stadium)) return "Wembley Stadium, Londres";
  if (/tottenham/i.test(stadium)) return `${stadium}, Londres`;
  if (stadium.toLowerCase().includes(city.toLowerCase())) return stadium;
  return `${stadium}, ${city}`;
}

function restLabel(games: SlateGame[], cutoff: SlateGame, awayAbbr: string, homeAbbr: string) {
  const days = (abbr: string) => {
    const last = priorGames(games, abbr, cutoff).at(-1);
    if (!last?.item.game.gameday || !cutoff.game.gameday) return null;
    const previous = parseCalendarDate(last.item.game.gameday);
    const next = parseCalendarDate(cutoff.game.gameday);
    if (!previous || !next) return null;
    return Math.round((next.getTime() - previous.getTime()) / 86_400_000);
  };
  const awayDays = days(awayAbbr);
  const homeDays = days(homeAbbr);
  const awayName = pretty(nick(awayAbbr));
  const homeName = pretty(nick(homeAbbr));
  if (awayDays == null && homeDays == null) return MISSING;
  if (awayDays != null && awayDays === homeDays) return `Ambos con ${awayDays} días`;
  const awayText = awayDays == null ? `${awayName} debut` : `${awayName} ${awayDays} días`;
  const homeText = homeDays == null ? `${homeName} debut` : `${homeName} ${homeDays} días`;
  return `${awayText} | ${homeText}`;
}

function buildSide(
  games: SlateGame[],
  cutoff: SlateGame,
  side: GameCard["away"],
  rankings: Rankings | undefined,
  allowed: RateTable,
  yards: RateTable,
  rates: {
    ypp: RateTable;
    passYds: RateTable;
    epa: RateTable;
    sacks: RateTable;
    interceptions: RateTable;
    hits: RateTable;
  },
): TeamSide {
  const abbr = normalizeTeamAbbr(side.abbr);
  const history = priorGames(games, abbr, cutoff);
  const lastFive = history.slice(-5);
  const lastThree = history.slice(-3);
  const rankRow = rankings?.teams.find((team) => normalizeTeamAbbr(team.abbr) === abbr);
  const home: Rec = { w: 0, l: 0, t: 0 };
  const road: Rec = { w: 0, l: 0, t: 0 };
  for (const entry of history) {
    const bucket = entry.row.away ? road : home;
    if (entry.row.result === "W") bucket.w += 1;
    else if (entry.row.result === "L") bucket.l += 1;
    else bucket.t += 1;
  }
  const schedule: ScheduleRow[] = lastFive.map(({ item, row }) => ({
    week: item.week,
    opp: pretty(nick(row.opp)),
    oppAbbr: normalizeTeamAbbr(row.opp),
    away: row.away,
    result: row.result,
    score: `${row.scored}-${row.allowed}`,
    oppRecord: formatRec(recordOf(games, row.opp, item), true),
  }));
  const rivalRecs = lastFive.map(({ item, row }) => recordOf(games, row.opp, item));
  const beatenRecs = lastFive.filter((entry) => entry.row.result === "W").map(({ item, row }) => recordOf(games, row.opp, item));
  const scoredAvg = lastThree.length
    ? lastThree.reduce((sum, entry) => sum + entry.row.scored, 0) / lastThree.length
    : 0;
  const allowedAvg = lastThree.length
    ? lastThree.reduce((sum, entry) => sum + entry.row.allowed, 0) / lastThree.length
    : 0;
  const trend: Rec = { w: 0, l: 0, t: 0 };
  for (const entry of lastThree) {
    if (entry.row.result === "W") trend.w += 1;
    else if (entry.row.result === "L") trend.l += 1;
    else trend.t += 1;
  }
  const pointsRank = side.ppg != null ? (rankRow?.ranks.points ?? null) : null;
  const yardsRank = yards.ranks.get(abbr) ?? null;
  const yardsValue = yards.rates.get(abbr);
  const allowedRank = allowed.rates.has(abbr) ? (allowed.ranks.get(abbr) ?? null) : null;
  const allowedValue = allowed.rates.get(abbr);
  return {
    abbr,
    city: teamCity(abbr),
    name: nick(abbr),
    record: formatRecord(side),
    split: `(${formatRec(home)} local | ${formatRec(road)} visita)`,
    schedule,
    rivalsRecord: history.length ? recPct(sumRecs(rivalRecs)) : MISSING,
    beatenRecord: history.length ? recPct(sumRecs(beatenRecs)) : MISSING,
    offense: [
      { label: "Puntos", rank: pointsRank, value: side.ppg != null ? side.ppg.toFixed(1) : MISSING },
      { label: "Yardas totales", rank: yardsValue == null ? null : yardsRank, value: yardsValue == null ? MISSING : yardsValue.toFixed(1) },
      rankedStat("Yardas por jugada", rates.ypp, abbr, 1),
      rankedStat("Yardas de pase", rates.passYds, abbr, 1),
      rankedStat("EPA/jugada", rates.epa, abbr, 2),
    ],
    defense: [
      { label: "Puntos", rank: allowedRank, value: allowedValue == null ? MISSING : allowedValue.toFixed(1) },
      { label: "Yardas totales", rank: null, value: MISSING },
      { label: "Presión al QB", rank: null, value: MISSING },
      rankedStat("Capturas", rates.sacks, abbr, 1),
      rankedStat("Intercepciones", rates.interceptions, abbr, 1),
      rankedStat("Golpes al QB", rates.hits, abbr, 1),
    ],
    injuries: sideInjuries(cutoff.game, abbr),
    trendRecord: lastThree.length ? formatRec(trend, true) : MISSING,
    trendScored: lastThree.length ? scoredAvg.toFixed(1) : MISSING,
    trendAllowed: lastThree.length ? allowedAvg.toFixed(1) : MISSING,
    form: lastThree.map((entry) => entry.row.result),
    quarters: [0, 0, 0, 0],
  };
}

function rankScore(rank: number | null) {
  if (rank == null) return null;
  return clamp(((33 - rank) / 32) * 100, 0, 100);
}

function blend(values: (number | null)[]) {
  const known = values.filter((value): value is number => value != null);
  if (!known.length) return null;
  return known.reduce((sum, value) => sum + value, 0) / known.length;
}

function normalCdf(z: number) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return clamp(0.5 * (1 + sign * erf), 0.02, 0.98);
}

function restDays(games: SlateGame[], cutoff: SlateGame, abbr: string) {
  const last = priorGames(games, abbr, cutoff).at(-1);
  if (!last?.item.game.gameday || !cutoff.game.gameday) return null;
  const previous = parseCalendarDate(last.item.game.gameday);
  const next = parseCalendarDate(cutoff.game.gameday);
  if (!previous || !next) return null;
  return Math.round((next.getTime() - previous.getTime()) / 86_400_000);
}

function resultQuality(games: SlateGame[], history: ReturnType<typeof priorGames>) {
  if (!history.length) return null;
  const total = history.reduce((sum, entry) => {
    const opponent = recordOf(games, entry.row.opp, entry.item);
    const played = opponent.w + opponent.l + opponent.t;
    const strength = played ? (opponent.w + opponent.t * 0.5) / played : 0.5;
    const outcome = entry.row.result === "W" ? 1 : entry.row.result === "L" ? -1 : 0;
    const margin = Math.max(-1, Math.min(1, (entry.row.scored - entry.row.allowed) / 14));
    return sum + outcome * (0.45 + strength) * 0.7 + margin * 0.3;
  }, 0);
  return clamp(50 + (total / history.length) * 35, 0, 100);
}

function injuryBurden(list: Injury[]) {
  return Math.min(
    4,
    list.reduce((sum, player) => {
      const status = player.status === "Reserva" || player.status === "Fuera" || player.status === "Suspendido" ? 1 : player.status === "Dudoso" ? 0.55 : 0.2;
      const pos = player.pos.toUpperCase();
      const weight = pos === "QB" ? 2.2 : ["RB", "WR", "TE", "OT", "OG", "C", "G", "T", "OL"].includes(pos) ? 0.55 : ["DE", "DT", "LB", "CB", "S", "EDGE", "DL"].includes(pos) ? 0.45 : 0.25;
      return sum + weight * status;
    }, 0),
  );
}

function confidenceLabel(score: number) {
  if (score <= 2) return "muy baja";
  if (score <= 4) return "baja";
  if (score <= 6) return "moderada";
  return "alta";
}

function buildMatchup(item: SlateGame, games: SlateGame[], rankings: Rankings | undefined): MatchupData {
  const { game, week } = item;
  const allowed = pointsAllowedTable(games, item);
  const yards = offenseYards(rankings);
  const rates = {
    ypp: metricTable(rankings, yardsPerPlay, false),
    passYds: metricTable(rankings, (team) => perGame(team, "passing"), false),
    epa: metricTable(rankings, epaPerPlay, false),
    sacks: metricTable(rankings, (team) => perGame(team, "sacks"), false),
    interceptions: metricTable(rankings, (team) => perGame(team, "interceptions"), false),
    hits: metricTable(rankings, (team) => perGame(team, "qb_hits"), false),
    giveaways: metricTable(rankings, (team) => perGame(team, "giveaways"), true),
  };
  const away = buildSide(games, item, game.away, rankings, allowed, yards, rates);
  const home = buildSide(games, item, game.home, rankings, allowed, yards, rates);
  const awayHistory = priorGames(games, away.abbr, item);
  const homeHistory = priorGames(games, home.abbr, item);
  const awayRecent = awayHistory.slice(-3);
  const homeRecent = homeHistory.slice(-3);
  const awayAllowed = allowed.rates.get(away.abbr) ?? null;
  const homeAllowed = allowed.rates.get(home.abbr) ?? null;
  const recentAvg = (rows: typeof awayRecent, key: "scored" | "allowed") =>
    rows.length ? rows.reduce((sum, entry) => sum + entry.row[key], 0) / rows.length : null;
  const projectPoints = (offense: number | null, defense: number | null, recent: number | null) => {
    const season = offense != null && defense != null ? offense * 0.55 + defense * 0.45 : (offense ?? defense ?? 21.5);
    return recent == null ? season : season * 0.8 + recent * 0.2;
  };
  const awayBurden = injuryBurden(away.injuries);
  const homeBurden = injuryBurden(home.injuries);
  const awayRest = restDays(games, item, away.abbr);
  const homeRest = restDays(games, item, home.abbr);
  const restEdge = awayRest != null && homeRest != null ? clamp(homeRest - awayRest, -4, 4) * 0.25 : 0;
  const weatherCut = ((game.weather_wind ?? 0) >= 30 ? 1.5 : 0) + ((game.weather_precip ?? 0) >= 55 ? 1.5 : 0) + ((game.weather_c ?? 20) <= 0 ? 1 : 0);
  const efficiency = (abbr: string) =>
    blend([
      rankScore(yards.ranks.get(abbr) ?? null),
      rankScore(rates.ypp.ranks.get(abbr) ?? null),
      rankScore(rates.epa.ranks.get(abbr) ?? null),
      rankScore(allowed.ranks.get(abbr) ?? null),
      rankScore(rates.sacks.ranks.get(abbr) ?? null),
      rankScore(rates.interceptions.ranks.get(abbr) ?? null),
      rankScore(rates.hits.ranks.get(abbr) ?? null),
      rankScore(rates.giveaways.ranks.get(abbr) ?? null),
    ]);
  const awayEff = efficiency(away.abbr);
  const homeEff = efficiency(home.abbr);
  const awaySched = resultQuality(games, awayHistory);
  const homeSched = resultQuality(games, homeHistory);
  const awayRecentQ = resultQuality(games, awayRecent);
  const homeRecentQ = resultQuality(games, homeRecent);
  const tactical = blend(
    game.categories.map((category) =>
      category.away_rank == null || category.home_rank == null ? null : rankScore(category.away_rank)! - rankScore(category.home_rank)!,
    ),
  );
  const pieces = [
    { weight: 25, diff: awayEff != null && homeEff != null ? homeEff - awayEff : null },
    { weight: 15, diff: tactical == null ? null : -tactical },
    { weight: 15, diff: awaySched != null && homeSched != null ? homeSched - awaySched : null },
    { weight: 10, diff: awayRecentQ != null && homeRecentQ != null ? homeRecentQ - awayRecentQ : null },
  ];
  const usedWeight = pieces.reduce((sum, piece) => (piece.diff == null ? sum : sum + piece.weight), 0);
  const ratingEdge = usedWeight
    ? pieces.reduce((sum, piece) => (piece.diff == null ? sum : sum + piece.diff * piece.weight), 0) / usedWeight / 12
    : 0;
  let rawAway = projectPoints(game.away.ppg, homeAllowed, recentAvg(awayRecent, "scored")) - awayBurden;
  let rawHome = projectPoints(game.home.ppg, awayAllowed, recentAvg(homeRecent, "scored")) - homeBurden + 1.2 + restEdge + ratingEdge;
  if (weatherCut) {
    rawAway -= weatherCut / 2;
    rawHome -= weatherCut / 2;
  }
  const scoreAway = Math.max(6, Math.round(rawAway));
  const scoreHome = Math.max(6, Math.round(rawHome));
  away.quarters = splitQuarters(scoreAway);
  home.quarters = splitQuarters(scoreHome);
  const total = scoreAway + scoreHome;
  const bookLine = game.book_total ?? game.api_total;
  const hasLine = bookLine != null;
  const line = bookLine ?? total;
  const spread = game.spread ?? game.api_spread;
  const homeMargin = scoreHome - scoreAway;
  const winHome = Math.round(normalCdf(homeMargin / 13.5) * 100);
  const winAway = 100 - winHome;
  const homeCover = spread == null ? null : Math.round(normalCdf((homeMargin + spread) / 13.5) * 100);
  const awayCover = homeCover == null ? null : 100 - homeCover;
  const overProb = hasLine ? Math.round(normalCdf((total - line) / 11) * 100) : 50;
  const underProb = 100 - overProb;
  const factorsUsed = [awayEff, homeEff, awaySched, homeSched, tactical].filter((value) => value != null).length;
  let confidenceScore = 5;
  if (awayHistory.length >= 4 && homeHistory.length >= 4) confidenceScore += 1;
  if (awayHistory.length < 2 || homeHistory.length < 2) confidenceScore -= 2;
  if (Math.abs(homeMargin) >= 6) confidenceScore += 1;
  if (Math.abs(homeMargin) < 2) confidenceScore -= 1;
  if (factorsUsed < 3) confidenceScore -= 1;
  const uncertain = [...away.injuries, ...home.injuries].filter((player) => player.status === "Cuestionable" || player.status === "Dudoso").length;
  if (uncertain >= 4) confidenceScore -= 1;
  confidenceScore = clamp(confidenceScore, 2, 8);
  const confidenceWord = confidenceLabel(confidenceScore);
  const favorite = homeMargin === 0 ? null : homeMargin > 0 ? home : away;
  const marginAbs = Math.abs(homeMargin);
  const marginText = favorite
    ? `Diferencia esperada: ${pretty(favorite.name)} por ${marginAbs} ${marginAbs === 1 ? "punto" : "puntos"}`
    : "Empate proyectado";
  const awayCode = normalizeTeamAbbr(game.away.abbr);
  const homeCode = normalizeTeamAbbr(game.home.abbr);
  const pair = (table: RateTable) => ({
    away: table.rates.get(awayCode) ?? null,
    home: table.rates.get(homeCode) ?? null,
  });
  const compare: CompareRow[] = [
    { label: "Puntos anotados por partido", away: game.away.ppg, home: game.home.ppg, digits: 1 },
    {
      label: "Puntos permitidos por partido",
      away: allowed.rates.get(away.abbr) ?? null,
      home: allowed.rates.get(home.abbr) ?? null,
      digits: 1,
    },
    {
      label: "Yardas totales por partido",
      away: yards.rates.get(away.abbr) ?? null,
      home: yards.rates.get(home.abbr) ?? null,
      digits: 1,
    },
    { label: "Yardas por jugada", ...pair(rates.ypp), digits: 1 },
    { label: "Tercera oportunidad", away: null, home: null, digits: 0, suffix: "%" },
    { label: "Zona roja (TD)", away: null, home: null, digits: 0, suffix: "%" },
    { label: "Presiones al QB", away: null, home: null, digits: 0 },
    { label: "Entregas de balón", ...pair(rates.giveaways), digits: 1 },
    { label: "Yardas de pase por partido", ...pair(rates.passYds), digits: 1 },
    { label: "Capturas por partido", ...pair(rates.sacks), digits: 1 },
    { label: "Intercepciones por partido", ...pair(rates.interceptions), digits: 1 },
    { label: "Golpes al QB por partido", ...pair(rates.hits), digits: 1 },
    { label: "EPA por jugada", ...pair(rates.epa), digits: 2 },
  ];
  const gaps = [...game.categories]
    .filter((category) => category.away_rank != null && category.home_rank != null)
    .map((category) => ({
      label: category.label,
      gap: Math.abs((category.away_rank ?? 0) - (category.home_rank ?? 0)),
      awayRank: category.away_rank ?? 0,
      homeRank: category.home_rank ?? 0,
    }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);
  const bullets = gaps.length
    ? gaps.map((category) => {
        const awayBetter = category.awayRank <= category.homeRank;
        const leader = awayBetter ? pretty(away.name) : pretty(home.name);
        const lead = awayBetter ? category.awayRank : category.homeRank;
        const trail = awayBetter ? category.homeRank : category.awayRank;
        return `${category.label}: ${leader} ${lead}° vs ${trail}°`;
      })
    : [MISSING];
  const combined = (game.away.ppg ?? 0) + (game.home.ppg ?? 0);
  const pace = combined >= 48 ? "Alto" : combined >= 42 ? "Medio-alto" : combined >= 36 ? "Medio" : "Bajo";
  const overValue = !hasLine ? MISSING : total - line >= 2 ? "Valor" : total - line >= 1 ? "Ligero valor" : "Neutral";
  const underValue = !hasLine ? MISSING : line - total >= 2 ? "Valor" : line - total >= 1 ? "Ligero valor" : "Neutral";
  const leader = winHome >= winAway ? home : away;
  const trailer = leader === home ? away : home;
  const leaderPct = leader === home ? winHome : winAway;
  return {
    gameId: game.game_id,
    weekLabel: String(week),
    dateLine: game.gameday ? formatKickoff(game.gameday) : "Fecha por definir",
    timeLine: formatTimeEt(game),
    stadium: stadiumLine(game, home.city),
    confidence: `${confidenceScore} / 10 (${confidenceWord})`,
    away,
    home,
    winAway,
    winHome,
    scoreAway,
    scoreHome,
    marginText,
    total,
    line,
    hasLine,
    overProb,
    underProb,
    compare,
    factors: [
      { icon: "pin", label: "Localía", value: `${pretty(home.name)} (${stadiumLine(game, home.city)})` },
      { icon: "weather", label: "Clima", value: weatherLabel(game) },
      { icon: "rest", label: "Descanso", value: restLabel(games, item, away.abbr, home.abbr) },
      { icon: "pace", label: "Ritmo de juego", value: `${pace} (${combined.toFixed(1)} pts combinados)` },
      { icon: "key", label: "Enfrentamientos clave", bullets },
    ],
    markets: [
      {
        market: `Ganador - ${pretty(away.name)}`,
        line: moneyLabel(game.away_moneyline),
        prob: `${winAway}%`,
        value: confidenceScore < 5 ? MISSING : marketEdge(winAway, game.away_moneyline).text,
        valueTone: confidenceScore < 5 ? "muted" : marketEdge(winAway, game.away_moneyline).tone,
      },
      {
        market: `Ganador - ${pretty(home.name)}`,
        line: moneyLabel(game.home_moneyline),
        prob: `${winHome}%`,
        value: confidenceScore < 5 ? MISSING : marketEdge(winHome, game.home_moneyline).text,
        valueTone: confidenceScore < 5 ? "muted" : marketEdge(winHome, game.home_moneyline).tone,
      },
      {
        market: `Hándicap - ${pretty(away.name)}`,
        line: spread == null ? MISSING : formatSpread(-spread),
        prob: spread == null ? MISSING : `${awayCover}%`,
        value: spread == null || confidenceScore < 5 ? MISSING : awayCover != null && awayCover >= 55 ? "Ligero valor" : "Neutral",
        valueTone: spread != null && confidenceScore >= 5 && awayCover != null && awayCover >= 55 ? "green" : "muted",
      },
      {
        market: `Hándicap - ${pretty(home.name)}`,
        line: spread == null ? MISSING : formatSpread(spread),
        prob: spread == null ? MISSING : `${homeCover}%`,
        value: spread == null || confidenceScore < 5 ? MISSING : homeCover != null && homeCover >= 55 ? "Ligero valor" : "Neutral",
        valueTone: spread != null && confidenceScore >= 5 && homeCover != null && homeCover >= 55 ? "green" : "muted",
      },
      {
        market: hasLine ? `Total - Más de ${lineText(line)}` : "Total - Más",
        line: hasLine ? lineText(line) : MISSING,
        prob: hasLine ? `${overProb}%` : MISSING,
        value: !hasLine || confidenceScore < 5 ? MISSING : overValue,
        valueTone: !hasLine || confidenceScore < 5 || overValue === "Neutral" ? "muted" : "green",
      },
      {
        market: hasLine ? `Total - Menos de ${lineText(line)}` : "Total - Menos",
        line: hasLine ? lineText(line) : MISSING,
        prob: hasLine ? `${underProb}%` : MISSING,
        value: !hasLine || confidenceScore < 5 ? MISSING : underValue,
        valueTone: !hasLine || confidenceScore < 5 || underValue === "Neutral" ? "muted" : "green",
      },
    ],
    conclusion: `Estimación orientativa: ${pretty(leader.name)} ${leaderPct}%, marcador ${scoreAway}-${scoreHome} y total de ${total} puntos. Confianza ${confidenceWord} (${confidenceScore}/10). ${
      confidenceScore <= 4 || Math.abs(homeMargin) < 3
        ? "No hay una ventaja lo bastante sólida para una apuesta."
        : `${pretty(trailer.name)} llega con récord ${trailer.record}. El reporte de inactivos puede mover el marcador.`
    }`,
    notes: [],
  };
}

export async function loadMatchupSlate(): Promise<MatchupSlate | null> {
  try {
    const season = currentNflSeason();
    const status = await api.status(season);
    if (!status.weeks.length) return null;
    const bundles = await Promise.all(status.weeks.map((week) => api.week(season, week)));
    const games: SlateGame[] = [];
    const rankingsByWeek: Record<number, Rankings> = {};
    for (const bundle of bundles) {
      rankingsByWeek[bundle.board.week] = bundle.rankings;
      for (const game of bundle.board.games) games.push({ week: bundle.board.week, game });
    }
    games.sort((a, b) => (isBefore(a, b) ? -1 : isBefore(b, a) ? 1 : 0));
    const today = todayInMonterrey()?.toISOString().slice(0, 10) ?? "";
    const upcoming = games.findIndex((item) => (item.game.gameday ?? "") >= today);
    const index = upcoming >= 0 ? upcoming : Math.max(0, games.length - 1);
    return { games, rankingsByWeek, index };
  } catch {
    return null;
  }
}

export function matchupAt(slate: MatchupSlate, index: number) {
  const item = slate.games[index];
  if (!item) return cloneMatchup();
  return buildMatchup(item, slate.games, slate.rankingsByWeek[item.week]);
}

export function formatCompare(value: number | null, row: CompareRow) {
  if (value == null) return "No encontrado";
  const text = row.digits === 0 ? String(Math.round(value)) : value.toFixed(row.digits);
  return `${text}${row.suffix ?? ""}`;
}

export type AiPick = {
  winAway: number;
  winHome: number;
  scoreAway: number;
  scoreHome: number;
  overProb: number;
  underProb: number;
  margin: string;
};

function parseLine(line: string) {
  if (!line || line === MISSING) return null;
  const match = line.match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function sideFacts(team: TeamSide) {
  const games = team.schedule
    .map((row) => `semana ${row.week} ${row.away ? "de visita" : "en casa"} ante ${row.opp} ${row.result} ${row.score}, rival ${row.oppRecord}`)
    .join("; ");
  const stats = [...team.offense, ...team.defense]
    .filter((stat) => stat.value !== MISSING)
    .map((stat) => `${stat.label} ${stat.value}${stat.rank != null ? ` (${stat.rank}°)` : ""}`)
    .join(", ");
  const injuries = team.injuries
    .map((player) => {
      const note = player.impact && player.impact !== MISSING ? `, ${player.impact}` : "";
      return `${player.name} ${player.pos} ${player.status}${note}`;
    })
    .join("; ");
  return [
    `${pretty(team.name)} récord ${team.record} ${team.split}.`,
    team.rivalsRecord !== MISSING ? `Récord combinado de los rivales recientes: ${team.rivalsRecord}.` : "",
    games ? `Resultados: ${games}.` : "",
    team.trendRecord !== MISSING ? `Últimos tres: ${team.trendRecord}, anota ${team.trendScored}, permite ${team.trendAllowed}.` : "",
    stats ? `Temporada: ${stats}.` : "",
    injuries ? `Disponibilidad: ${injuries}.` : "Sin bajas listadas.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function forecastBrief(data: MatchupData) {
  const compare = data.compare
    .filter((row) => row.away != null || row.home != null)
    .map((row) => `${row.label}: visita ${row.away ?? "sin dato"}, local ${row.home ?? "sin dato"}`)
    .join("\n");
  const context = data.factors
    .map((factor) => {
      if (factor.value && factor.value !== MISSING) return `${factor.label}: ${factor.value}`;
      const bullets = (factor.bullets ?? []).filter((item) => item !== MISSING);
      return bullets.length ? `${factor.label}: ${bullets.join("; ")}` : "";
    })
    .filter(Boolean)
    .join("\n");
  const lines = data.markets
    .filter((row) => row.line && row.line !== MISSING)
    .map((row) => `${row.market}: ${row.line}`)
    .join("\n");
  return [
    `Partido de la semana ${data.weekLabel}: ${pretty(data.away.name)} visita a ${pretty(data.home.name)}.`,
    `${data.dateLine}. ${data.timeLine}. ${data.stadium}.`,
    `Visitante. ${sideFacts(data.away)}`,
    `Local. ${sideFacts(data.home)}`,
    compare ? `Comparación:\n${compare}` : "",
    context ? `Contexto:\n${context}` : "",
    lines ? `Líneas publicadas, no son el pronóstico:\n${lines}` : "No hay línea de puntos publicada.",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 7500);
}

export function applyAiForecast(data: MatchupData, ai: AiPick): MatchupData {
  const scoreAway = ai.scoreAway;
  const scoreHome = ai.scoreHome;
  const total = scoreAway + scoreHome;
  const diff = Math.abs(scoreHome - scoreAway);
  const favorite = diff === 0 ? null : scoreHome > scoreAway ? data.home : data.away;
  const marginText = favorite
    ? `Diferencia esperada: ${pretty(favorite.name)} por ${diff} ${diff === 1 ? "punto" : "puntos"}`
    : "Empate proyectado";
  const leader = ai.winHome >= ai.winAway ? data.home : data.away;
  const trailer = leader === data.home ? data.away : data.home;
  const leaderPct = leader === data.home ? ai.winHome : ai.winAway;
  const awayLabel = pretty(data.away.name);
  const homeLabel = pretty(data.home.name);
  const homeSpread = parseLine(data.markets.find((row) => row.market === `Hándicap - ${homeLabel}`)?.line ?? "");
  const homeCover = homeSpread == null ? null : Math.round(normalCdf((scoreHome - scoreAway + homeSpread) / 13.5) * 100);
  const awayCover = homeCover == null ? null : 100 - homeCover;
  const awayEdge = marketEdge(ai.winAway, parseLine(data.markets.find((row) => row.market === `Ganador - ${awayLabel}`)?.line ?? ""));
  const homeEdge = marketEdge(ai.winHome, parseLine(data.markets.find((row) => row.market === `Ganador - ${homeLabel}`)?.line ?? ""));
  const overValue = !data.hasLine ? MISSING : total - data.line >= 2 ? "Valor" : total - data.line >= 1 ? "Ligero valor" : "Neutral";
  const underValue = !data.hasLine ? MISSING : data.line - total >= 2 ? "Valor" : data.line - total >= 1 ? "Ligero valor" : "Neutral";
  const tone = (value: string) => (value === "Neutral" || value === MISSING ? ("muted" as const) : ("green" as const));
  const markets = data.markets.map((row) => {
    if (row.market === `Ganador - ${awayLabel}`) return { ...row, prob: `${ai.winAway}%`, value: awayEdge.text, valueTone: awayEdge.tone };
    if (row.market === `Ganador - ${homeLabel}`) return { ...row, prob: `${ai.winHome}%`, value: homeEdge.text, valueTone: homeEdge.tone };
    if (row.market === `Hándicap - ${awayLabel}` && awayCover != null) {
      return { ...row, prob: `${awayCover}%`, value: awayCover >= 55 ? "Ligero valor" : "Neutral", valueTone: awayCover >= 55 ? ("green" as const) : ("muted" as const) };
    }
    if (row.market === `Hándicap - ${homeLabel}` && homeCover != null) {
      return { ...row, prob: `${homeCover}%`, value: homeCover >= 55 ? "Ligero valor" : "Neutral", valueTone: homeCover >= 55 ? ("green" as const) : ("muted" as const) };
    }
    if (row.market.startsWith("Total - Más")) return { ...row, prob: data.hasLine ? `${ai.overProb}%` : row.prob, value: overValue, valueTone: tone(overValue) };
    if (row.market.startsWith("Total - Menos")) return { ...row, prob: data.hasLine ? `${ai.underProb}%` : row.prob, value: underValue, valueTone: tone(underValue) };
    return row;
  });
  return {
    ...data,
    away: { ...data.away, quarters: splitQuarters(scoreAway) },
    home: { ...data.home, quarters: splitQuarters(scoreHome) },
    winAway: ai.winAway,
    winHome: ai.winHome,
    scoreAway,
    scoreHome,
    marginText,
    total,
    overProb: ai.overProb,
    underProb: ai.underProb,
    markets,
    conclusion: `Fuente IA: ${pretty(leader.name)} ${leaderPct}%, marcador ${scoreAway}-${scoreHome} y total de ${total} puntos. ${
      diff < 3 ? "El margen es corto." : `${pretty(trailer.name)} llega con récord ${trailer.record}.`
    }`,
  };
}

export function rankTone(rank: number) {
  return rank <= 16 ? "good" : "bad";
}
