import { useState } from "react";
import { cn } from "cn";

const ESPN_ABBR: Record<string, string> = {
  LA: "lar",
  WAS: "wsh",
};

export function teamLogoUrl(abbr: string) {
  const code = ESPN_ABBR[abbr.toUpperCase()] ?? abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png`;
}

export function TeamLogo({
  abbr,
  name,
  className,
}: {
  abbr: string;
  name?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-current/10 text-[0.6em] font-semibold tracking-wide",
          className,
        )}
        aria-hidden
      >
        {abbr.slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={teamLogoUrl(abbr)}
      alt={name ? `Logo de ${name}` : ""}
      className={cn("shrink-0 object-contain", className)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
