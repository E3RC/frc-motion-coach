# Developer Guide

## Architecture

The system is split into a Python backend (FastAPI + OpenCV) and a React/TypeScript frontend (Vite).

### Backend Modules

| Module | Purpose |
|---|---|
| `camera/` | Webcam access via OpenCV |
| `calibration/` | Field calibration and homography computation |
| `tracking/` | Robot marker detection (ArUco, color) |
| `metrics/` | Speed, acceleration, G-force calculations |
| `storage/` | SQLite database models and operations |
| `api/` | REST endpoints and WebSocket |
| `settings/` | App configuration |

### Data Flow

```
Camera → Tracker → (pixel coords) → Calibration → (field coords) → Metrics → Storage
                                                                         ↓
                                                                     WebSocket → Dashboard
```

## Adding a New Tracking Mode

1. Add the mode to `TrackingMode` enum in `tracking/tracker.py`
2. Implement the tracking method (e.g., `track_yolo`)
3. Add it to the `track()` dispatch method
4. Add the mode to frontend settings

## Adding a New Metric

1. Add the field to `Sample` dataclass in `metrics/calculator.py`
2. Calculate it in `add_sample()`
3. Add to `RunSummary` if it's a summary metric
4. Add to the API response
5. Display on the frontend dashboard

## API Extensions

Add new endpoints to `api/routes.py` or `main.py`. Use the existing pattern:
- `@router.get()` for GET endpoints
- `@router.post()` for POST endpoints
- `@router.websocket()` for WebSocket

## Testing

```bash
cd backend
pip install -r tests/requirements-test.txt
pytest tests/
```

### Generating Simulated Data

```bash
python scripts/generate_fake_run.py --type circle --duration 30 --save-db
python scripts/generate_fake_run.py --type straight --duration 20
python scripts/generate_fake_run.py --type stopstart
```

## Future Extension Points

- **Multi-robot**: Add tracking of multiple tag IDs concurrently
- **YOLO detection**: Replace or augment ArUco with ML-based detection
- **WPILib integration**: Import robot telemetry via NetworkTables
- **Video recording**: Save camera feed with overlay during runs
- **Heatmaps**: Aggregate position data across runs
- **Cloud sync**: Upload runs to a team database
