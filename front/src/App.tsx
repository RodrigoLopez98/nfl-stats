import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell, WeekToolbar, type AppTab } from "@/components/app-shell";
import { TeamLogo } from "@/components/team-logo";
import { TeamRankings } from "@/components/team-rankings";
import { NflScoresHub } from "@/components/nfl-scores-hub";
import { formatDateTimeMonterrey, currentNflSeason } from "@/lib/datetime";
import { teamNickname } from "@/lib/team-meta";
import { api, type BankrollLine, type Board, type GameCard, type Rankings, type Side, type Status } from "./api";

const emptyForm = {
  group_key: "parlay",
  label: "Apuesta",
  odds: "2.8",
  stake: "2000",
  note: "",
};

export default function App() {
  const season = currentNflSeason();
  const [week, setWeek] = useState(1);
  const [status, setStatus] = useState<Status | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [bank, setBank] = useState<BankrollLine[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [tab, setTab] = useState<AppTab>("scores");

  async function load(nextSeason = season, nextWeek = week, useLatestWeek = false) {
    const info = await api.status(nextSeason);
    setStatus(info);
    const activeWeek =
      !useLatestWeek && info.weeks.includes(nextWeek) ? nextWeek : info.suggested_week || info.weeks[0] || 1;
    setWeek(activeWeek);
    const [slate, ranks, lines] = await Promise.all([
      api.board(nextSeason, activeWeek),
      api.rankings(nextSeason, activeWeek),
      api.bankroll(),
    ]);
    setBoard(slate);
    setRankings(ranks);
    setBank(lines);
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setBusy("Actualizando el corte…");
      setError("");
      try {
        await api.sync(season);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : "Falló la sincronización");
      }
      if (cancel) return;
      try {
        await load(season, week, true);
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : "No se pudo cargar el corte");
      } finally {
        if (!cancel) setBusy("");
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function changeWeek(value: number) {
    if (!Number.isFinite(value) || value === week) return;
    setWeek(value);
    setError("");
    const [slate, ranks] = await Promise.all([api.board(season, value), api.rankings(season, value)]);
    setBoard(slate);
    setRankings(ranks);
  }

  async function sync() {
    setBusy("Sincronizando nfldata.org…");
    setError("");
    try {
      await api.sync(season);
      await load(season, week);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falló la sincronización");
    } finally {
      setBusy("");
    }
  }

  const weeks = status?.weeks.length ? status.weeks : [week];
  const syncMeta = status?.last_sync
    ? `${formatDateTimeMonterrey(status.last_sync)} · ${status.games} partidos`
    : undefined;

  return (
    <AppShell tab={tab} onTabChange={setTab} onSync={sync} busy={!!busy}>
      {error && (
        <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-white">
          {error}
        </div>
      )}
      {tab === "scores" && (
        <NflScoresHub board={board} rankings={rankings} week={week} weeks={weeks} onWeekChange={changeWeek} />
      )}
      {tab === "tablero" && (
        <>
          <WeekToolbar season={season} week={week} weeks={weeks} onWeekChange={changeWeek} meta={syncMeta} />
          <div className="grid gap-3">
            {busy && !board ? (
              <p className="rounded-xl bg-[#242731] px-4 py-3 text-sm text-white/70">Actualizando nfldata…</p>
            ) : board?.games.length ? (
              board.games.map((game) => (
                <GameEditor
                  key={game.game_id}
                  game={game}
                  open={openGameId === game.game_id}
                  onToggle={() => setOpenGameId((current) => (current === game.game_id ? null : game.game_id))}
                  onSaved={() => load(season, week).catch((err: Error) => setError(err.message))}
                />
              ))
            ) : (
              <p className="rounded-xl bg-[#242731] px-4 py-3 text-sm text-white/70">
                No hay cartelera para esta semana. Pulsa sincronizar arriba a la derecha.
              </p>
            )}
          </div>
        </>
      )}
      {tab === "teams" && <TeamRankings rankings={rankings} season={season} />}
      {tab === "bankroll" && (
        <Bankroll lines={bank} form={form} setForm={setForm} onChange={setBank} onError={setError} />
      )}
    </AppShell>
  );
}

function MatchupTeam({ side, align = "start" }: { side: Side; align?: "start" | "end" }) {
  const end = align === "end";
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${end ? "flex-row-reverse text-right" : ""}`}>
      <TeamLogo abbr={side.abbr} name={side.name} className="size-11 sm:size-14" />
      <div className="min-w-0">
        <p className="font-industry truncate text-sm font-black italic tracking-wide text-white uppercase sm:text-lg">
          {teamNickname(side.abbr)}
        </p>
        <p className="text-xs text-white/55">
          {record(side)}
          <span className="hidden sm:inline"> · {side.ppg ?? "—"} pts</span>
        </p>
      </div>
    </div>
  );
}

function TeamMark({ abbr, name, align = "start" }: { abbr: string; name: string; align?: "start" | "end" }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold text-white ${align === "end" ? "flex-row-reverse" : ""}`}>
      <TeamLogo abbr={abbr} name={name} className="size-7" />
      {abbr}
    </span>
  );
}

