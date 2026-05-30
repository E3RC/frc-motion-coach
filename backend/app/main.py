import os
import sys
import json
import asyncio
import time
import cv2
import numpy as np
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .api.routes import router, broadcast_tracking, active_run_id
from .storage.database import Database
from .camera.camera_manager import CameraManager
from .calibration.calibrator import Calibrator
from .tracking.tracker import Tracker
from .metrics.calculator import MetricsCalculator, MetricsConfig
from .settings.app_settings import AppSettings

app = FastAPI(title="FRC Motion Coach", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

settings_path = DATA_DIR / "settings.json"
settings = AppSettings.load(str(settings_path))

db_path = DATA_DIR / "frc_motion_coach.db"
db = Database(str(db_path))

camera_mgr = CameraManager(settings.camera_id)
calibrator = Calibrator()
tracker = Tracker()
metrics_calc = MetricsCalculator(MetricsConfig(
    moving_threshold_ft_per_s=settings.moving_threshold_ft_per_s,
    stopped_threshold_ft_per_s=settings.stopped_threshold_ft_per_s,
    smoothing_window=settings.smoothing_window,
))

current_H = None
tracking_active = False
frame_number = 0


@app.on_event("startup")
async def startup():
    pass


@app.on_event("shutdown")
async def shutdown():
    camera_mgr.release()


def _ensure_camera():
    if camera_mgr.cap is None or not camera_mgr.cap.isOpened():
        return camera_mgr.open()
    return True


@app.get("/api/camera/frame.jpg")
async def camera_frame():
    if not _ensure_camera():
        return {"error": "No camera available"}
    frame = camera_mgr.read()
    if frame is None:
        return {"error": "No frame"}
    _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    from fastapi.responses import Response
    return Response(content=jpeg.tobytes(), media_type="image/jpeg")


@app.post("/api/tracking/start")
async def start_tracking():
    global tracking_active, frame_number, current_H
    if not _ensure_camera():
        return {"status": "error", "message": "No camera available"}
    tracking_active = True
    frame_number = 0

    cal_id = getattr(settings, "calibration_profile_id", None)
    if cal_id:
        cal = db.get_calibration(cal_id)
        if cal and cal.homography_matrix:
            current_H = np.array(json.loads(cal.homography_matrix))

    return {"status": "tracking_started"}


@app.post("/api/tracking/stop")
async def stop_tracking():
    global tracking_active
    tracking_active = False
    return {"status": "tracking_stopped"}


@app.get("/api/tracking/frame")
async def get_tracking_frame():
    import numpy as np

    global frame_number, current_H

    frame = camera_mgr.read()
    if frame is None:
        return {"success": False, "error": "No frame available"}

    result = tracker.track(frame)
    if not result.success:
        return {
            "success": False,
            "error": result.error_message,
            "pixel_x": 0,
            "pixel_y": 0,
            "field_x": 0,
            "field_y": 0,
            "confidence": 0.0,
        }

    field_x, field_y = 0.0, 0.0
    confidence = result.confidence

    if current_H is not None:
        field_x, field_y = calibrator.transform_point(result.pixel_x, result.pixel_y, current_H)
    else:
        field_x, field_y = result.pixel_x, result.pixel_y

    timestamp = time.time()
    sample = metrics_calc.add_sample(timestamp, field_x, field_y, confidence)

    frame_number += 1

    asyncio.create_task(broadcast_tracking({
        "timestamp": timestamp,
        "frame_number": frame_number,
        "pixel_x": result.pixel_x,
        "pixel_y": result.pixel_y,
        "field_x": field_x,
        "field_y": field_y,
        "speed": sample.speed,
        "acceleration": sample.acceleration,
        "estimated_g": sample.estimated_g,
        "confidence": confidence,
        "state": sample.state.value,
    }))

    if active_run_id is not None:
        db.save_samples([{
            "run_id": active_run_id,
            "timestamp": timestamp,
            "frame_number": frame_number,
            "pixel_x": result.pixel_x,
            "pixel_y": result.pixel_y,
            "field_x": field_x,
            "field_y": field_y,
            "speed": sample.speed,
            "acceleration": sample.acceleration,
            "estimated_g": sample.estimated_g,
            "confidence": confidence,
            "state": sample.state.value,
        }])

    return {
        "success": True,
        "pixel_x": result.pixel_x,
        "pixel_y": result.pixel_y,
        "field_x": field_x,
        "field_y": field_y,
        "speed": sample.speed,
        "acceleration": sample.acceleration,
        "estimated_g": sample.estimated_g,
        "confidence": confidence,
        "state": sample.state.value,
    }


@app.get("/api/tracking/summary")
async def get_tracking_summary():
    summary = metrics_calc.compute_summary()
    return {
        "duration_s": summary.duration_s,
        "max_speed_ft_per_s": summary.max_speed_ft_per_s,
        "avg_moving_speed_ft_per_s": summary.avg_moving_speed_ft_per_s,
        "peak_estimated_g": summary.peak_estimated_g,
        "total_distance_ft": summary.total_distance_ft,
        "time_moving_s": summary.time_moving_s,
        "time_stopped_s": summary.time_stopped_s,
        "num_stop_start_events": summary.num_stop_start_events,
        "sample_count": summary.sample_count,
    }


@app.post("/api/tracking/calibrate")
async def calibrate_from_frame(image_points: list[list[float]], field_points: list[list[float]]):
    import numpy as np

    global current_H
    result = calibrator.calibrate_from_points(image_points, field_points)
    if result.success:
        current_H = result.homography_matrix
        return {
            "success": True,
            "reprojection_error": result.reprojection_error,
            "homography": result.homography_matrix.tolist(),
        }
    return {"success": False, "error": result.error_message}


@app.post("/api/tracking/reset")
async def reset_tracking():
    metrics_calc.reset()
    return {"status": "reset"}
