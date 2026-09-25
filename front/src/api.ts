const API = import.meta.env.VITE_API_URL ?? "";

export type Side = {
  abbr: string;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  ppg: number | null;
  over_pct: number | null;
  trend: string | null;
};

export type Category = {
  key: string;
  label: string;
  away_rank: number | null;
  home_rank: number | null;
  winner: string | null;
};

export type GameCard = {
  game_id: string;
  gameday: string | null;
  away: Side;
  home: Side;
  projected_total: number | null;
  book_total: number | null;
  edge: number | null;
  total_pick: string | null;
  winner_record: string;
  winner_ranks: string;
  rank_away: number;
  rank_home: number;
  categories: Category[];
  spread: number | null;
  odds_moneyline: number | null;
  odds_total: number | null;
  api_spread: number | null;
  api_total: number | null;
  pick_ari: string | null;
  pick_cabo: string | null;
  pick_spread: string | null;
  pick_sportsline: string | null;
  pick_castle: string | null;
  pick_alfredo: string | null;
  injuries: string | null;
  confirmed: boolean;
  away_score: number | null;
  home_score: number | null;
  actual_total: number | null;
  actual_pick: string | null;
};

export type Board = { season: number; week: number; games: GameCard[] };

export type Status = {
  season: number;
  suggested_week: number | null;
  weeks: number[];
  last_sync: string | null;
  games: number;
  teams: number;
};

export type Rankings = {
  season: number;
  week: number;
  categories: { key: string; label: string }[];
  teams: {
    abbr: string;
    name: string;
    wins: number;
    losses: number;
    ppg: number | null;
    ranks: Record<string, number | null>;
  }[];
};

export type BankrollLine = {
  id: number;
  group_key: string;
  sort_order: number;
  label: string;
  odds: number;
  stake: number | null;
  note: string | null;
  stake_used: number | null;
  payout: number | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "La API no respondió");
  }
  return response.json();
}

export const api = {
  status: (season: number) => request<Status>(`/api/status?season=${season}`),
  board: (season: number, week: number) => request<Board>(`/api/board?season=${season}&week=${week}`),
  rankings: (season: number, week: number) => request<Rankings>(`/api/rankings?season=${season}&week=${week}`),
  saveSlate: (gameId: string, body: Record<string, unknown>) =>
    request(`/api/slate/${gameId}`, { method: "PUT", body: JSON.stringify(body) }),
  sync: (season: number) => request<{ games: number; teams: number }>(`/api/sync?season=${season}`, { method: "POST" }),
  bankroll: () => request<BankrollLine[]>("/api/bankroll"),
  addBankroll: (body: Record<string, unknown>) =>
    request<BankrollLine[]>("/api/bankroll", { method: "POST", body: JSON.stringify(body) }),
  deleteBankroll: (id: number) => request<BankrollLine[]>(`/api/bankroll/${id}`, { method: "DELETE" }),
};