function record(side: GameCard["away"]) {
  return side.ties ? `${side.wins}-${side.losses}-${side.ties}` : `${side.wins}-${side.losses}`;
}

function pct(value: number | null) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function GameEditor({
  game,
  open,
  onToggle,
  onSaved,
}: {
  game: GameCard;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState({
    spread: game.spread ?? "",
    total: game.book_total ?? "",
    odds_moneyline: game.odds_moneyline ?? "",
    odds_total: game.odds_total ?? "",
    pick_ari: game.pick_ari ?? "",
    pick_cabo: game.pick_cabo ?? "",
    pick_spread: game.pick_spread ?? "",
    pick_sportsline: game.pick_sportsline ?? "",
    pick_castle: game.pick_castle ?? "",
    pick_alfredo: game.pick_alfredo ?? "",
    injuries: game.injuries ?? "",
    confirmed: game.confirmed,
  });
  const [saving, setSaving] = useState(false);

  function num(value: string | number) {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveSlate(game.game_id, {
        spread: num(draft.spread),
        total: num(draft.total),
        odds_moneyline: num(draft.odds_moneyline),
        odds_total: num(draft.odds_total),
        pick_ari: draft.pick_ari || null,
        pick_cabo: draft.pick_cabo || null,
        pick_spread: draft.pick_spread || null,
        pick_sportsline: draft.pick_sportsline || null,
        pick_castle: draft.pick_castle || null,
        pick_alfredo: draft.pick_alfredo || null,
        injuries: draft.injuries || null,
        confirmed: draft.confirmed,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof draft; label: string; step?: string }[] = [
    { key: "spread", label: "Spread local", step: "0.5" },
    { key: "total", label: "Total", step: "0.5" },
    { key: "odds_moneyline", label: "Momio", step: "0.01" },
    { key: "odds_total", label: "Momio puntos", step: "0.01" },
    { key: "pick_ari", label: "Ari Alvarez" },
    { key: "pick_cabo", label: "Cabo Wabo" },
    { key: "pick_spread", label: "Spread pick" },
    { key: "pick_sportsline", label: "Sports Line" },
    { key: "pick_castle", label: "Castle" },
    { key: "pick_alfredo", label: "Alfredo" },
  ];

  return (
    <Card className="gap-0 overflow-hidden border border-white/10 bg-[#242731] py-0 text-white ring-0">
      <button
        type="button"
        className="block w-full text-left text-white"
        aria-expanded={open}
        onClick={onToggle}
      >
        <CardHeader className="flex flex-row items-center gap-3 rounded-none bg-transparent text-white">
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <MatchupTeam side={game.away} />
              <span className="text-sm font-semibold tracking-widest text-white/45">@</span>
              <MatchupTeam side={game.home} align="end" />
            </div>
            <CardDescription className="text-white/50">
              {game.gameday || "Fecha por confirmar"}
              {game.confirmed ? " · confirmado" : ""}
            </CardDescription>
          </div>
          <ChevronDown className={`size-5 shrink-0 text-white/70 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} />
        </CardHeader>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
      <CardContent className="grid gap-4 border-t border-white/10 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs tracking-wide text-white/50 uppercase">Más ganados</p>
            <p className="text-xl font-semibold text-white">{game.winner_record}</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-white/50 uppercase">
              Rankings {game.rank_away}-{game.rank_home}
            </p>
            <p className="text-xl font-semibold text-white">{game.winner_ranks}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0b0e14] px-3 py-2.5">
          <TeamMark abbr={game.away.abbr} name={game.away.name} />
          <Badge className={game.total_pick === "OVER" ? "bg-destructive text-white" : "bg-white/10 text-white"}>
            {game.total_pick || "SIN LÍNEA"}
          </Badge>
          <TeamMark abbr={game.home.abbr} name={game.home.name} align="end" />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Proyección" value={game.projected_total ?? "—"} />
          <Stat label="Línea" value={game.book_total ?? "—"} />
          <Stat label="Diferencia" value={game.edge ?? "—"} />
          <Stat label="Over histórico" value={`${pct(game.away.over_pct)} / ${pct(game.home.over_pct)}`} />
        </div>
        {game.actual_total != null && (
          <p className="text-sm text-destructive">
            Marcador {game.away_score}-{game.home_score}. Total real {game.actual_total} · {game.actual_pick}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {fields.map((field) => (
            <div key={field.key} className="grid gap-1.5">
              <Label htmlFor={`${game.game_id}-${field.key}`} className="text-white/70">
                {field.label}
              </Label>
              <Input
                id={`${game.game_id}-${field.key}`}
                className="border-white/15 bg-[#0b0e14] text-white"
                type={field.step ? "number" : "text"}
                step={field.step}
                value={draft[field.key] as string | number}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              />
            </div>
          ))}
          <div className="col-span-full grid gap-1.5">
            <Label htmlFor={`${game.game_id}-injuries`} className="text-white/70">
              Lesionados
            </Label>
            <Input
              id={`${game.game_id}-injuries`}
              className="border-white/15 bg-[#0b0e14] text-white"
              value={draft.injuries}
              onChange={(event) => setDraft({ ...draft, injuries: event.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <Checkbox
            checked={draft.confirmed}
            onCheckedChange={(checked) => setDraft({ ...draft, confirmed: checked === true })}
          />
          Confirmar cartelera
        </label>
        <Button className="bg-destructive text-white hover:bg-destructive/90" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        <Accordion type="single" collapsible>
          <AccordionItem value="cats">
            <AccordionTrigger>Nueve categorías (1 es el mejor)</AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>
                      <TeamMark abbr={game.away.abbr} name={game.away.name} />
                    </TableHead>
                    <TableHead>
                      <TeamMark abbr={game.home.abbr} name={game.home.name} />
                    </TableHead>
                    <TableHead>Mejor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {game.categories.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className={row.winner === game.away.name ? "font-semibold text-destructive" : ""}>
                        {row.away_rank ?? "—"}
                      </TableCell>
                      <TableCell className={row.winner === game.home.name ? "font-semibold text-destructive" : ""}>
                        {row.home_rank ?? "—"}
                      </TableCell>
                      <TableCell>{row.winner || "Empate"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b0e14] px-3 py-2">
      <p className="text-xs tracking-wide text-white/50 uppercase">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Bankroll({
  lines,
  form,
  setForm,
  onChange,
  onError,
}: {
  lines: BankrollLine[];
  form: typeof emptyForm;
  setForm: (value: typeof emptyForm) => void;
  onChange: (lines: BankrollLine[]) => void;
  onError: (message: string) => void;
}) {
  async function add() {
    try {
      const next = await api.addBankroll({
        group_key: form.group_key,
        label: form.label,
        odds: Number(form.odds),
        stake: form.stake === "" ? null : Number(form.stake),
        note: form.note || null,
        sort_order: lines.filter((line) => line.group_key === form.group_key).length,
      });
      onChange(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se guardó la apuesta");
    }
  }

  return (
    <div className="grid gap-3">
      <Card className="border border-white/10 bg-[#242731] ring-0">
        <CardContent className="pt-4">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="group" className="text-white/70">
                  Grupo
                </Label>
                <Input
                  id="group"
                  className="border-white/15 bg-[#0b0e14] text-white"
                  value={form.group_key}
                  onChange={(event) => setForm({ ...form, group_key: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="odds" className="text-white/70">
                  Momio
                </Label>
                <Input
                  id="odds"
                  className="border-white/15 bg-[#0b0e14] text-white"
                  value={form.odds}
                  onChange={(event) => setForm({ ...form, odds: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="stake" className="text-white/70">
                  Stake
                </Label>
                <Input
                  id="stake"
                  className="border-white/15 bg-[#0b0e14] text-white"
                  placeholder="vacío = reinvierte"
                  value={form.stake}
                  onChange={(event) => setForm({ ...form, stake: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note" className="text-white/70">
                  Nota
                </Label>
                <Input
                  id="note"
                  className="border-white/15 bg-[#0b0e14] text-white"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="bg-destructive text-white hover:bg-destructive/90">
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>
      {lines.map((line) => (
        <Card key={line.id} className="border border-white/10 bg-[#242731] ring-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4 text-white">
            <div>
              <p className="font-semibold">{line.label || line.group_key}</p>
              <p className="text-sm text-white/55">{line.note}</p>
            </div>
            <p>x{line.odds}</p>
            <p>Stake {line.stake_used ?? "—"}</p>
            <p>Pago {line.payout ?? "—"}</p>
            <Button
              variant="outline"
              className="border-white/20 text-destructive hover:bg-white/5"
              onClick={() => api.deleteBankroll(line.id).then(onChange)}
            >
              Quitar
            </Button>
          </CardContent>
        </Card>
      ))}
      {!lines.length && (
        <p className="text-sm text-white/55">
          El stake vacío reinvierte el pago anterior del mismo grupo, como las tres piernas del Excel.
        </p>
      )}
    </div>
  );
}
