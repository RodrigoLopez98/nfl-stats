# NFL Stats

Tablero personal que reemplaza el libro de cinco hojas. FastAPI calcula la semana; React solo la muestra y captura líneas, lesionados y bankroll. El lunes un job consulta `api.nfldata.org` y guarda partidos y totales en PostgreSQL. Capacitor empaqueta el mismo front: el teléfono habla únicamente con esta API.

## Reglas (las del Excel)

- Proyección = puntos por partido del visitante + puntos por partido del local.
- OVER solo si esa suma supera la línea. Si queda igual, UNDER.
- Ganador por récord: más victorias; si empatan, menos derrotas.
- Ganador por rankings: gana quien se queda con más de las 9 categorías. El rank 1 es el mejor y el número más alto es el peor. Un empate de categoría no suma para nadie.
- Porcentaje histórico de overs: partidos de temporada regular ya jugados contra la línea de esta semana. Los BYE no entran.

## Local con Conda, Alembic y Uvicorn

La primera vez, crea el entorno y deja Postgres corriendo (Docker o el clúster de `.pgdata`). Después, desde `back`:

```powershell
conda activate nfl-stats
alembic upgrade head
uvicorn app.main:app --reload
```

Eso abre la API en `http://127.0.0.1:8000`. Alembic y Uvicorn salen del entorno, así que no hace falta `conda run` ni `--app-dir`: el directorio de trabajo es `back`, donde están `alembic.ini` y el paquete `app`.

En otra terminal:

```powershell
cd front
npm install
npm run dev
```

Abre `http://127.0.0.1:5173` y pulsa Sincronizar.

Pruebas del motor:

```powershell
conda run -n nfl-stats --cwd back pytest
```

## Capacitor

El build usa `VITE_API_URL` (la URL HTTPS de tu API en Render). No llama a nfldata.org ni recalcula fórmulas.

```powershell
cd front
$env:VITE_API_URL="https://tu-api.onrender.com"
npm run build
npx cap add android
npx cap sync
```
