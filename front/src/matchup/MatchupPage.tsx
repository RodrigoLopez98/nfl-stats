import { useEffect, useState } from "react";
import { CalendarDays, CloudSun, Gauge, MapPin, Power, Star, Sun } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import {
  formatCompare,
  IMAGE_MATCHUP,
  loadMatchup,
  type CompareRow,
  type Factor,
  type Injury,
  type MatchupData,
  type ScheduleRow,
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

  useEffect(() => {
    let cancel = false;
    loadMatchup().then((next) => {
      if (!cancel) setData(next);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const awayPts = data.away.quarters.reduce((sum, n) => sum + n, 0);
  const homePts = data.home.quarters.reduce((sum, n) => sum + n, 0);

  return (
    <main className="mp">
      <header className="hero">
        <TeamBanner side={data.away} align="away" />
        <div className="hero-center">
          <img className="nfl-mark" src="/nfl-logo.png" alt="NFL" />
          <div className="week">SEMANA {data.weekLabel}</div>
          <div className="date">{data.dateLine}</div>
          <div className="time">{data.timeLine}</div>
          <div className="stadium">{data.stadium}</div>
        </div>
        <TeamBanner side={data.home} align="home" />
      </header>
      <div className="mp-board">
        <section className="cols-3">
          <article className="card prob-card">
            <h2 className="card-h">Probabilidad de ganar</h2>
            <div className="card-b">
              <div className="prob">
                <div className="prob-side away" style={{ width: `${data.winAway}%` }}>
                  <span className="pct">{data.winAway}%</span>
                </div>
                <div className="prob-side home" style={{ width: `${data.winHome}%` }}>
                  <span className="pct">{data.winHome}%</span>
                </div>
              </div>
              <div className="prob-names">
                <span style={{ width: `${data.winAway}%` }}>{data.away.name}</span>
                <span style={{ width: `${data.winHome}%` }}>{data.home.name}</span>
              </div>
              <p className="prob-note">Probabilidad estimada</p>
            </div>
          </article>

          <article className="card score-card">
            <h2 className="card-h">Marcador proyectado</h2>
            <div className="card-b">
              <div className="score-row">
                <ScoreMark abbr={data.away.abbr} name={data.away.name} />
                <span className="score-num">{data.scoreAway}</span>
                <span className="score-chip">
                  <span className="score-dash">-</span>
                </span>
                <span className="score-num">{data.scoreHome}</span>
                <ScoreMark abbr={data.home.abbr} name={data.home.name} />
              </div>
              <p className="score-note">{data.marginText}</p>
            </div>
          </article>

          <article className="card total-card">
            <h2 className="card-h">Total de puntos proyectado</h2>
            <div className="card-b">
              <div className="total-body">
                <div className="total-main">
                  <div className="total-num">{data.total}</div>
                  <div className="total-line">Línea actual: {data.line}</div>
                </div>
                <span className="total-rule" aria-hidden="true" />
                <div className="ou-wrap">
                  <div className="ou over">
                    <div className="lbl">Más de {data.line}</div>
                    <div className="pct">{data.overProb}%</div>
                  </div>
                  <div className="ou under">
                    <div className="lbl">Menos de {data.line}</div>
                    <div className="pct">{data.underProb}%</div>
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
            <FactorList factors={data.factors} />
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
                <QuarterRow side={data.away} total={awayPts} tone="away" />
                <QuarterRow side={data.home} total={homePts} tone="home" />
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
                {data.markets.map((row) => (
                  <tr key={row.market}>
                    <td>{row.market}</td>
                    <td>{row.line}</td>
                    <td className={row.probTone ? `tone-${row.probTone}` : undefined}>{row.prob}</td>
                    <td className={row.valueTone ? `tone-${row.valueTone}` : undefined}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>

        <footer className="footer">
          <TeamLogo abbr={data.away.abbr} name={data.away.name} className="footer-logo" />
          <div className="footer-copy">
            <h2>Conclusión</h2>
            <p>{data.conclusion}</p>
          </div>
          <div className="footer-notes">
            <div>
              Marcador proyectado: <b>Bears {data.scoreHome} - Falcons {data.scoreAway}</b> | Total esperado:{" "}
              <b>{data.total} puntos</b>
            </div>
            <div>
              Probabilidad de victoria: <b>Bears {data.winHome}%</b> | <b>Falcons {data.winAway}%</b>
            </div>
            <div>
              Confianza del pronóstico: <b>6 / 10 (moderada)</b>
            </div>
            <div>El resultado puede cambiar con el reporte definitivo de inactivos.</div>
          </div>
          <img className="footer-logo bears" src="/bears-c.svg" alt={data.home.name} />
        </footer>
      </div>
    </main>
  );
}

function titleCase(name: string) {
  return name.charAt(0) + name.slice(1).toLowerCase();
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
          {side.schedule.map((row) => (
            <ScheduleLine key={`${side.abbr}-${row.week}`} row={row} />
          ))}
        </tbody>
      </table>
      <div className="rec-foot">
        <div className="rec-foot-row">
          <span>Récord combinado de rivales</span>
          <span className="rec-foot-stat">
            <b>{rivals.main}</b>
            <span className="pct">{rivals.pct}</span>
          </span>
        </div>
        <div className="rec-foot-row">
          <span>Récord de equipos que derrotó</span>
          <span className="rec-foot-stat">
            <b>{beaten.main}</b>
            <span className="pct">{beaten.pct}</span>
          </span>
        </div>
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
      {rows.map((row) => {
        const max = Math.max(row.away, row.home) || 1;
        return (
          <div className="cmp-row" key={row.label}>
            <span className="cmp-val away">{formatCompare(row.away, row)}</span>
            <span className="cmp-bar-slot away">
              <i style={{ width: `${(row.away / max) * 100}%` }} />
            </span>
            <span className="cmp-label">{row.label}</span>
            <span className="cmp-bar-slot home">
              <i style={{ width: `${(row.home / max) * 100}%` }} />
            </span>
            <span className="cmp-val home">{formatCompare(row.home, row)}</span>
          </div>
        );
      })}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
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
  return (
    <article className="card rank-card">
      <h2 className={`card-h ${tone}`}>
        {title} <span className="h-note">(Ranking NFL)</span>
      </h2>
      <div className="rank-grid">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="lbl">{stat.label}</div>
            <RankBadge rank={stat.rank} />
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
          {side.injuries.map((player) => (
            <InjuryLine key={player.name} player={player} />
          ))}
        </tbody>
      </table>
    </article>
  );
}

function InjuryLine({ player }: { player: Injury }) {
  return (
    <tr>
      <td className="player">
        <span className="dot" />
        {player.name}
      </td>
      <td className="pos">{player.pos}</td>
      <td className={`st-${player.status}`}>{player.status}</td>
      <td>
        <span className={`impact ${player.impact}`}>
          <Star size={12} fill="currentColor" stroke="currentColor" />
          {player.impact}
        </span>
      </td>
    </tr>
  );
}

function FactorMark({ icon }: { icon: Factor["icon"] }) {
  if (icon === "pin") return <img className="factor-mark bears" src="/bears-c.svg" alt="" />;
  if (icon === "weather") return <Sun className="factor-sun" size={16} strokeWidth={2.6} />;
  return <span className="factor-mark" />;
}

function FactorList({ factors }: { factors: Factor[] }) {
  return (
    <div className="factors">
      {factors.map((factor) => {
        const Icon = FACTOR_ICONS[factor.icon];
        return (
          <div className="factor" key={factor.label}>
            <span className="factor-ico">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <b>{factor.label}</b>
            <FactorMark icon={factor.icon} />
            {factor.bullets ? (
              <ul>
                {factor.bullets.map((item) => (
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
          <div className="trend-rec">{record}</div>
          <div className="trend-meta">
            Promedio anotado: {side.trendScored}
            <br />
            Promedio permitido: {side.trendAllowed}
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
