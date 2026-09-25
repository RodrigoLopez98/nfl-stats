import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type BankrollLine, type Board, type GameCard, type Rankings, type Status } from "./api";

const emptyForm = {
  group_key: "parlay",
  label: "Apuesta",
  odds: "2.8",
  stake: "2000",
  note: "",
};

export default function App() {
  const [season, setSeason] = useState(new Date().getMonth() >= 2 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  const [week, setWeek] = useState(1);
  const [status, setStatus] = useState<Status | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [bank, setBank] = useState<BankrollLine[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load(nextSeason = season, nextWeek = week) {
    const info = await api.status(nextSeason);
    setStatus(info);
    const activeWeek = info.weeks.includes(nextWeek) ? nextWeek : info.suggested_week || info.weeks[0] || 1;
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
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function changeSeason(value: number) {
    if (!Number.isFinite(value) || value === season) return;
    setSeason(value);
    setError("");
    await load(value, week).catch((err: Error) => setError(err.message));
  }

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

  const years = [season - 1, season, season + 1];
  const weeks = status?.weeks.length ? status.weeks : [week];

  return (
    <div className="min-h-svh bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-wide">
              NFL <span className="text-red-200">STATS</span>
            </h1>
            <p className="text-sm text-primary-foreground/80">Cartelera, proyección y bankroll. El teléfono solo llama a esta API.</p>
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
          <div className="grid gap-1">
            <Label className="text-xs tracking-wide text-primary-foreground/80 uppercase">Temporada</Label>
            <Select value={String(season)} onValueChange={(value) => changeSeason(Number(value))}>
              <SelectTrigger className="w-36 border-white/20 bg-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs tracking-wide text-primary-foreground/80 uppercase">Semana</Label>
            <Select value={String(week)} onValueChange={(value) => changeWeek(Number(value))}>
              <SelectTrigger className="w-40 border-white/20 bg-white/10 text-white">
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
          <p className="pb-2 text-sm text-primary-foreground/80">
            {status?.last_sync ? `Último sync: ${new Date(status.last_sync).toLocaleString()}` : "Sin sincronizar"}
            {" · "}
            {status?.games ?? 0} partidos · {status?.teams ?? 0} equipos
          </p>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-4">
        {error && <div className="rounded-lg border-l-4 border-destructive bg-card px-4 py-3 text-sm">{error}</div>}
        <Tabs defaultValue="tablero">
          <TabsList>
            <TabsTrigger value="tablero">Tablero</TabsTrigger>
            <TabsTrigger value="rankings">Rankings</TabsTrigger>
            <TabsTrigger value="bankroll">Bankroll</TabsTrigger>
          </TabsList>
          <TabsContent value="tablero" className="grid gap-3">
            {board?.games.length ? (
              board.games.map((game) => (
                <GameEditor key={game.game_id} game={game} onSaved={() => load(season, week).catch((err: Error) => setError(err.message))} />
              ))
            ) : (
              <p className="rounded-lg border-l-4 border-destructive bg-card px-4 py-3 text-sm">
                No hay cartelera para esta semana. Sincroniza la temporada.
              </p>
            )}
          </TabsContent>
          <TabsContent value="rankings">
            <RankTable rankings={rankings} />
          </TabsContent>
          <TabsContent value="bankroll">
            <Bankroll lines={bank} form={form} setForm={setForm} onChange={setBank} onError={setError} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function record(side: GameCard["away"]) {
  return side.ties ? `${side.wins}-${side.losses}-${side.ties}` : `${side.wins}-${side.losses}`;
}

function pct(value: number | null) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function GameEditor({ game, onSaved }: { game: GameCard; onSaved: () => void }) {
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
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardTitle className="text-2xl tracking-wide">
          {game.away.name} @ {game.home.name}
        </CardTitle>
        <CardDescription className="text-primary-foreground/75">
          {game.gameday || "Fecha por confirmar"}
          {game.confirmed ? " · confirmado" : ""}
        </CardDescription>
      </CardHeader>
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{game.away.abbr}</p>
            <p className="text-sm text-muted-foreground">
              {record(game.away)} · {game.away.ppg ?? "—"} pts
            </p>
          </div>
          <Badge className={game.total_pick === "OVER" ? "bg-destructive text-white" : undefined}>
            {game.total_pick || "SIN LÍNEA"}
          </Badge>
          <div className="text-right">
            <p className="font-semibold">{game.home.abbr}</p>
            <p className="text-sm text-muted-foreground">
              {record(game.home)} · {game.home.ppg ?? "—"} pts
            </p>
          </div>
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
                    <TableHead>{game.away.abbr}</TableHead>
                    <TableHead>{game.home.abbr}</TableHead>
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
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

function RankTable({ rankings }: { rankings: Rankings | null }) {
  if (!rankings?.teams.length) {
    return <p className="text-sm text-muted-foreground">Los ranks aparecen después de sincronizar.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            <TableHead className="text-primary-foreground">Equipo</TableHead>
            <TableHead className="text-primary-foreground">Récord</TableHead>
            <TableHead className="text-primary-foreground">PPG</TableHead>
            {rankings.categories.map((cat) => (
              <TableHead key={cat.key} className="text-primary-foreground">
                {cat.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.teams.map((team) => (
            <TableRow key={team.abbr}>
              <TableCell>{team.name}</TableCell>
              <TableCell>
                {team.wins}-{team.losses}
              </TableCell>
              <TableCell>{team.ppg ?? "—"}</TableCell>
              {rankings.categories.map((cat) => (
                <TableCell key={cat.key}>{team.ranks[cat.key] ?? "—"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
      <Card>
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
        <Card key={line.id}>
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
