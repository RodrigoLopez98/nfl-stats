import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Board, GameCard, Rankings } from "@/api";
import { TeamLogo } from "@/components/team-logo";
import { calendarWeekday } from "@/lib/datetime";
import { normalizeTeamAbbr, teamAccent, teamNickname } from "@/lib/team-meta";
import {
  broadcastEventTitle,
  formatLongWeekdayDate,
  formatShortDate,
  groupGamesByDay,
  isFinal,
  kickoffLabel,
  parseGameday,
  recordLabel,
  weekDateRangeLabel,
  winPct,
} from "@/lib/scores-format";

type HubTab = "scores" | "standings" | "events";

const TAB_LABELS: { id: HubTab; label: string }[] = [
  { id: "scores", label: "Scores" },
  { id: "standings", label: "Standings" },
  { id: "events", label: "Events" },
];

function ScoreTeamRow({
  abbr,
  wins,
  losses,
  ties,
  score,
  winner,
}: {
  abbr: string;
  wins: number;
  losses: number;
  ties: number;
  score?: number | null;
  winner?: boolean;
}) {
  const code = normalizeTeamAbbr(abbr);
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3 last:border-b-0">
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: teamAccent(code) }} />
      <TeamLogo abbr={code} name={teamNickname(code)} className="size-9" />
      <p className="font-industry flex-1 text-lg font-black italic tracking-wide text-white uppercase">
        {teamNickname(code)}
      </p>
      <div className="flex items-center gap-1.5">
        {winner && (
          <span
            className="size-0 border-y-[5px] border-l-[7px] border-y-transparent border-l-white"
            aria-hidden
          />
        )}
        <span className="min-w-[2rem] text-right text-lg font-semibold text-white tabular-nums">
          {score != null ? score : recordLabel(wins, losses, ties)}
        </span>
      </div>
    </div>
  );
}

function ScoreGameCard({ game }: { game: GameCard }) {
  const final = isFinal(game);
  const awayWins = final && (game.away_score ?? 0) > (game.home_score ?? 0);
  const homeWins = final && (game.home_score ?? 0) > (game.away_score ?? 0);
  const day = parseGameday(game.gameday);

  return (
    <div className="overflow-hidden rounded-xl bg-[#242731]">
      <ScoreTeamRow
        abbr={game.away.abbr}
        wins={game.away.wins}
        losses={game.away.losses}
        ties={game.away.ties}
        score={final ? game.away_score : null}
        winner={awayWins}
      />
      <ScoreTeamRow
        abbr={game.home.abbr}
        wins={game.home.wins}
        losses={game.home.losses}
        ties={game.home.ties}
        score={final ? game.home_score : null}
        winner={homeWins}
      />
      <div className="border-t border-white/10 px-3 py-2 text-center text-sm text-white/80">
        {final && day ? (
          <span className="inline-flex items-center gap-3 uppercase tracking-wide">
            <span>Final</span>
            <span className="h-3 w-px bg-white/30" />
            <span>{formatShortDate(day)}</span>
          </span>
        ) : (
          kickoffLabel(game)
        )}
      </div>
    </div>
  );
}

function EventHeader({ date }: { date: Date }) {
  const title = broadcastEventTitle(date);
  const showBrand = title.includes("Thursday") || title.includes("Monday");
  return (
    <div className="mb-2 mt-5 first:mt-0">
      <div className="flex items-center gap-2">
        {showBrand && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
            {title.includes("Thursday") ? "TNF" : "MNF"}
          </span>
        )}
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="text-xs text-white/55">{formatLongWeekdayDate(date)}</p>
    </div>
  );
}

function DayHeader({ date }: { date: Date }) {
  return (
    <h3 className="mt-6 border-b border-white/15 pb-2 text-lg font-semibold text-white first:mt-0">
      {formatLongWeekdayDate(date)}
    </h3>
  );
}

