import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, LayoutList, RefreshCw, UserRound, Wallet } from "lucide-react";
import { cn } from "cn";

export type AppTab = "scores" | "tablero" | "teams" | "bankroll";

const TITLES: Record<AppTab, string> = {
  scores: "Scores",
  tablero: "Tablero",
  teams: "Teams",
  bankroll: "Bankroll",
};

const NAV: { id: AppTab; label: string; Icon: LucideIcon }[] = [
  { id: "scores", label: "Scores", Icon: CalendarDays },
  { id: "tablero", label: "Tablero", Icon: LayoutList },
  { id: "teams", label: "Teams", Icon: UserRound },
  { id: "bankroll", label: "Bankroll", Icon: Wallet },
];

export function appTabTitle(tab: AppTab) {
  return TITLES[tab];
}

export function AppShell({
  tab,
  onTabChange,
  onSync,
  busy,
  children,
}: {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onSync: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-svh flex-col bg-[#0b0e14] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#161922] pt-[env(safe-area-inset-top,0px)]">
        <div className="relative flex h-14 items-center justify-center px-12">
          <img src="/nfl-logo.png" alt="" className="absolute left-3 h-8 w-auto max-w-[2.25rem]" />
          <h1 className="text-[1.05rem] font-semibold tracking-wide">{appTabTitle(tab)}</h1>
          <button
            type="button"
            onClick={onSync}
            disabled={busy}
            aria-label="Sincronizar"
            className="absolute right-3 flex size-9 items-center justify-center rounded-full border border-white/25 text-white/90 disabled:opacity-40"
          >
            <RefreshCw className={cn("size-4", busy && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full max-w-lg flex-1 overflow-y-auto px-4 py-3">{children}</main>

      <nav
        className="shrink-0 border-t border-white/10 bg-[#161922] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Principal"
      >
        <ul className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-4">
          {NAV.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onTabChange(id)}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-wide",
                    active ? "text-white" : "text-white/45",
                  )}
                >
                  <Icon className="size-6 stroke-[1.5]" strokeWidth={1.5} />
                  <span>{label}</span>
                  {active && <span className="size-1 rounded-full bg-white" aria-hidden />}
                  {!active && <span className="size-1" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function WeekToolbar({
  season,
  week,
  weeks,
  onWeekChange,
  meta,
}: {
  season: number;
  week: number;
  weeks: number[];
  onWeekChange: (week: number) => void;
  meta?: string;
}) {
  const index = weeks.indexOf(week);
  return (
    <div className="mb-4 grid gap-2 rounded-xl bg-[#242731] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-white/55 uppercase">Temporada {season}</p>
        {meta && <p className="truncate text-[10px] text-white/45">{meta}</p>}
      </div>
      <label className="grid gap-1">
        <span className="text-[10px] font-semibold tracking-wider text-white/55 uppercase">Semana</span>
        <select
          value={week}
          onChange={(event) => onWeekChange(Number(event.target.value))}
          className="rounded-lg border border-white/15 bg-[#0b0e14] px-3 py-2 text-sm text-white outline-none"
        >
          {weeks.map((item) => (
            <option key={item} value={item} className="bg-[#0b0e14]">
              Semana {item}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-between text-xs text-white/45">
        <button
          type="button"
          className="disabled:opacity-30"
          disabled={index <= 0}
          onClick={() => weeks[index - 1] != null && onWeekChange(weeks[index - 1])}
        >
          ← Anterior
        </button>
        <button
          type="button"
          className="disabled:opacity-30"
          disabled={index < 0 || index >= weeks.length - 1}
          onClick={() => weeks[index + 1] != null && onWeekChange(weeks[index + 1])}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
