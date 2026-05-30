# FRC Motion Coach

A webcam-based robot tracking system for FRC practice sessions. Tracks a single FRC robot on a practice field using AprilTags/ArUco markers, converts camera pixels to real-world field coordinates, and provides live and historical performance data.

**Status:** MVP v0.1.0

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Features

- **Camera input**: USB webcam, laptop camera, network camera
- **Calibration**: AprilTags, ArUco markers, or manual corner selection
- **Tracking**: Single robot tracking with marker offset correction
- **Metrics**: Speed, acceleration, estimated G-force, distance, moving/stopped time
- **Live dashboard**: Camera feed, field overlay, live stats, run controls
- **Historical review**: Saved runs with path replay, speed/acceleration charts, CSV/JSON export

## Project Structure

```
frc-motion-coach/
  backend/
    app/
      main.py              # FastAPI entry point
      camera/              # Camera input module
      calibration/         # Field calibration and homography
      tracking/            # Robot tracking (ArUco, color)
      metrics/             # Speed, acceleration, G-force calculations
      storage/             # SQLite database
      api/                 # REST and WebSocket endpoints
      settings/            # Application settings
    tests/                 # Unit tests
  frontend/
    src/
      pages/               # Dashboard, Calibration, History, RunReview
      field/               # Field overlay canvas component
      api/                 # API client
      hooks/               # WebSocket hook
  docs/                    # Documentation
  data/                    # SQLite DB and calibration profiles
  scripts/                 # Dev scripts, fake run generator
```

## API

Docs available at http://localhost:8000/docs when running.

Key endpoints:
- `GET /api/status` - Server status
- `GET /api/cameras` - List available cameras
- `POST /api/calibration/save` - Save calibration profile
- `POST /api/runs/start` - Start recording a run
- `POST /api/runs/stop` - Stop recording
- `GET /api/runs` - List all runs
- `GET /api/runs/{id}/export.csv` - Export run as CSV
- `WS /api/ws/live-tracking` - Live tracking data stream

## Disclaimer

Tracking data is estimated from camera vision and calibration. Results are intended for practice analysis, not official scoring, inspection, or competition use.