function ScoresPanel({ games, week }: { games: GameCard[]; week: number }) {
  const upcoming = useMemo(() => games.filter((game) => !isFinal(game)), [games]);
  const completedPrime = useMemo(
    () =>
      games.filter((game) => {
        if (!isFinal(game)) return false;
        const date = parseGameday(game.gameday);
        if (!date) return false;
        const day = calendarWeekday(date);
        return day === 4 || day === 1;
      }),
    [games],
  );
  const completedByDay = useMemo(
    () =>
      groupGamesByDay(
        games.filter((game) => {
          if (!isFinal(game)) return false;
          const date = parseGameday(game.gameday);
          if (!date) return false;
          const day = calendarWeekday(date);
          return day !== 4 && day !== 1;
        }),
      ),
    [games],
  );

  return (
    <div className="grid gap-2">
      {!!upcoming.length && (
        <section>
          <h2 className="text-xl font-semibold text-white">Upcoming Games</h2>
          {groupGamesByDay(upcoming).map(([dayKey, dayGames]) => {
            const date = parseGameday(dayKey);
            if (!date) return null;
            return (
              <div key={dayKey}>
                <EventHeader date={date} />
                <div className="grid gap-3">
                  {dayGames.map((game) => (
                    <ScoreGameCard key={game.game_id} game={game} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!!completedPrime.length && (
        <section>
          <h2 className="text-xl font-semibold text-white">Completed Games</h2>
          {groupGamesByDay(completedPrime).map(([dayKey, dayGames]) => {
            const date = parseGameday(dayKey);
            if (!date) return null;
            return (
              <div key={dayKey}>
                <EventHeader date={date} />
                <div className="grid gap-3">
                  {dayGames.map((game) => (
                    <ScoreGameCard key={game.game_id} game={game} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {completedByDay.map(([dayKey, dayGames]) => {
        const date = parseGameday(dayKey);
        if (!date) return null;
        return (
          <div key={`day-${dayKey}`}>
            <DayHeader date={date} />
            <div className="grid gap-3">
              {dayGames.map((game) => (
                <ScoreGameCard key={game.game_id} game={game} />
              ))}
            </div>
          </div>
        );
      })}

      {!games.length && (
        <p className="py-8 text-center text-sm text-white/60">No hay partidos en la semana {week}. Sincroniza la temporada.</p>
      )}
    </div>
  );
}

function StandingsPanel({ rankings }: { rankings: Rankings | null }) {
  const rows = useMemo(() => {
    const teams = rankings?.teams ?? [];
    return [...teams].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.abbr.localeCompare(b.abbr));
  }, [rankings]);

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-white/60">Standings disponibles después de sincronizar.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl bg-[#242731]">
      <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3.5rem] gap-2 border-b border-white/15 px-3 py-2 text-[10px] font-semibold tracking-wide text-white/50 uppercase">
        <span>#</span>
        <span>Team</span>
        <span className="text-right">W</span>
        <span className="text-right">L</span>
        <span className="text-right">Pct</span>
      </div>
      {rows.map((team, index) => {
        const code = normalizeTeamAbbr(team.abbr);
        const ties = 0;
        return (
          <div
            key={team.abbr}
            className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3.5rem] items-center gap-2 border-b border-white/10 px-3 py-2.5 last:border-b-0"
          >
            <span className="text-sm text-white/70 tabular-nums">{index + 1}</span>
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo abbr={code} name={teamNickname(code)} className="size-7" />
              <span className="truncate font-industry text-sm font-bold italic text-white uppercase">
                {teamNickname(code)}
              </span>
            </div>
            <span className="text-right text-sm text-white tabular-nums">{team.wins}</span>
            <span className="text-right text-sm text-white tabular-nums">{team.losses}</span>
            <span className="text-right text-sm text-white/80 tabular-nums">
              {winPct(team.wins, team.losses, ties)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function EventsPanel({ games }: { games: GameCard[] }) {
  const grouped = useMemo(() => groupGamesByDay(games), [games]);

  if (!grouped.length) {
    return <p className="py-8 text-center text-sm text-white/60">No hay eventos para esta semana.</p>;
  }

  return (
    <div className="grid gap-4">
      {grouped.map(([dayKey, dayGames]) => {
        const date = parseGameday(dayKey);
        if (!date) return null;
        const title = broadcastEventTitle(date);
        return (
          <div key={dayKey} className="rounded-xl bg-[#242731] p-4">
            <p className="font-industry text-lg font-black italic tracking-wide text-white uppercase">{title}</p>
            <p className="text-xs text-white/55">{formatLongWeekdayDate(date)}</p>
            <ul className="mt-3 grid gap-2">
              {dayGames.map((game) => {
                const away = normalizeTeamAbbr(game.away.abbr);
                const home = normalizeTeamAbbr(game.home.abbr);
                const final = isFinal(game);
                return (
                  <li key={game.game_id} className="flex items-center justify-between gap-2 text-sm text-white/90">
                    <span className="font-semibold">
                      {teamNickname(away)} @ {teamNickname(home)}
                    </span>
                    <span className="text-white/60">
                      {final ? `${game.away_score}-${game.home_score} Final` : kickoffLabel(game)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function NflScoresHub({
  board,
  rankings,
  week,
  weeks,
  onWeekChange,
}: {
  board: Board | null;
  rankings: Rankings | null;
  week: number;
  weeks: number[];
  onWeekChange: (week: number) => void;
}) {
  const [tab, setTab] = useState<HubTab>("scores");
  const games = board?.games ?? [];
  const range = weekDateRangeLabel(games);
  const weekIndex = weeks.indexOf(week);

  function step(delta: number) {
    const next = weeks[weekIndex + delta];
    if (next != null) onWeekChange(next);
  }

  return (
    <div className="-mx-4 min-h-full bg-[#0b0e14] px-4 pb-8 text-white sm:-mx-0 sm:rounded-xl sm:px-4">
      <div className="flex gap-6 border-b border-white/15 pt-2">
        {TAB_LABELS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`font-industry pb-3 text-xl font-black italic tracking-wide uppercase sm:text-2xl ${
              tab === item.id ? "border-b-[3px] border-white text-white" : "text-white/45"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between py-4">
        <button
          type="button"
          className="rounded-full p-2 text-white/80 disabled:opacity-30"
          disabled={weekIndex <= 0}
          onClick={() => step(-1)}
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="text-center">
          <p className="font-industry text-2xl font-black italic tracking-wide uppercase">Week {week}</p>
          {range && <p className="text-xs tracking-[0.2em] text-white/55 uppercase">{range}</p>}
        </div>
        <button
          type="button"
          className="rounded-full p-2 text-white/80 disabled:opacity-30"
          disabled={weekIndex < 0 || weekIndex >= weeks.length - 1}
          onClick={() => step(1)}
          aria-label="Semana siguiente"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>

      {tab === "scores" && <ScoresPanel games={games} week={week} />}
      {tab === "standings" && <StandingsPanel rankings={rankings} />}
      {tab === "events" && <EventsPanel games={games} />}
    </div>
  );
}
