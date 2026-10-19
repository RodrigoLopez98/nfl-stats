import { api, type GameCard, type Rankings } from "@/api";
import { currentNflSeason, parseCalendarDate } from "@/lib/datetime";

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
  away: number;
  home: number;
  digits: number;
  suffix?: string;
};

export type RankStat = {
  label: string;
  rank: number;
  value: string;
};

export type Injury = {
  name: string;
  pos: string;
  status: "Probable" | "Cuestionable" | "Out" | "Dudoso";
  impact: "Alto" | "Medio" | "Bajo";
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
  weekLabel: string;
  dateLine: string;
  timeLine: string;
  stadium: string;
  away: TeamSide;
  home: TeamSide;
  winAway: number;
  winHome: number;
  scoreAway: number;
  scoreHome: number;
  marginText: string;
  total: number;
  line: number;
  overProb: number;
  underProb: number;
  compare: CompareRow[];
  factors: Factor[];
  markets: MarketRow[];
  conclusion: string;
  notes: string[];
};

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export const IMAGE_MATCHUP: MatchupData = {
  weekLabel: "X",
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

function teamRank(rankings: Rankings, abbr: string) {
  return rankings.teams.find((team) => team.abbr.toUpperCase() === abbr);
}

/** Sustituye solo cifras que la API ya calcula. El resto se queda como en la imagen. */
function applyApi(data: MatchupData, game: GameCard, rankings: Rankings, week: number) {
  const awayIsAtl = game.away.abbr.toUpperCase() === "ATL";
  const falcons = awayIsAtl ? game.away : game.home;
  const bears = awayIsAtl ? game.home : game.away;

  data.weekLabel = String(week);
  data.away.record = formatRecord(falcons);
  data.home.record = formatRecord(bears);
  if (game.gameday) data.dateLine = formatKickoff(game.gameday);

  const falconsRank = teamRank(rankings, "ATL");
  const bearsRank = teamRank(rankings, "CHI");
  if (falconsRank?.ranks.points) data.away.offense[0].rank = falconsRank.ranks.points;
  if (bearsRank?.ranks.points) data.home.offense[0].rank = bearsRank.ranks.points;
  if (falcons.ppg != null) data.away.offense[0].value = falcons.ppg.toFixed(1);
  if (bears.ppg != null) data.home.offense[0].value = bears.ppg.toFixed(1);
  if (falconsRank?.ranks.sacks) data.away.defense[2].rank = falconsRank.ranks.sacks;
  if (bearsRank?.ranks.sacks) data.home.defense[2].rank = bearsRank.ranks.sacks;

  if (game.projected_total != null) data.total = Math.round(game.projected_total);
  if (game.book_total != null) {
    data.line = game.book_total;
    data.markets[4].market = `Total - Más de ${game.book_total}`;
    data.markets[5].market = `Total - Menos de ${game.book_total}`;
    data.markets[4].line = String(game.book_total);
    data.markets[5].line = String(game.book_total);
  }

  const spread = game.spread ?? game.api_spread;
  if (spread != null && awayIsAtl) {
    data.markets[2].line = formatSpread(-spread);
    data.markets[3].line = formatSpread(spread);
  }
}

export async function loadMatchup(): Promise<MatchupData> {
  const data = cloneMatchup();
  try {
    const dash = await api.dashboard(currentNflSeason());
    const game = dash.board.games.find((item) => {
      const sides = [item.away.abbr, item.home.abbr].map((abbr) => abbr.toUpperCase()).sort().join("-");
      return sides === "ATL-CHI";
    });
    if (!game) return data;
    applyApi(data, game, dash.rankings, dash.board.week);
    return data;
  } catch {
    return data;
  }
}

export function formatCompare(value: number, row: CompareRow) {
  const text = row.digits === 0 ? String(Math.round(value)) : value.toFixed(row.digits);
  return `${text}${row.suffix ?? ""}`;
}

export function rankTone(rank: number) {
  return rank <= 16 ? "good" : "bad";
}
