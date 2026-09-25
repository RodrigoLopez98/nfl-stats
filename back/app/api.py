from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.board import bankroll_view, build_board, build_rankings, default_season, status, suggest_week
from app.database import get_db
from app.ingest import sync_season
from app.models import BankrollLine, Game, SlateEntry
from app.schemas import BankrollIn, BankrollLineOut, BoardOut, RankingsOut, SlateIn, StatusOut

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/status", response_model=StatusOut)
def get_status(season: int | None = None, db: Session = Depends(get_db)):
    return status(db, season or default_season())


@router.get("/board", response_model=BoardOut)
def get_board(season: int | None = None, week: int | None = None, db: Session = Depends(get_db)):
    season = season or default_season()
    week = week or suggest_week(db, season)
    if week is None:
        return BoardOut(season=season, week=0, games=[])
    return build_board(db, season, week)


@router.get("/rankings", response_model=RankingsOut)
def get_rankings(season: int | None = None, week: int | None = None, db: Session = Depends(get_db)):
    season = season or default_season()
    week = week or suggest_week(db, season) or 1
    return build_rankings(db, season, week)


@router.put("/slate/{game_id}")
def save_slate(game_id: str, body: SlateIn, db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    entry = db.scalar(select(SlateEntry).where(SlateEntry.game_id == game_id))
    if entry is None:
        entry = SlateEntry(game_id=game_id, season=game.season, week=game.week)
        db.add(entry)
    for field, value in body.model_dump().items():
        setattr(entry, field, value)
    db.commit()
    return {"ok": True}


@router.post("/sync")
def run_sync(season: int | None = None, db: Session = Depends(get_db)):
    season = season or default_season()
    try:
        return sync_season(db, season)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/bankroll", response_model=list[BankrollLineOut])
def list_bankroll(db: Session = Depends(get_db)):
    return bankroll_view(db)


@router.post("/bankroll", response_model=list[BankrollLineOut])
def add_bankroll(body: BankrollIn, db: Session = Depends(get_db)):
    db.add(BankrollLine(**body.model_dump()))
    db.commit()
    return bankroll_view(db)


@router.delete("/bankroll/{line_id}", response_model=list[BankrollLineOut])
def delete_bankroll(line_id: int, db: Session = Depends(get_db)):
    line = db.get(BankrollLine, line_id)
    if line is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    db.delete(line)
    db.commit()
    return bankroll_view(db)


def scheduled_sync() -> None:
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        season = default_season()
        sync_season(db, season)
    finally:
        db.close()
