"""REST API routes: calibrations, runs, samples, settings, exports, WebSocket live tracking."""
import json
import csv
import io
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..storage.database import Database
from ..tracking.tracker import RobotState

router = APIRouter(prefix="/api")


class CalibrationSaveRequest(BaseModel):
    name: str
    field_type: str
    field_width: float
    field_length: float
    unit: str = "feet"
    camera_resolution: str = ""
    marker_points_image: list = []
    marker_points_field: list = []
    homography_matrix: list = []
    notes: str = ""


class RunStartRequest(BaseModel):
    name: str = ""
    driver: str = ""
    robot_config: str = ""
    practice_type: str = ""
    calibration_profile_id: Optional[int] = None
    notes: str = ""


class RunStopRequest(BaseModel):
    summary_metrics: dict = {}


class EventCreateRequest(BaseModel):
    event_type: str
    label: str = ""
    notes: str = ""


class SettingsUpdateRequest(BaseModel):
    camera_id: Optional[int] = None
    camera_resolution_width: Optional[int] = None
    camera_resolution_height: Optional[int] = None
    tracking_mode: Optional[str] = None
    target_marker_id: Optional[int] = None
    marker_offset_x: Optional[float] = None
    marker_offset_y: Optional[float] = None
    moving_threshold_ft_per_s: Optional[float] = None
    moving_min_duration_s: Optional[float] = None
    stopped_threshold_ft_per_s: Optional[float] = None
    stopped_min_duration_s: Optional[float] = None
    tracking_lost_timeout_s: Optional[float] = None
    smoothing_window: Optional[int] = None
    color_lower_h: Optional[int] = None
    color_lower_s: Optional[int] = None
    color_lower_v: Optional[int] = None
    color_upper_h: Optional[int] = None
    color_upper_s: Optional[int] = None
    color_upper_v: Optional[int] = None
    networktables_server: Optional[str] = None
    networktables_port: Optional[int] = None
    networktables_enabled: Optional[bool] = None
    yolo_model_path: Optional[str] = None
    target_marker_ids: Optional[str] = None


def get_db():
    from ..storage.database import Database
    import os
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data",
        "frc_motion_coach.db",
    )
    return Database(db_path)


