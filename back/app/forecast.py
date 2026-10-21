import hashlib
import json
import re
import threading
import time
from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AiForecast

_guards: dict[str, threading.Lock] = {}
_guards_lock = threading.Lock()

SYSTEM = (
    "Eres el pronóstico de un partido de NFL. Usa solamente los hechos del mensaje. "
    "No inventes estadísticas que no aparezcan. Responde solo un objeto JSON, sin markdown, "
    "con enteros: win_away y win_home de 0 a 100 y que sumen 100; "
    "score_away y score_home como puntos enteros de cada equipo; "
    "over_prob y under_prob de 0 a 100 y que sumen 100. "
    "Esas dos últimas son la probabilidad de que la suma de los puntos quede por encima o por debajo de la línea de puntos. "
    "Si el marcador que proyectas suma menos que la línea, under_prob tiene que ser mayor que over_prob. "
    "Si suma más, over_prob tiene que ser mayor. Si no hay línea, usa 50 y 50. "
    "margin es una frase corta en español con el favorito y la diferencia, o 'Empate proyectado'."
)
PROMPT_VERSION = "2"


def _guard(game_id: str) -> threading.Lock:
    with _guards_lock:
        lock = _guards.get(game_id)
        if lock is None:
            lock = threading.Lock()
            _guards[game_id] = lock
        return lock


def _pct(value: object, fallback: int = 50) -> int:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return fallback
    if 0 < abs(number) <= 1:
        number *= 100
    return max(0, min(100, round(number)))


def _pair(left: object, right: object) -> tuple[int, int]:
    away = _pct(left)
    home = _pct(right)
    total = away + home
    if total <= 0:
        return 50, 50
    away = round(away * 100 / total)
    return away, 100 - away


def _points(value: object) -> int:
    try:
        number = int(round(float(value)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        raise HTTPException(status_code=502, detail="La IA no devolvió un marcador") from None
    return max(0, min(70, number))


def _parse(text: str) -> dict:
    raw = text.strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        raw = fenced.group(1)
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        raise HTTPException(status_code=502, detail="La IA no devolvió un pronóstico")
    try:
        payload = json.loads(raw[start : end + 1])
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="La IA no devolvió un pronóstico") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="La IA no devolvió un pronóstico")
    return payload


def _call(brief: str) -> dict:
    headers = {"Content-Type": "application/json"}
    if settings.ai_api_key:
        headers["Authorization"] = f"Bearer {settings.ai_api_key}"
    body = {
        "model": settings.ai_model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": brief},
        ],
    }
    url = settings.ai_base_url.rstrip("/") + "/chat/completions"
    try:
        with httpx.Client(timeout=50) as client:
            response = client.post(url, headers=headers, json=body)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="La IA no respondió") from exc
    if response.status_code == 402:
        raise TimeoutError("rate")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="La IA no respondió")
    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="La IA no respondió") from exc
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="La IA no respondió")
    return _parse(content)


def _ask(brief: str) -> dict:
    last: HTTPException | None = None
    for attempt in range(3):
        try:
            return _call(brief)
        except TimeoutError:
            if attempt == 2:
                break
            time.sleep(12)
        except HTTPException as exc:
            last = exc
            break
    raise last or HTTPException(status_code=502, detail="La IA no respondió")


def _row(game_id: str, digest: str, payload: dict) -> AiForecast:
    win_away, win_home = _pair(payload.get("win_away"), payload.get("win_home"))
    over_prob, under_prob = _pair(payload.get("over_prob"), payload.get("under_prob"))
    margin = str(payload.get("margin") or "").strip()
    return AiForecast(
        game_id=game_id,
        brief_hash=digest,
        win_away=win_away,
        win_home=win_home,
        score_away=_points(payload.get("score_away")),
        score_home=_points(payload.get("score_home")),
        over_prob=over_prob,
        under_prob=under_prob,
        margin=margin[:120],
        created_at=datetime.utcnow(),
    )


def forecast_game(db: Session, game_id: str, brief: str) -> AiForecast:
    digest = hashlib.sha256(f"{PROMPT_VERSION}\n{brief}".encode("utf-8")).hexdigest()
    with _guard(game_id):
        cached = db.get(AiForecast, game_id)
        if cached is not None and cached.brief_hash == digest:
            return cached
        fresh = _row(game_id, digest, _ask(brief))
        if cached is None:
            db.add(fresh)
        else:
            cached.brief_hash = fresh.brief_hash
            cached.win_away = fresh.win_away
            cached.win_home = fresh.win_home
            cached.score_away = fresh.score_away
            cached.score_home = fresh.score_home
            cached.over_prob = fresh.over_prob
            cached.under_prob = fresh.under_prob
            cached.margin = fresh.margin
            cached.created_at = fresh.created_at
            fresh = cached
        db.commit()
        db.refresh(fresh)
        return fresh
