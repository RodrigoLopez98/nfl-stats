import { useState } from "react";
import { cn } from "cn";
import { NFL_TEAMS } from "@/lib/nfl-teams";
import { TeamLogo, teamHelmetUrl } from "@/components/team-logo";

function TeamPickerCard({
  abbr,
  name,
  gridLabel,
  selected,
  onSelect,
}: {
  abbr: string;
  name: string;
  gridLabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [helmetFailed, setHelmetFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={name}
      className={cn(
        "relative flex min-h-[7.75rem] flex-col items-center rounded-lg border bg-[#151a24] px-1 pb-2 pt-2.5 transition-colors",
        selected ? "border-white/70 ring-1 ring-white/40" : "border-white/15 hover:border-white/35",
      )}
    >
      <span className="font-industry text-[1.35rem] leading-none font-black italic tracking-tight text-white">
        {gridLabel}
      </span>
      {!helmetFailed ? (
        <img
          src={teamHelmetUrl(abbr)}
          alt=""
          className="pointer-events-none mt-0.5 h-[3.25rem] w-[85%] max-w-[4.5rem] object-contain object-center drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]"
          loading="lazy"
          decoding="async"
          onError={() => setHelmetFailed(true)}
        />
      ) : (
        <TeamLogo abbr={abbr} name={name} className="mt-2 size-12" />
      )}
      <TeamLogo abbr={abbr} name={name} className="mt-auto size-7" />
    </button>
  );
}

export function TeamPicker({
  selectedAbbr,
  onSelect,
}: {
  selectedAbbr?: string;
  onSelect: (abbr: string) => void;
}) {
  return (
    <div className="rounded-xl bg-[#0b0e14] px-3 py-4 sm:px-4">
      <h2 className="font-industry text-[1.65rem] leading-tight font-black italic tracking-wide text-white uppercase sm:text-3xl">
        Elige tu equipo
      </h2>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-2.5">
        {NFL_TEAMS.map((team) => (
          <TeamPickerCard
            key={team.abbr}
            abbr={team.abbr}
            name={team.name}
            gridLabel={team.gridLabel}
            selected={selectedAbbr === team.abbr}
            onSelect={() => onSelect(team.abbr)}
          />
        ))}
      </div>
    </div>
  );
}
