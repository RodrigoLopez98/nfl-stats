import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamLogo } from "@/components/team-logo";
import type { Rankings } from "@/api";

type Team = Rankings["teams"][number];

const GROUPS = [
  {
    id: "ofensiva",
    label: "Ofensiva",
    stats: [
      { key: "passing", label: "Pase", unit: "yds" },
      { key: "receiving", label: "Recepción", unit: "yds" },
      { key: "first_downs", label: "First downs", unit: "" },
      { key: "rushing", label: "Carrera", unit: "yds" },
      { key: "points", label: "Puntos", unit: "" },
    ],
  },
  {
    id: "defensiva",
    label: "Defensiva",
    stats: [
      { key: "sacks", label: "Sacks", unit: "" },
      { key: "interceptions", label: "Intercepciones", unit: "" },
      { key: "forced_fumbles", label: "Fumbles forzados", unit: "" },
      { key: "tackles", label: "Tackles", unit: "" },
    ],
  },
  {
    id: "especial",
    label: "Especial",
    stats: [
      { key: "fg_made", label: "Goles de campo", unit: "hechos" },
      { key: "punt_return_yards", label: "Retorno de punt", unit: "yds" },
      { key: "kickoff_return_yards", label: "Retorno de kickoff", unit: "yds" },
      { key: "special_teams_tds", label: "Touchdowns", unit: "" },
    ],
  },
] as const;

function formatStat(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : String(Math.round(value));
}

function leaderOf(teams: Team[], key: string) {
  return teams
    .filter((team) => team.ranks[key] === 1)
    .sort((a, b) => (b.totals?.[key] ?? 0) - (a.totals?.[key] ?? 0))[0];
}

export function TeamRankings({ rankings, season }: { rankings: Rankings | null; season: number }) {
  const teams = rankings?.teams ?? [];
  const [abbr, setAbbr] = useState("");
  const [group, setGroup] = useState<(typeof GROUPS)[number]["id"]>("ofensiva");

  useEffect(() => {
    if (!teams.length) return;
    if (!teams.some((team) => team.abbr === abbr)) setAbbr(teams[0].abbr);
  }, [teams, abbr]);

  if (!teams.length) {
    return <p className="text-sm text-muted-foreground">Los ranks aparecen después de sincronizar.</p>;
  }

  const team = teams.find((item) => item.abbr === abbr) ?? teams[0];
  const active = GROUPS.find((item) => item.id === group) ?? GROUPS[0];
  const specialMissing = group === "especial" && active.stats.every((stat) => team.totals?.[stat.key] == null);

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4">
      <div className="flex items-center justify-between gap-3">
        <Select value={team.abbr} onValueChange={setAbbr}>
          <SelectTrigger className="w-28 border-primary/40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((item) => (
              <SelectItem key={item.abbr} value={item.abbr}>
                <span className="flex items-center gap-2">
                  <TeamLogo abbr={item.abbr} name={item.name} className="size-5" />
                  {item.abbr}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="truncate text-lg font-semibold tracking-wide text-primary">{team.name}</p>
        <TeamLogo abbr={team.abbr} name={team.name} className="size-10" />
      </div>
      <h2 className="text-xl font-semibold tracking-wide text-foreground">{season} Rankings</h2>
      <div className="grid grid-cols-3 border-b border-primary/20">
        {GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pb-2 text-center text-sm font-semibold tracking-wide uppercase ${
              item.id === group ? "border-b-2 border-destructive text-primary" : "text-muted-foreground"
            }`}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border-2 border-primary bg-white px-4">
        {specialMissing && (
          <p className="py-4 text-sm text-muted-foreground">Sincroniza la temporada para cargar equipos especiales.</p>
        )}
        {active.stats.map((stat) => {
          const rank = team.ranks[stat.key];
          const leader = leaderOf(teams, stat.key);
          const showLeader = leader && leader.abbr !== team.abbr;
          return (
            <div key={stat.key} className="grid grid-cols-[1fr_auto_5.5rem] items-center gap-3 border-b border-primary/15 py-3 last:border-b-0">
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">{stat.label}</p>
                {stat.unit && <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{stat.unit}</p>}
              </div>
              <p className="font-industry text-4xl leading-none font-black italic tracking-tight text-foreground">{rank == null ? "—" : `${rank}.º`}</p>
              <div className="text-right text-xs leading-5">
                <p>
                  <span className="text-destructive">#{rank ?? "—"}</span> {team.abbr}{" "}
                  <span className="font-semibold text-foreground">{formatStat(team.totals?.[stat.key])}</span>
                </p>
                {showLeader && (
                  <p className="text-muted-foreground">
                    <span className="text-primary">#1</span> {leader.abbr}{" "}
                    <span className="font-semibold text-foreground">{formatStat(leader.totals?.[stat.key])}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