@router.get("/status")
def get_status():
    return {
        "status": "ok",
        "version": "0.1.0",
        "name": "FRC Motion Coach",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/cameras")
def list_cameras():
    from ..camera.camera_manager import CameraManager
    cameras = CameraManager.list_cameras()
    return [{"id": c.id, "name": c.name, "backend": c.backend} for c in cameras]


@router.post("/calibration/start")
def start_calibration():
    return {"status": "calibration_ready", "message": "Send frame data to compute"}


@router.post("/calibration/save")
def save_calibration(req: CalibrationSaveRequest):
    db = get_db()
    cal_id = db.save_calibration({
        "name": req.name,
        "field_type": req.field_type,
        "field_width": req.field_width,
        "field_length": req.field_length,
        "unit": req.unit,
        "camera_resolution": req.camera_resolution,
        "marker_points_image": json.dumps(req.marker_points_image),
        "marker_points_field": json.dumps(req.marker_points_field),
        "homography_matrix": json.dumps(req.homography_matrix),
        "notes": req.notes,
    })
    return {"status": "ok", "calibration_id": cal_id}


@router.get("/calibrations")
def list_calibrations():
    db = get_db()
    cals = db.get_calibrations()
    return [
        {
            "id": c.id,
            "name": c.name,
            "field_type": c.field_type,
            "field_width": c.field_width,
            "field_length": c.field_length,
            "created_at": c.created_at.isoformat() if c.created_at else "",
        }
        for c in cals
    ]


@router.get("/calibrations/{cal_id}")
def get_calibration(cal_id: int):
    db = get_db()
    cal = db.get_calibration(cal_id)
    if not cal:
        raise HTTPException(status_code=404, detail="Calibration not found")
    return {
        "id": cal.id,
        "name": cal.name,
        "field_type": cal.field_type,
        "field_width": cal.field_width,
        "field_length": cal.field_length,
        "unit": cal.unit,
        "camera_resolution": cal.camera_resolution,
        "marker_points_image": json.loads(cal.marker_points_image or "[]"),
        "marker_points_field": json.loads(cal.marker_points_field or "[]"),
        "homography_matrix": json.loads(cal.homography_matrix or "[]"),
        "notes": cal.notes,
        "created_at": cal.created_at.isoformat() if cal.created_at else "",
    }


active_run_id: Optional[int] = None


@router.post("/runs/start")
def start_run(req: RunStartRequest):
    global active_run_id
    db = get_db()
    run_id = db.save_run({
        "name": req.name,
        "driver": req.driver,
        "robot_config": req.robot_config,
        "practice_type": req.practice_type,
        "calibration_profile_id": req.calibration_profile_id,
        "notes": req.notes,
    })
    active_run_id = run_id
    return {"status": "ok", "run_id": run_id}


@router.post("/runs/stop")
def stop_run(req: RunStopRequest):
    global active_run_id
    if active_run_id is None:
        raise HTTPException(status_code=400, detail="No active run")
    db = get_db()
    db.update_run(active_run_id, {"summary_metrics_json": req.summary_metrics})
    run_id = active_run_id
    active_run_id = None
    return {"status": "ok", "run_id": run_id}


@router.get("/runs")
def list_runs():
    db = get_db()
    runs = db.get_runs()
    result = []
    for r in runs:
        metrics = {}
        try:
            metrics = json.loads(r.summary_metrics_json or "{}")
        except json.JSONDecodeError:
            pass
        result.append({
            "id": r.id,
            "name": r.name,
            "driver": r.driver,
            "robot_config": r.robot_config,
            "practice_type": r.practice_type,
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "duration_s": metrics.get("duration_s", 0),
            "max_speed_ft_per_s": metrics.get("max_speed_ft_per_s", 0),
            "avg_moving_speed_ft_per_s": metrics.get("avg_moving_speed_ft_per_s", 0),
            "peak_estimated_g": metrics.get("peak_estimated_g", 0),
            "total_distance_ft": metrics.get("total_distance_ft", 0),
            "time_moving_s": metrics.get("time_moving_s", 0),
            "time_stopped_s": metrics.get("time_stopped_s", 0),
            "sample_count": metrics.get("sample_count", 0),
        })
    return result


@router.get("/runs/{run_id}")
def get_run(run_id: int):
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    metrics = {}
    try:
        metrics = json.loads(run.summary_metrics_json or "{}")
    except json.JSONDecodeError:
        pass
    return {
        "id": run.id,
        "name": run.name,
        "driver": run.driver,
        "robot_config": run.robot_config,
        "practice_type": run.practice_type,
        "created_at": run.created_at.isoformat() if run.created_at else "",
        "notes": run.notes,
        "summary_metrics": metrics,
    }


@router.get("/runs/{run_id}/samples")
def get_run_samples(run_id: int, limit: int = 0, offset: int = 0):
    db = get_db()
    samples = db.get_samples(run_id)
    if limit > 0:
        samples = samples[offset:offset + limit]
    return [
        {
            "timestamp": s.timestamp,
            "frame_number": s.frame_number,
            "field_x": s.field_x,
            "field_y": s.field_y,
            "speed": s.speed,
            "acceleration": s.acceleration,
            "estimated_g": s.estimated_g,
            "confidence": s.confidence,
            "state": s.state,
        }
        for s in samples
    ]


@router.get("/runs/{run_id}/summary")
def get_run_summary(run_id: int):
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    metrics = {}
    try:
        metrics = json.loads(run.summary_metrics_json or "{}")
    except json.JSONDecodeError:
        pass
    return metrics


@router.get("/runs/{run_id}/export.csv")
def export_run_csv(run_id: int):
    db = get_db()
    samples = db.get_samples(run_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "timestamp", "frame_number", "pixel_x", "pixel_y",
        "field_x", "field_y", "speed", "acceleration",
        "estimated_g", "confidence", "state",
    ])
    for s in samples:
        writer.writerow([
            s.timestamp, s.frame_number, s.pixel_x, s.pixel_y,
            s.field_x, s.field_y, s.speed, s.acceleration,
            s.estimated_g, s.confidence, s.state,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=run_{run_id}.csv"},
    )


@router.get("/runs/{run_id}/export.json")
def export_run_json(run_id: int):
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    samples = db.get_samples(run_id)
    return {
        "run": {
            "id": run.id,
            "name": run.name,
            "driver": run.driver,
            "robot_config": run.robot_config,
            "practice_type": run.practice_type,
            "created_at": run.created_at.isoformat() if run.created_at else "",
            "notes": run.notes,
        },
        "samples": [
            {
                "timestamp": s.timestamp,
                "frame_number": s.frame_number,
                "pixel_x": s.pixel_x,
                "pixel_y": s.pixel_y,
                "field_x": s.field_x,
                "field_y": s.field_y,
                "speed": s.speed,
                "acceleration": s.acceleration,
                "estimated_g": s.estimated_g,
                "confidence": s.confidence,
                "state": s.state,
            }
            for s in samples
        ],
    }


@router.post("/runs/{run_id}/events")
def create_event(run_id: int, req: EventCreateRequest):
    db = get_db()
    event_id = db.save_event({
        "run_id": run_id,
        "timestamp": datetime.now(timezone.utc).timestamp(),
        "event_type": req.event_type,
        "label": req.label,
        "notes": req.notes,
    })
    return {"status": "ok", "event_id": event_id}


@router.delete("/runs/{run_id}")
def delete_run(run_id: int):
    db = get_db()
    run = db.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    db.delete_run(run_id)
    return {"status": "ok", "run_id": run_id}


@router.get("/runs/{run_id}/events")
def list_events(run_id: int):
    db = get_db()
    events = db.get_events(run_id)
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "event_type": e.event_type,
            "label": e.label,
            "notes": e.notes,
        }
        for e in events
    ]


