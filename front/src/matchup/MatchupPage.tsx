import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CloudSun, Gauge, MapPin, Power, Star, Sun } from "lucide-react";
import { api } from "@/api";
import { TeamLogo } from "@/components/team-logo";
import { teamNickname } from "@/lib/team-meta";
import {
  applyAiForecast,
  forecastBrief,
  formatCompare,
  IMAGE_MATCHUP,
  loadMatchupSlate,
  matchupAt,
  type AiPick,
  type CompareRow,
  type Factor,
  type Injury,
  type MatchupData,
  type MatchupSlate,
  type ScheduleRow,
  type SlateGame,
  type TeamSide,
} from "./data";
import "./matchup.css";

const FACTOR_ICONS = {
  pin: MapPin,
  weather: CloudSun,
  rest: CalendarDays,
  pace: Gauge,
  key: Power,
} as const;

export function MatchupPage() {
  const [data, setData] = useState<MatchupData>(IMAGE_MATCHUP);
  const [slate, setSlate] = useState<MatchupSlate | null>(null);
  const [index, setIndex] = useState(0);
  const [forecast, setForecast] = useState<{ gameId: string; status: "loading" | "ready" | "error"; pick?: AiPick } | null>(null);

  useEffect(() => {
    let cancel = false;
    loadMatchupSlate().then((next) => {
      if (cancel || !next) return;
      setSlate(next);
      setIndex(next.index);
    });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!slate?.games.length) return;
    setData(matchupAt(slate, index));
  }, [slate, index]);

  useEffect(() => {
    if (!slate?.games.length) return;
    const current = matchupAt(slate, index);
    if (current.gameId === IMAGE_MATCHUP.gameId) return;
    const controller = new AbortController();
    setForecast({ gameId: current.gameId, status: "loading" });
    api
      .forecast(current.gameId, forecastBrief(current), controller.signal)
      .then((row) => {
        setForecast({
          gameId: current.gameId,
          status: "ready",
          pick: {
            winAway: row.win_away,
            winHome: row.win_home,
            scoreAway: row.score_away,
            scoreHome: row.score_home,
            overProb: row.over_prob,
            underProb: row.under_prob,
            margin: row.margin,
          },
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setForecast({ gameId: current.gameId, status: "error" });
      });
    return () => controller.abort();
  }, [slate, index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      event.preventDefault();
      setIndex((current) => {
        const next = event.key === "ArrowLeft" ? current - 1 : current + 1;
        if (!slate || next < 0 || next >= slate.games.length) return current;
        return next;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slate]);

  const totalGames = slate?.games.length ?? 0;
  const prevGame = slate?.games[index - 1];
  const nextGame = slate?.games[index + 1];
  const pick = forecast?.status === "ready" && forecast.pick && forecast.gameId === data.gameId ? forecast.pick : null;
  const failed = forecast?.status === "error" && forecast.gameId === data.gameId;
  const pending = Boolean(slate) && data.gameId !== IMAGE_MATCHUP.gameId && !pick && !failed;
  const shown = pick ? applyAiForecast(data, pick) : data;

  const awayPts = shown.away.quarters.reduce((sum, n) => sum + n, 0);
  const homePts = shown.home.quarters.reduce((sum, n) => sum + n, 0);

  return (
    <main className="mp">
      <header className="hero">
        <TeamBanner side={data.away} align="away" />
        <div className="hero-center">
          <img className="nfl-mark" src="/nfl-logo.png" alt="NFL" />
          <div className="hero-switch">
            <button
              type="button"
              className="hero-nav"
              aria-label={prevGame ? `Juego anterior, ${slateLabel(prevGame)}` : "Juego anterior"}
              disabled={!prevGame}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft strokeWidth={2.6} />
            </button>
            <div className="hero-switch-copy">
              <div className="week">SEMANA {data.weekLabel}</div>
              <div className="date">{data.dateLine}</div>
              <div className="time">{data.timeLine}</div>
              <div className="stadium">{data.stadium}</div>
            </div>
            <button
              type="button"
              className="hero-nav"
              aria-label={nextGame ? `Juego siguiente, ${slateLabel(nextGame)}` : "Juego siguiente"}
              disabled={!nextGame}
              onClick={() => setIndex((current) => Math.min(totalGames - 1, current + 1))}
            >
              <ChevronRight strokeWidth={2.6} />
            </button>
          </div>
        </div>
        <TeamBanner side={data.home} align="home" />
      </header>
      <div className="mp-board">
        <section className="cols-3">
          <article className={`card prob-card${pending ? " ai-wait" : ""}`}>
            <h2 className="card-h">Probabilidad de ganar</h2>
            <div className="card-b">
              <div className="prob">
                <div className="prob-side away" style={{ width: `${pick ? shown.winAway : 50}%` }}>
                  <span className="pct">{pick ? `${shown.winAway}%` : failed ? "" : pending ? "…" : `${shown.winAway}%`}</span>
                </div>
                <div className="prob-side home" style={{ width: `${pick ? shown.winHome : 50}%` }}>
                  <span className="pct">{pick ? `${shown.winHome}%` : failed ? "" : pending ? "…" : `${shown.winHome}%`}</span>
                </div>
              </div>
              <div className="prob-names">
                <span style={{ width: `${pick ? shown.winAway : 50}%` }}>{data.away.name}</span>
                <span style={{ width: `${pick ? shown.winHome : 50}%` }}>{data.home.name}</span>
              </div>
              <p className="prob-note">{pick ? "Fuente: IA" : failed ? "La IA no respondió" : pending ? "Consultando la IA" : "Estimación orientativa, sin modelo calibrado"}</p>
            </div>
          </article>

          <article className={`card score-card${pending ? " ai-wait" : ""}`}>
            <h2 className="card-h">Marcador proyectado</h2>
            <div className="card-b">
              <div className="score-row">
                <ScoreMark abbr={data.away.abbr} name={data.away.name} />
                <span className="score-num">{pick ? shown.scoreAway : failed ? "" : pending ? "…" : shown.scoreAway}</span>
                <span className="score-chip">
                  <span className="score-dash">-</span>
                </span>
                <span className="score-num">{pick ? shown.scoreHome : failed ? "" : pending ? "…" : shown.scoreHome}</span>
                <ScoreMark abbr={data.home.abbr} name={data.home.name} />
              </div>
              <p className="score-note">{pick ? shown.marginText : failed ? "La IA no respondió" : pending ? "Consultando la IA" : shown.marginText}</p>
            </div>
          </article>

          <article className={`card total-card${pending ? " ai-wait" : ""}`}>
            <h2 className="card-h">Total de puntos proyectado</h2>
            <div className="card-b">
              <div className="total-body">
                <div className="total-main">
                  <div className="total-num">{pick ? shown.total : failed ? "" : pending ? "…" : shown.total}</div>
                  <div className="total-line">{data.hasLine ? `Línea actual: ${data.line}` : ""}</div>
                </div>
                <span className="total-rule" aria-hidden="true" />
                <div className="ou-wrap">
                  <div className="ou over">
                    <div className="lbl">{data.hasLine ? `Más de ${data.line}` : "Más"}</div>
                    <div className={`pct${data.hasLine && pick ? "" : " missing"}`}>{pick && data.hasLine ? `${shown.overProb}%` : ""}</div>
                  </div>
                  <div className="ou under">
                    <div className="lbl">{data.hasLine ? `Menos de ${data.line}` : "Menos"}</div>
                    <div className={`pct${data.hasLine && pick ? "" : " missing"}`}>{pick && data.hasLine ? `${shown.underProb}%` : ""}</div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="cols-3">
          <ScheduleCard side={data.away} tone="red" />
          <article className="card cmp-card">
            <h2 className="card-h">
              <CompareMark abbr={data.away.abbr} name={data.away.name} />
              <span>Comparativa clave</span>
              <CompareMark abbr={data.home.abbr} name={data.home.name} />
            </h2>
            <CompareTable rows={data.compare} />
          </article>
          <ScheduleCard side={data.home} tone="navy" />
        </section>

        <section className="cols-4">
          <RankCard title={`Ofensiva ${titleCase(data.away.name)}`} tone="red" stats={data.away.offense} />
          <RankCard title={`Defensiva ${titleCase(data.away.name)}`} tone="red" stats={data.away.defense} />
          <RankCard title={`Ofensiva ${titleCase(data.home.name)}`} tone="navy" stats={data.home.offense} />
          <RankCard title={`Defensiva ${titleCase(data.home.name)}`} tone="navy" stats={data.home.defense} />
        </section>

        <section className="cols-3">
          <InjuryCard side={data.away} tone="red" />
          <InjuryCard side={data.home} tone="navy" />
          <article className="card factor-card">
            <h2 className="card-h">Factores adicionales</h2>
            <FactorList factors={data.factors} home={data.home} />
          </article>
        </section>

        <section className="cols-3">
          <article className="card trend-card">
            <h2 className="card-h">
              Tendencia reciente <span className="h-note">(Últimos 3 partidos)</span>
            </h2>
            <div className="trend">
              <TrendCol side={data.away} />
              <TrendCol side={data.home} />
            </div>
          </article>

          <article className="card q-card">
            <h2 className="card-h">Proyección de puntos por cuarto</h2>
            <table className="qtable">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>1Q</th>
                  <th>2Q</th>
                  <th>3Q</th>
                  <th>4Q</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <QuarterRow side={shown.away} total={awayPts} tone="away" />
                <QuarterRow side={shown.home} total={homePts} tone="home" />
              </tbody>
            </table>
          </article>

          <article className="card m-card">
            <h2 className="card-h">Probabilidades principales</h2>
            <table className="mtable">
              <thead>
                <tr>
                  <th>Mercado</th>
                  <th>Línea actual</th>
                  <th>Probabilidad</th>
                  <th>Valor estimado</th>
                </tr>
              </thead>
              <tbody>
                {(pick ? shown.markets : data.markets).map((row) => (
                  <tr key={row.market}>
                    <td>{row.market}</td>
                    <td>{blank(row.line)}</td>
                    <td className={row.probTone ? `tone-${row.probTone}` : undefined}>{blank(row.prob)}</td>
                    <td className={row.valueTone ? `tone-${row.valueTone}` : undefined}>{blank(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>

        <footer className="footer">
          <TeamLogo abbr={data.away.abbr} name={data.away.name} className="footer-logo away" />
          <div className="footer-copy">
            <h2>Conclusión</h2>
            <p>{pick ? shown.conclusion : failed ? "La IA no respondió para este partido." : pending ? "Consultando la IA para la probabilidad, el marcador y el total." : data.conclusion}</p>
          </div>
          <div className="footer-notes">
            <div>
              Marcador proyectado:{" "}
              <b>
                {pick
                  ? `${titleCase(shown.home.name)} ${shown.scoreHome} - ${titleCase(shown.away.name)} ${shown.scoreAway}`
                  : pending
                    ? "Consultando la IA"
                    : `${titleCase(data.home.name)} ${data.scoreHome} - ${titleCase(data.away.name)} ${data.scoreAway}`}
              </b>{" "}
              | Total esperado: <b>{pick ? `${shown.total} puntos` : pending ? "…" : `${data.total} puntos`}</b>
            </div>
            <div>
              Probabilidad de victoria:{" "}
              <b>
                {pick
                  ? `${titleCase(shown.home.name)} ${shown.winHome}%`
                  : pending
                    ? "…"
                    : `${titleCase(data.home.name)} ${data.winHome}%`}
              </b>{" "}
              |{" "}
              <b>
                {pick
                  ? `${titleCase(shown.away.name)} ${shown.winAway}%`
                  : pending
                    ? "…"
                    : `${titleCase(data.away.name)} ${data.winAway}%`}
              </b>
            </div>
            <div>
              Confianza del pronóstico: <b>{data.confidence}</b>
            </div>
            <div>El resultado puede cambiar con el reporte definitivo de inactivos.</div>
          </div>
          <FooterMark abbr={data.home.abbr} name={data.home.name} />
        </footer>
      </div>
    </main>
  );
}

function titleCase(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function slateLabel(item: SlateGame) {
  return `${titleCase(teamNickname(item.game.away.abbr))} vs ${titleCase(teamNickname(item.game.home.abbr))}`;
}

function FooterMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr.toUpperCase() === "CHI") {
    return <img className="footer-logo home bears" src="/bears-c.svg" alt={name} />;
  }
  return <TeamLogo abbr={abbr} name={name} className="footer-logo home" />;
}

function ScoreMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr.toUpperCase() === "CHI") {
    return <img className="score-logo bears" src="/bears-c.svg" alt={name} />;
  }
  return <TeamLogo abbr={abbr} name={name} className="score-logo" />;
}

function HeaderMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr.toUpperCase() === "CHI") {
    return <img className="hero-logo bears-c" src="/bears-c.svg" alt={name} />;
  }
  return <TeamLogo abbr={abbr} name={name} className="hero-logo" />;
}

function TeamBanner({ side, align }: { side: TeamSide; align: "away" | "home" }) {
  const logo = <HeaderMark abbr={side.abbr} name={side.name} />;
  return (
    <div className={`hero-edge ${align}`}>
      {align === "away" ? logo : null}
      <div className="hero-copy">
        <div className="city">{side.city}</div>
        <div className="nick">{side.name}</div>
        <div className="rec">{side.record}</div>
      </div>
      {align === "home" ? logo : null}
    </div>
  );
}

const MISSING = "No encontrado";

function blank(value: string) {
  return value === MISSING ? "" : value;
}

function splitStat(value: string) {
  const match = value.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  if (!match) return { main: value, pct: "" };
  return { main: match[1], pct: match[2] };
}

function ScheduleCard({ side, tone }: { side: TeamSide; tone: "red" | "navy" }) {
  const rivals = splitStat(side.rivalsRecord);
  const beaten = splitStat(side.beatenRecord);
  return (
    <article className="card sched-card">
      <h2 className={`card-h ${tone}`}>Récord y calendario (5 partidos)</h2>
      <div className="rec-banner">
        <div className="big">{side.record}</div>
        <div className="sub">{side.split}</div>
      </div>
      <table className="sched">
        <thead>
          <tr>
            <th>Semana</th>
            <th>Rival</th>
            <th>Resultado</th>
            <th>Récord rival</th>
          </tr>
        </thead>
        <tbody>
          {side.schedule.length ? (
            side.schedule.map((row) => <ScheduleLine key={`${side.abbr}-${row.week}-${row.oppAbbr}`} row={row} />)
          ) : null}
        </tbody>
      </table>
      <div className="rec-foot">
        {rivals.main !== MISSING && (
          <div className="rec-foot-row">
            <span>Récord combinado de rivales</span>
            <span className="rec-foot-stat">
              <b>{rivals.main}</b>
              <span className="pct">{rivals.pct}</span>
            </span>
          </div>
        )}
        {beaten.main !== MISSING && (
          <div className="rec-foot-row">
            <span>Récord de equipos que derrotó</span>
            <span className="rec-foot-stat">
              <b>{beaten.main}</b>
              <span className="pct">{beaten.pct}</span>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function ScheduleLine({ row }: { row: ScheduleRow }) {
  return (
    <tr>
      <td className="wk">{row.week}</td>
      <td>
        <span className="opp">
          <TeamLogo abbr={row.oppAbbr} name={row.opp} />
          <span className="where">{row.away ? "@" : "vs"}</span>
          <span className="opp-name">{row.opp}</span>
        </span>
      </td>
      <td className="res">
        <span className={`mark res-${row.result}`}>{row.result}</span>
        <span className="score">{row.score}</span>
      </td>
      <td className="opp-rec">{row.oppRecord}</td>
    </tr>
  );
}

function CompareMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr.toUpperCase() === "CHI") {
    return <img className="cmp-logo bears" src="/bears-c.svg" alt={name} />;
  }
  return <TeamLogo abbr={abbr} name={name} className="cmp-logo" />;
}

function CompareTable({ rows }: { rows: CompareRow[] }) {
  return (
    <div className="cmp">
      {rows
        .filter((row) => row.away != null || row.home != null)
        .map((row) => {
        const known = [row.away, row.home].filter((value): value is number => value != null);
        const max = Math.max(...known, 1);
        const width = (value: number | null) => (value == null ? 0 : `${(value / max) * 100}%`);
        return (
          <div className="cmp-row" key={row.label}>
            <span className={`cmp-val away${row.away == null ? " missing" : ""}`}>{row.away == null ? "" : formatCompare(row.away, row)}</span>
            <span className="cmp-bar-slot away">
              {row.away != null && <i style={{ width: width(row.away) }} />}
            </span>
            <span className="cmp-label">{row.label}</span>
            <span className="cmp-bar-slot home">
              {row.home != null && <i style={{ width: width(row.home) }} />}
            </span>
            <span className={`cmp-val home${row.home == null ? " missing" : ""}`}>{row.home == null ? "" : formatCompare(row.home, row)}</span>
          </div>
        );
      })}
    </div>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <div className="rank-badge missing" aria-label="No encontrado" />;
  }
  const good = rank <= 16;
  const fill = Math.min(0.96, Math.max(0.14, (33 - rank) / 32));
  const radius = 14;
  const circ = 2 * Math.PI * radius;
  return (
    <div className={`rank-badge ${good ? "good" : "bad"}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="track" cx="18" cy="18" r={radius} />
        <circle
          className="arc"
          cx="18"
          cy="18"
          r={radius}
          strokeDasharray={`${circ * fill} ${circ}`}
        />
      </svg>
      <span className="rank-num">
        {rank}
        <sup>°</sup>
      </span>
    </div>
  );
}

function RankCard({ title, tone, stats }: { title: string; tone: "red" | "navy"; stats: TeamSide["offense"] }) {
  const visible = stats.filter((stat) => stat.value !== MISSING);
  const place = stats.find((stat) => stat.label === "Puntos")?.rank ?? null;
  return (
    <article className="card rank-card">
      <h2 className={`card-h ${tone}`}>
        {title}
        {place != null && <span className="h-note">{place}°</span>}
      </h2>
      <div className={`rank-grid n-${visible.length}`}>
        {visible.map((stat) => (
          <div key={stat.label}>
            <div className="lbl">
              {stat.label}
              {stat.rank != null && <span className="lbl-rank">{stat.rank}°</span>}
            </div>
            {stat.rank != null && <RankBadge rank={stat.rank} />}
            <div className="rank-value">{stat.value}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

function InjuryMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr === "CHI") return <img className="inj-logo bears" src="/bears-c.svg" alt={name} />;
  return <TeamLogo abbr={abbr} name={name} className="inj-logo" />;
}

function InjuryCard({ side, tone }: { side: TeamSide; tone: "red" | "navy" }) {
  return (
    <article className="card inj-card">
      <h2 className={`card-h ${tone}`}>
        <InjuryMark abbr={side.abbr} name={side.name} />
        <span>Lesionados clave - {titleCase(side.name)}</span>
      </h2>
      <table className="inj">
        <thead>
          <tr>
            <th>Jugador</th>
            <th>Pos</th>
            <th>Estatus</th>
            <th>Impacto</th>
          </tr>
        </thead>
        <tbody>
          {side.injuries.length ? (
            side.injuries.map((player) => <InjuryLine key={player.name} player={player} />)
          ) : null}
        </tbody>
      </table>
    </article>
  );
}

function InjuryLine({ player }: { player: Injury }) {
  const rated = player.impact === "Alto" || player.impact === "Medio" || player.impact === "Bajo";
  const tone = rated ? player.impact : player.impact === "No encontrado" ? "missing" : "note";
  return (
    <tr>
      <td className="player">
        <span className="dot" />
        {player.name}
      </td>
      <td className="pos">{player.pos}</td>
      <td className={`st-${player.status}`}>{player.status}</td>
      <td>
        {player.impact !== MISSING && (
          <span className={`impact ${tone}`} title={player.impact}>
            {rated && <Star size={12} fill="currentColor" stroke="currentColor" />}
            {player.impact}
          </span>
        )}
      </td>
    </tr>
  );
}

function FactorMark({ icon, abbr, name }: { icon: Factor["icon"]; abbr: string; name: string }) {
  if (icon === "pin") {
    if (abbr.toUpperCase() === "CHI") return <img className="factor-mark bears" src="/bears-c.svg" alt="" />;
    return <TeamLogo abbr={abbr} name={name} className="factor-mark" />;
  }
  if (icon === "weather") return <Sun className="factor-sun" size={16} strokeWidth={2.6} />;
  return <span className="factor-mark" />;
}

function FactorList({ factors, home }: { factors: Factor[]; home: TeamSide }) {
  return (
    <div className="factors">
      {factors
        .filter((factor) => (factor.bullets ? factor.bullets.some((item) => item !== MISSING) : factor.value !== MISSING))
        .map((factor) => {
        const Icon = FACTOR_ICONS[factor.icon];
        const bullets = factor.bullets?.filter((item) => item !== MISSING);
        return (
          <div className="factor" key={factor.label}>
            <span className="factor-ico">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <b>{factor.label}</b>
            <FactorMark icon={factor.icon} abbr={home.abbr} name={home.name} />
            {bullets ? (
              <ul>
                {bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <span className="factor-val">{factor.value}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrendMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr === "CHI") return <img className="trend-logo bears" src="/bears-c.svg" alt={name} />;
  return <TeamLogo abbr={abbr} name={name} className="trend-logo" />;
}

function TrendCol({ side }: { side: TeamSide }) {
  const record = side.trendRecord.replace("-", " - ");
  return (
    <div className="trend-col">
      <div className="trend-body">
        <TrendMark abbr={side.abbr} name={side.name} />
        <div className="trend-copy">
          {side.trendRecord !== MISSING && <div className="trend-rec">{record}</div>}
          <div className="trend-meta">
            {side.trendScored !== MISSING && (
              <>
                Promedio anotado: {side.trendScored}
                <br />
              </>
            )}
            {side.trendAllowed !== MISSING && <>Promedio permitido: {side.trendAllowed}</>}
          </div>
          <div className="pills">
            {side.form.map((mark, index) => (
              <span className={`pill ${mark}`} key={`${side.abbr}-${index}`}>
                {mark}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuarterMark({ abbr, name }: { abbr: string; name: string }) {
  if (abbr === "CHI") return <img className="q-logo bears" src="/bears-c.svg" alt={name} />;
  return <TeamLogo abbr={abbr} name={name} className="q-logo" />;
}

function QuarterRow({ side, total }: { side: TeamSide; total: number; tone: "away" | "home" }) {
  return (
    <tr>
      <td>
        <QuarterMark abbr={side.abbr} name={side.name} />
      </td>
      {side.quarters.map((points, index) => (
        <td key={index}>{points}</td>
      ))}
      <td className="total">{total}</td>
    </tr>
  );
}
