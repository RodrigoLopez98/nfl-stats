import { useEffect, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamLogo } from "@/components/team-logo";
import { TeamRankings } from "@/components/team-rankings";
import { NflScoresHub } from "@/components/nfl-scores-hub";
import { formatDateTimeMonterrey, currentNflSeason } from "@/lib/datetime";
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

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b-2 border-primary bg-white text-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/nfl-logo.png" alt="" className="h-16 w-auto shrink-0" />
            <div>
              <h1 className="text-4xl font-semibold tracking-wide text-primary">
                NFL <span className="text-destructive">STATS</span>
              </h1>
              <p className="text-sm text-muted-foreground">Cartelera, proyección y bankroll. El teléfono solo llama a esta API.</p>
            </div>
          </div>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={sync}
            disabled={!!busy}
          >
            <RefreshCw className={busy ? "animate-spin" : ""} />
            {busy ? "Sincronizando" : "Sincronizar"}
          </Button>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-3 px-4 pb-4">
          <p className="pb-2 text-sm font-semibold tracking-wide text-primary">Temporada {season}</p>
          <div className="grid gap-1">
            <Label className="text-xs tracking-wide text-primary uppercase">Semana</Label>
            <Select value={String(week)} onValueChange={(value) => changeWeek(Number(value))}>
              <SelectTrigger className="w-40 border-primary/40 bg-white text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    Semana {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="pb-2 text-sm text-muted-foreground">
            {status?.last_sync ? `Último sync: ${formatDateTimeMonterrey(status.last_sync)}` : "Sin sincronizar"}
            {" · "}
            {status?.games ?? 0} partidos · {status?.teams ?? 0} equipos
          </p>
        </div>
        <div className="h-1 bg-destructive" />
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        {error && <div className="shrink-0 rounded-lg border-2 border-primary border-l-4 border-l-destructive bg-white px-4 py-3 text-sm">{error}</div>}
        <Tabs defaultValue="scores" className="min-h-0 flex-1">
          <TabsList variant="line" className="shrink-0 h-9 border-b border-primary/25 bg-transparent">
            <TabsTrigger value="scores" className="data-active:text-primary after:bg-destructive">Scores</TabsTrigger>
            <TabsTrigger value="tablero" className="data-active:text-primary after:bg-destructive">Tablero</TabsTrigger>
            <TabsTrigger value="rankings" className="data-active:text-primary after:bg-destructive">Rankings</TabsTrigger>
            <TabsTrigger value="bankroll" className="data-active:text-primary after:bg-destructive">Bankroll</TabsTrigger>
          </TabsList>
          <TabsContent value="scores" className="min-h-0 overflow-y-auto">
            <NflScoresHub board={board} rankings={rankings} week={week} weeks={weeks} onWeekChange={changeWeek} />
          </TabsContent>
          <TabsContent value="tablero" className="min-h-0 overflow-y-auto">
            <div className="grid gap-3">
            {busy && !board ? (
              <p className="rounded-lg border-2 border-primary bg-white px-4 py-3 text-sm">Actualizando el corte de nfldata…</p>
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
              <p className="rounded-lg border-2 border-primary border-l-4 border-l-destructive bg-white px-4 py-3 text-sm">
                No hay cartelera para esta semana. Sincroniza la temporada.
              </p>
            )}
            </div>
          </TabsContent>
          <TabsContent value="rankings" className="min-h-0 overflow-y-auto">
            <TeamRankings rankings={rankings} season={season} />
          </TabsContent>
          <TabsContent value="bankroll" className="min-h-0 overflow-y-auto">
            <Bankroll lines={bank} form={form} setForm={setForm} onChange={setBank} onError={setError} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function MatchupTeam({ side, align = "start" }: { side: Side; align?: "start" | "end" }) {
  const end = align === "end";
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${end ? "flex-row-reverse text-right" : ""}`}>
      <TeamLogo abbr={side.abbr} name={side.name} className="size-11 sm:size-14" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tracking-wide text-primary sm:text-xl">
          <span className="sm:hidden">{side.abbr}</span>
          <span className="hidden sm:inline">{side.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {record(side)}
          <span className="hidden sm:inline"> · {side.ppg ?? "—"} pts</span>
        </p>
      </div>
    </div>
  );
}

function TeamMark({ abbr, name, align = "start" }: { abbr: string; name: string; align?: "start" | "end" }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${align === "end" ? "flex-row-reverse" : ""}`}>
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
    <Card className="gap-0 overflow-hidden border-2 border-primary bg-white py-0 text-foreground ring-0">
      <button
        type="button"
        className="block w-full bg-white text-left text-foreground"
        aria-expanded={open}
        onClick={onToggle}
      >
        <CardHeader className="flex flex-row items-center gap-3 rounded-none bg-white text-foreground">
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <MatchupTeam side={game.away} />
              <span className="text-sm font-semibold tracking-widest text-destructive">@</span>
              <MatchupTeam side={game.home} align="end" />
            </div>
            <CardDescription className="text-muted-foreground">
              {game.gameday || "Fecha por confirmar"}
              {game.confirmed ? " · confirmado" : ""}
            </CardDescription>
          </div>
          <ChevronDown className={`size-5 shrink-0 text-primary transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`} />
        </CardHeader>
      </button>
      <div className={`grid bg-card transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden bg-card">
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Más ganados</p>
            <p className="text-xl font-semibold text-primary">{game.winner_record}</p>
          </div>
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Rankings {game.rank_away}-{game.rank_home}
            </p>
            <p className="text-xl font-semibold text-primary">{game.winner_ranks}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2.5">
          <TeamMark abbr={game.away.abbr} name={game.away.name} />
          <Badge className={game.total_pick === "OVER" ? "bg-destructive text-white" : undefined}>
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
              <Label htmlFor={`${game.game_id}-${field.key}`}>{field.label}</Label>
              <Input
                id={`${game.game_id}-${field.key}`}
                type={field.step ? "number" : "text"}
                step={field.step}
                value={draft[field.key] as string | number}
                onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              />
            </div>
          ))}
          <div className="col-span-full grid gap-1.5">
            <Label htmlFor={`${game.game_id}-injuries`}>Lesionados</Label>
            <Input
              id={`${game.game_id}-injuries`}
              value={draft.injuries}
              onChange={(event) => setDraft({ ...draft, injuries: event.target.value })}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
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
    <div className="rounded-lg border border-primary/30 bg-white px-3 py-2">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-lg font-semibold text-primary">{value}</p>
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
      <Card className="border-2 border-primary ring-0">
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              add();
            }}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="group">Grupo</Label>
                <Input id="group" value={form.group_key} onChange={(event) => setForm({ ...form, group_key: event.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="odds">Momio</Label>
                <Input id="odds" value={form.odds} onChange={(event) => setForm({ ...form, odds: event.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="stake">Stake</Label>
                <Input
                  id="stake"
                  placeholder="vacío = reinvierte"
                  value={form.stake}
                  onChange={(event) => setForm({ ...form, stake: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note">Nota</Label>
                <Input id="note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </div>
            </div>
            <Button type="submit" className="bg-destructive text-white hover:bg-destructive/90">
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>
      {lines.map((line) => (
        <Card key={line.id} className="border-2 border-primary ring-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-primary">{line.label || line.group_key}</p>
              <p className="text-sm text-muted-foreground">{line.note}</p>
            </div>
            <p>x{line.odds}</p>
            <p>Stake {line.stake_used ?? "—"}</p>
            <p>Pago {line.payout ?? "—"}</p>
            <Button variant="outline" className="text-destructive" onClick={() => api.deleteBankroll(line.id).then(onChange)}>
              Quitar
            </Button>
          </CardContent>
        </Card>
      ))}
      {!lines.length && (
        <p className="text-sm text-muted-foreground">
          El stake vacío reinvierte el pago anterior del mismo grupo, como las tres piernas del Excel.
        </p>
      )}
    </div>
  );
}