@router.get("/settings")
def get_settings():
    import os
    from pathlib import Path
    settings_path = Path(__file__).parent.parent.parent / "data" / "settings.json"
    from ..settings.app_settings import AppSettings
    settings = AppSettings.load(str(settings_path))
    return {
        "camera_id": settings.camera_id,
        "camera_resolution_width": settings.camera_resolution_width,
        "camera_resolution_height": settings.camera_resolution_height,
        "tracking_mode": settings.tracking_mode,
        "target_marker_id": settings.target_marker_id,
        "marker_offset_x": settings.marker_offset_x,
        "marker_offset_y": settings.marker_offset_y,
        "moving_threshold_ft_per_s": settings.moving_threshold_ft_per_s,
        "moving_min_duration_s": settings.moving_min_duration_s,
        "stopped_threshold_ft_per_s": settings.stopped_threshold_ft_per_s,
        "stopped_min_duration_s": settings.stopped_min_duration_s,
        "tracking_lost_timeout_s": settings.tracking_lost_timeout_s,
        "smoothing_window": settings.smoothing_window,
        "color_lower_h": settings.color_lower_h,
        "color_lower_s": settings.color_lower_s,
        "color_lower_v": settings.color_lower_v,
        "color_upper_h": settings.color_upper_h,
        "color_upper_s": settings.color_upper_s,
        "color_upper_v": settings.color_upper_v,
        "networktables_server": settings.networktables_server,
        "networktables_port": settings.networktables_port,
        "networktables_enabled": settings.networktables_enabled,
        "yolo_model_path": settings.yolo_model_path,
        "target_marker_ids": settings.target_marker_ids,
    }


@router.post("/settings")
def update_settings(req: SettingsUpdateRequest):
    import os
    from pathlib import Path
    settings_path = Path(__file__).parent.parent.parent / "data" / "settings.json"
    from ..settings.app_settings import AppSettings
    settings = AppSettings.load(str(settings_path))
    update_data = req.model_dump(exclude_none=True)
    for key, value in update_data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    settings.save()
    return {"status": "ok"}


active_connections: list[WebSocket] = []


@router.websocket("/ws/live-tracking")
async def live_tracking(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)


async def broadcast_tracking(data: dict):
    for conn in active_connections:
        try:
            await conn.send_json(data)
        except Exception:
            pass
