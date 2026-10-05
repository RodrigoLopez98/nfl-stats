/** Abreviaturas nfldata → código interno / ESPN. */
export function normalizeTeamAbbr(abbr: string) {
  const upper = abbr.toUpperCase();
  if (upper === "LA") return "LAR";
  return upper;
}

/** Nombre corto estilo NFL App (plural en mayúsculas). */
export const TEAM_NICKNAME: Record<string, string> = {
  ARI: "CARDINALS",
  ATL: "FALCONS",
  BAL: "RAVENS",
  BUF: "BILLS",
  CAR: "PANTHERS",
  CHI: "BEARS",
  CIN: "BENGALS",
  CLE: "BROWNS",
  DAL: "COWBOYS",
  DEN: "BRONCOS",
  DET: "LIONS",
  GB: "PACKERS",
  HOU: "TEXANS",
  IND: "COLTS",
  JAX: "JAGUARS",
  KC: "CHIEFS",
  LV: "RAIDERS",
  LAC: "CHARGERS",
  LAR: "RAMS",
  LA: "RAMS",
  MIA: "DOLPHINS",
  MIN: "VIKINGS",
  NE: "PATRIOTS",
  NO: "SAINTS",
  NYG: "GIANTS",
  NYJ: "JETS",
  PHI: "EAGLES",
  PIT: "STEELERS",
  SF: "49ERS",
  SEA: "SEAHAWKS",
  TB: "BUCCANEERS",
  TEN: "TITANS",
  WAS: "COMMANDERS",
};

/** Barra lateral en tarjetas de marcador. */
export const TEAM_ACCENT: Record<string, string> = {
  ARI: "#97233F",
  ATL: "#A71930",
  BAL: "#241773",
  BUF: "#00338D",
  CAR: "#0085CA",
  CHI: "#0B162A",
  CIN: "#FB4F14",
  CLE: "#311D00",
  DAL: "#041E42",
  DEN: "#FB4F14",
  DET: "#0076B6",
  GB: "#203731",
  HOU: "#03202F",
  IND: "#002C5F",
  JAX: "#101820",
  KC: "#E31837",
  LV: "#000000",
  LAC: "#0080C6",
  LAR: "#003594",
  LA: "#003594",
  MIA: "#008E97",
  MIN: "#4F2683",
  NE: "#002244",
  NO: "#D3BC8D",
  NYG: "#0B2265",
  NYJ: "#125740",
  PHI: "#004C54",
  PIT: "#FFB612",
  SF: "#AA0000",
  SEA: "#002244",
  TB: "#D50A0A",
  TEN: "#0C2340",
  WAS: "#5A1414",
};

export function teamNickname(abbr: string) {
  const code = normalizeTeamAbbr(abbr);
  return TEAM_NICKNAME[code] ?? code;
}

export function teamAccent(abbr: string) {
  const code = normalizeTeamAbbr(abbr);
  return TEAM_ACCENT[code] ?? "#666666";
}
