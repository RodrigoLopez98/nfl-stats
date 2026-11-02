"""Califica pronósticos de partidos ya jugados y explica el error.

La fórmula se repite solo con partidos anteriores, para no usar el resultado
que se está calificando. Si ese partido tiene un pronóstico guardado, el
acierto y el motivo salen de ese pronóstico.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AiForecast, Game
from app.teams import TEAMS, canon_abbr

MIN_SAMPLE = 4


@dataclass(frozen=True)
class PastGame:
    game_id: str
    week: int
    gameday: date | None
    away: str
    home: str
    away_score: int
    home_score: int
    forecast_away: int | None = None
    forecast_home: int | None = None
    forecast_win_away: int | None = None
    forecast_win_home: int | None = None


@dataclass(frozen=True)
class Miss:
    week: int
    matchup: str
    text: str
    score: str
    source: str


@dataclass(frozen=True)
class LessonReport:
    graded: int
    hits: int
    apply_margin: float
    apply_total: float
    headline: str
    pattern: str
    prompt: str
    misses: list[Miss]


def _name(abbr: str) -> str:
    return TEAMS.get(canon_abbr(abbr), abbr).title()


def _rows(prior: list[PastGame], abbr: str) -> list[tuple[int, int, date | None]]:
    code = canon_abbr(abbr)
    found: list[tuple[int, int, date | None]] = []
    for game in prior:
        if canon_abbr(game.away) == code:
            found.append((game.away_score, game.home_score, game.gameday))
        elif canon_abbr(game.home) == code:
            found.append((game.home_score, game.away_score, game.gameday))
    return found


def _record(rows: list[tuple[int, int, date | None]]) -> tuple[int, int, int]:
    wins = losses = ties = 0
    for scored, allowed, _day in rows:
        if scored > allowed:
            wins += 1
        elif scored < allowed:
            losses += 1
        else:
            ties += 1
    return wins, losses, ties


def _pct(record: tuple[int, int, int]) -> float | None:
    wins, losses, ties = record
    played = wins + losses + ties
    if not played:
        return None
    return (wins + ties * 0.5) / played


def _record_label(record: tuple[int, int, int]) -> str:
    wins, losses, ties = record
    if ties:
        return f"{wins}-{losses}-{ties}"
    return f"{wins}-{losses}"


def _better(away_rows: list[tuple[int, int, date | None]], home_rows: list[tuple[int, int, date | None]], window: int | None) -> str | None:
    away_sample = away_rows if window is None else away_rows[-window:]
    home_sample = home_rows if window is None else home_rows[-window:]
    if window is not None and (len(away_sample) < 2 or len(home_sample) < 2):
        return None
    away_pct = _pct(_record(away_sample))
    home_pct = _pct(_record(home_sample))
    if away_pct is None or home_pct is None or abs(away_pct - home_pct) < 0.1:
        return None
    return "away" if away_pct > home_pct else "home"


def _project(offense: float | None, defense: float | None, recent: float | None) -> float:
    if offense is not None and defense is not None:
        season = offense * 0.55 + defense * 0.45
    elif offense is not None:
        season = offense
    elif defense is not None:
        season = defense
    else:
        season = 21.5
    if recent is None:
        return season
    return season * 0.8 + recent * 0.2


def _rest_edge(away_rows: list[tuple[int, int, date | None]], home_rows: list[tuple[int, int, date | None]], gameday: date | None) -> float:
    if gameday is None:
        return 0
    def days(rows: list[tuple[int, int, date | None]]) -> int | None:
        played = [day for _scored, _allowed, day in rows if day is not None]
        if not played:
            return None
        return (gameday - max(played)).days

    away_days = days(away_rows)
    home_days = days(home_rows)
    if away_days is None or home_days is None:
        return 0
    gap = max(-4, min(4, home_days - away_days))
    return gap * 0.25


def _replay(game: PastGame, prior: list[PastGame]) -> tuple[int, int]:
    away_rows = _rows(prior, game.away)
    home_rows = _rows(prior, game.home)
    away_ppg = sum(scored for scored, _allowed, _day in away_rows) / len(away_rows) if away_rows else None
    home_ppg = sum(scored for scored, _allowed, _day in home_rows) / len(home_rows) if home_rows else None
    away_allowed = sum(allowed for _scored, allowed, _day in away_rows) / len(away_rows) if away_rows else None
    home_allowed = sum(allowed for _scored, allowed, _day in home_rows) / len(home_rows) if home_rows else None
    away_recent = away_rows[-3:]
    home_recent = home_rows[-3:]
    away_recent_avg = sum(scored for scored, _allowed, _day in away_recent) / len(away_recent) if away_recent else None
    home_recent_avg = sum(scored for scored, _allowed, _day in home_recent) / len(home_recent) if home_recent else None
    raw_away = _project(away_ppg, home_allowed, away_recent_avg)
    raw_home = _project(home_ppg, away_allowed, home_recent_avg) + 1.2 + _rest_edge(away_rows, home_rows, game.gameday)
    return max(6, round(raw_away)), max(6, round(raw_home))


def _side(away_score: int, home_score: int, win_away: int | None = None, win_home: int | None = None) -> str:
    if win_away is not None and win_home is not None and win_away != win_home:
        return "away" if win_away > win_home else "home"
    if away_score == home_score:
        return "tie"
    return "away" if away_score > home_score else "home"


def _explain(
    game: PastGame,
    pred_away: int,
    pred_home: int,
    picked: str,
    prior: list[PastGame],
) -> tuple[str, str]:
    actual = _side(game.away_score, game.home_score)
    if picked == actual:
        return "hit", ""
    away_rows = _rows(prior, game.away)
    home_rows = _rows(prior, game.home)
    away_name = _name(game.away)
    home_name = _name(game.home)
    names = {"away": away_name, "home": home_name, "tie": "el empate"}
    winner = names[actual]
    pick_name = names[picked]
    real = f"{game.away_score}-{game.home_score}"
    lead = f"Se proyectó {pred_away}-{pred_home} y el resultado fue {real}."
    better_record = _better(away_rows, home_rows, None)
    better_form = _better(away_rows, home_rows, 3)
    pred_margin = abs(pred_home - pred_away)
    actual_margin = abs(game.home_score - game.away_score)
    total_gap = (pred_away + pred_home) - (game.away_score + game.home_score)
    if picked != "tie" and better_record == picked:
        record = _record(away_rows if picked == "away" else home_rows)
        detail = f"Se confió en el mejor récord de {pick_name} ({_record_label(record)}) y ganó {winner}."
        tag = "record"
    elif picked != "tie" and better_form == picked and better_record != picked:
        record = _record((away_rows if picked == "away" else home_rows)[-3:])
        detail = f"Se siguió la racha de {pick_name} ({_record_label(record)}) y ganó {winner}."
        tag = "form"
    elif actual_margin >= 14:
        detail = f"Se subestimó a {winner}, que ganó por {actual_margin}."
        tag = "upset"
    elif picked == "home" and actual != "home" and better_record is None:
        detail = f"La localía inclinó el pronóstico hacia {home_name} y ganó {winner}."
        tag = "home"
    elif pred_margin <= 3:
        detail = f"El margen proyectado era de {pred_margin} y el juego se fue con {winner}."
        tag = "close"
    else:
        detail = f"El lado elegido fue {pick_name} y ganó {winner}."
        tag = "score"
    if total_gap >= 10:
        detail += f" El total quedó {total_gap} puntos por encima."
    elif total_gap <= -10:
        detail += f" El total quedó {-total_gap} puntos por debajo."
    return tag, f"{lead} {detail}"


def grade(games: list[PastGame], exclude_id: str | None = None) -> LessonReport:
    ordered = sorted(games, key=lambda game: (game.gameday or date.max, game.week, game.game_id))
    hits = 0
    graded = 0
    saved = 0
    margin_errors: list[float] = []
    total_errors: list[float] = []
    tag_counts: dict[str, int] = {}
    misses: list[Miss] = []
    for index, game in enumerate(ordered):
        if game.game_id == exclude_id:
            continue
        prior = ordered[:index]
        replay_away, replay_home = _replay(game, prior)
        margin_errors.append((replay_home - replay_away) - (game.home_score - game.away_score))
        total_errors.append((replay_away + replay_home) - (game.away_score + game.home_score))
        if game.forecast_away is not None and game.forecast_home is not None:
            pred_away, pred_home = game.forecast_away, game.forecast_home
            picked = _side(pred_away, pred_home, game.forecast_win_away, game.forecast_win_home)
            source = "guardado"
            saved += 1
        else:
            pred_away, pred_home = replay_away, replay_home
            picked = _side(pred_away, pred_home)
            source = "modelo"
        graded += 1
        actual = _side(game.away_score, game.home_score)
        tag, text = _explain(game, pred_away, pred_home, picked, prior)
        if picked == actual:
            hits += 1
            continue
        tag_counts[tag] = tag_counts.get(tag, 0) + 1
        misses.append(
            Miss(
                week=game.week,
                matchup=f"{_name(game.away)} en {_name(game.home)}",
                text=text,
                score=f"{game.away_score}-{game.home_score}",
                source=source,
            )
        )
    return _report(graded, hits, saved, margin_errors, total_errors, tag_counts, misses)


def _clamp(value: float, limit: float) -> float:
    return max(-limit, min(limit, value))


def _report(
    graded: int,
    hits: int,
    saved: int,
    margin_errors: list[float],
    total_errors: list[float],
    tag_counts: dict[str, int],
    misses: list[Miss],
) -> LessonReport:
    sample = len(margin_errors)
    margin_mean = sum(margin_errors) / sample if sample else 0
    total_mean = sum(total_errors) / sample if sample else 0
    apply_margin = round(_clamp(margin_mean, 4), 1) if sample >= MIN_SAMPLE else 0
    apply_total = round(_clamp(total_mean, 6), 1) if sample >= MIN_SAMPLE else 0
    if graded == 0:
        headline = "Todavía no hay partidos terminados para revisar el pronóstico."
        pattern = ""
        prompt = ""
        return LessonReport(0, 0, 0, 0, headline, pattern, prompt, [])
    pct = round(100 * hits / graded)
    replay = graded - saved
    if saved and replay:
        headline = (
            f"En {graded} partidos ya jugados se acertó el ganador {hits} veces ({pct}%). "
            f"{saved} salen del pronóstico guardado y {replay} de la fórmula con datos anteriores al partido."
        )
    elif saved:
        headline = f"En {saved} pronósticos ya cerrados se acertó el ganador {hits} veces ({pct}%)."
    else:
        headline = (
            f"En {graded} partidos ya jugados la fórmula acertó el ganador {hits} veces ({pct}%), "
            "usando solo lo que se sabía antes de cada partido."
        )
    pattern = _pattern(tag_counts)
    prompt = _prompt(headline, pattern, apply_margin, apply_total, sample, misses)
    return LessonReport(graded, hits, apply_margin, apply_total, headline, pattern, prompt, list(reversed(misses[-5:])))


_PATTERN = {
    "record": "El fallo que más se repite es confiar en el mejor récord aunque ese equipo pierda",
    "form": "El fallo que más se repite es seguir la racha de los últimos partidos",
    "upset": "El fallo que más se repite es no ver cuando el no favorito gana por goleada",
    "home": "El fallo que más se repite es dejar que la localía decida un partido parejo",
    "close": "El fallo que más se repite es elegir un lado cuando el margen proyectado es corto",
    "score": "El fallo que más se repite es el marcador, sin un solo sesgo dominante",
}

_FIX = {
    "record": "No pases de 60% solo porque un equipo tiene más victorias.",
    "form": "La racha no basta: mira a quién le ganaron esos partidos.",
    "upset": "Si el margen no es claro, deja más espacio a una victoria amplia del otro lado.",
    "home": "No des la victoria al local solo por jugar en casa.",
    "close": "En un margen de 3 puntos o menos, acerca las dos probabilidades.",
    "score": "Ajusta los puntos al marcador real de partidos parecidos, no solo al ganador.",
}


def _pattern(tag_counts: dict[str, int]) -> str:
    if not tag_counts:
        return "En estos partidos el ganador salió como se había proyectado."
    priority = ["record", "form", "home", "close", "upset", "score"]
    tag = max(tag_counts, key=lambda name: (tag_counts[name], -priority.index(name)))
    count = tag_counts[tag]
    if count < 2:
        return "Todavía no hay un mismo error que se repita."
    return f"{_PATTERN[tag]}: pasó {count} veces."


def _prompt(headline: str, pattern: str, apply_margin: float, apply_total: float, sample: int, misses: list[Miss]) -> str:
    lines = [
        "Lecciones de partidos ya terminados. Corrígelas en este pronóstico. No uses el resultado de este partido ni inventes otro historial.",
        headline,
        pattern,
    ]
    if sample >= MIN_SAMPLE and apply_margin >= 1:
        lines.append(f"El margen del local quedó {apply_margin:.1f} puntos alto. Bájale puntos al local.")
    elif sample >= MIN_SAMPLE and apply_margin <= -1:
        lines.append(f"El margen del local quedó {abs(apply_margin):.1f} puntos bajo. Súbele puntos al local.")
    if sample >= MIN_SAMPLE and apply_total >= 1.5:
        lines.append(f"El total quedó {apply_total:.1f} puntos alto. Proyecta menos puntos.")
    elif sample >= MIN_SAMPLE and apply_total <= -1.5:
        lines.append(f"El total quedó {abs(apply_total):.1f} puntos bajo. Proyecta más puntos.")
    tag = _tag_from_pattern(pattern)
    if tag:
        lines.append(_FIX[tag])
    recent = list(reversed(misses[-5:]))
    if recent:
        lines.append("Errores recientes:")
        for miss in recent:
            origin = "pronóstico guardado" if miss.source == "guardado" else "fórmula previa"
            lines.append(f"- Semana {miss.week}, {miss.matchup} ({origin}): {miss.text}")
    return "\n".join(lines)[:1800]


def _tag_from_pattern(pattern: str) -> str:
    for tag, text in _PATTERN.items():
        if pattern.startswith(text):
            return tag
    return ""


def lesson_report(db: Session, season: int, exclude_id: str | None = None) -> LessonReport:
    rows = db.scalars(
        select(Game).where(
            Game.season == season,
            Game.game_type == "REG",
            Game.home_score.is_not(None),
            Game.away_score.is_not(None),
        )
    ).all()
    forecasts: dict[str, AiForecast] = {}
    ids = [game.game_id for game in rows]
    if ids:
        for row in db.scalars(select(AiForecast).where(AiForecast.game_id.in_(ids))).all():
            forecasts[row.game_id] = row
    games = []
    for game in rows:
        if game.home_score is None or game.away_score is None:
            continue
        saved = forecasts.get(game.game_id)
        games.append(
            PastGame(
                game_id=game.game_id,
                week=game.week,
                gameday=game.gameday,
                away=canon_abbr(game.away_team),
                home=canon_abbr(game.home_team),
                away_score=game.away_score,
                home_score=game.home_score,
                forecast_away=saved.score_away if saved else None,
                forecast_home=saved.score_home if saved else None,
                forecast_win_away=saved.win_away if saved else None,
                forecast_win_home=saved.win_home if saved else None,
            )
        )
    return grade(games, exclude_id)


def lesson_prompt(db: Session, game_id: str) -> str:
    game = db.get(Game, game_id)
    if game is None or game.home_score is not None or game.away_score is not None:
        return ""
    return lesson_report(db, game.season, exclude_id=game_id).prompt
