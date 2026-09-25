from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router, scheduled_sync
from app.config import settings

scheduler = BackgroundScheduler(timezone="America/Chicago")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.enable_scheduler:
        scheduler.add_job(
            scheduled_sync,
            CronTrigger(day_of_week="mon", hour=8, minute=0),
            id="monday-nfl-sync",
            replace_existing=True,
        )
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown(wait=False)


app = FastAPI(title="NFL Stats", lifespan=lifespan)
origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
