"""FastAPI server: camera, tracking, calibration endpoints, WebSocket broadcasting."""
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
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .api.routes import router, broadcast_tracking, active_run_id
from .storage.database import Database
from .camera.camera_manager import CameraManager
from .camera.video_recorder import VideoRecorder
from .calibration.calibrator import Calibrator
from .calibration.camera_calibrator import CameraCalibrator
from .tracking.tracker import Tracker, TrackingMode
from .tracking.multi_tracker import MultiTracker
from .metrics.calculator import MetricsCalculator, MetricsConfig
from .metrics.heatmap import HeatmapComputer
from .networktables.nt_client import NetworkTablesClient, NTConfig
from .settings.app_settings import AppSettings

app = FastAPI(title="FRC Motion Coach", version="1.0.0-beta.1")

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

VIDEO_DIR = DATA_DIR / "recordings"
VIDEO_DIR.mkdir(exist_ok=True)

settings_path = DATA_DIR / "settings.json"
settings = AppSettings.load(str(settings_path))

db_path = DATA_DIR / "frc_motion_coach.db"
db = Database(str(db_path))

camera_mgr = CameraManager(settings.camera_id)
calibrator = Calibrator()
camera_calibrator = CameraCalibrator()
camera_calibrator.load(str(DATA_DIR / "camera_calibration.json"))

tracker = Tracker()
metrics_config = MetricsConfig(
    moving_threshold_ft_per_s=settings.moving_threshold_ft_per_s,
    stopped_threshold_ft_per_s=settings.stopped_threshold_ft_per_s,
    smoothing_window=settings.smoothing_window,
)
metrics_calc = MetricsCalculator(metrics_config)
multi_tracker = MultiTracker(metrics_config)
video_recorder = VideoRecorder()
heatmap_computer = HeatmapComputer()

nt_client = NetworkTablesClient(NTConfig(
    server=settings.networktables_server,
    port=settings.networktables_port,
    enabled=settings.networktables_enabled,
))

current_H = None
tracking_active = False
frame_number = 0

_MARKER_ID_LIST: list[int] = []


@app.on_event("startup")
async def startup():
    nt_client.connect()


@app.on_event("shutdown")
async def shutdown():
    camera_mgr.release()
    nt_client.disconnect()


def _ensure_camera():
    if camera_mgr.cap is None or not camera_mgr.cap.isOpened():
        return camera_mgr.open()
    return True


def _get_tracking_frame():
    frame = camera_mgr.read()
    if frame is None:
        return None, None

    if camera_calibrator.is_calibrated:
        frame = camera_calibrator.undistort(frame)

    return frame


@app.get("/api/camera/frame.jpg")
async def camera_frame():
    if not _ensure_camera():
        return {"error": "No camera available"}
    frame = _get_tracking_frame()
    if frame is None:
        return {"error": "No frame"}
    _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    from fastapi.responses import Response
    return Response(content=jpeg.tobytes(), media_type="image/jpeg")


@app.get("/api/calibration/detect-markers")
async def detect_markers():
    if not _ensure_camera():
        return {"success": False, "error": "No camera"}
    frame = _get_tracking_frame()
    if frame is None:
        return {"success": False, "error": "No frame"}
    markers = calibrator.detect_aruco_markers(frame)
    return {
        "success": True,
        "markers": [{"id": mid, "x": float(c[0]), "y": float(c[1])} for mid, c in markers],
        "count": len(markers),
    }


@app.get("/api/calibration/preview.jpg")
async def calibration_preview():
    if not _ensure_camera():
        return {"error": "No camera"}
    frame = _get_tracking_frame()
    if frame is None:
        return {"error": "No frame"}
    corners, ids, _ = calibrator.detector.detectMarkers(frame)
    if ids is not None:
        cv2.aruco.drawDetectedMarkers(frame, corners, ids)
    _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
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

    multi_tracker.reset_all()
    return {"status": "tracking_started"}


@app.post("/api/tracking/stop")
async def stop_tracking():
    global tracking_active
    tracking_active = False
    return {"status": "tracking_stopped"}


@app.get("/api/tracking/frame")
async def get_tracking_frame():
    global frame_number, current_H

    if not _ensure_camera():
        return {"success": False, "error": "No camera"}
    frame = _get_tracking_frame()
    if frame is None:
        return {"success": False, "error": "No frame available"}

    multi_tracker.base_tracker.mode = TrackingMode(settings.tracking_mode)
    robot_data = multi_tracker.track(frame, calibrator, current_H)

    frame_number += 1
    timestamp = time.time()

    if robot_data:
        primary = list(robot_data.values())[0]
        asyncio.create_task(broadcast_tracking({
            "timestamp": timestamp,
            "frame_number": frame_number,
            "field_x": primary["field_x"],
            "field_y": primary["field_y"],
            "speed": primary["speed"],
            "acceleration": primary["acceleration"],
            "estimated_g": primary["estimated_g"],
            "confidence": primary["confidence"],
            "state": primary["state"],
            "multi_robot": list(robot_data.values()),
        }))

        if active_run_id is not None:
            for mid, data in robot_data.items():
                db.save_samples([{
                    "run_id": active_run_id,
                    "timestamp": timestamp,
                    "frame_number": frame_number,
                    "pixel_x": 0,
                    "pixel_y": 0,
                    "field_x": data["field_x"],
                    "field_y": data["field_y"],
                    "speed": data["speed"],
                    "acceleration": data["acceleration"],
                    "estimated_g": data["estimated_g"],
                    "confidence": data["confidence"],
                    "state": data["state"],
                }])

            if video_recorder.is_recording:
                overlay = primary if primary else {}
                cv_frame = _get_tracking_frame()
                if cv_frame is not None:
                    video_recorder.write_frame(cv_frame, overlay)

        primary = list(robot_data.values())[0] if robot_data else {}
        return {
            "success": True,
            "field_x": primary.get("field_x", 0),
            "field_y": primary.get("field_y", 0),
            "speed": primary.get("speed", 0),
            "acceleration": primary.get("acceleration", 0),
            "estimated_g": primary.get("estimated_g", 0),
            "confidence": primary.get("confidence", 0),
            "state": primary.get("state", "unknown"),
            "multi_robot": list(robot_data.values()),
        }

    return {"success": False, "error": "No robots detected"}


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


class CalibrateRequest(BaseModel):
    image_points: list[list[float]]
    field_points: list[list[float]]


@app.post("/api/tracking/calibrate")
async def calibrate_from_frame(req: CalibrateRequest):
    global current_H
    result = calibrator.calibrate_from_points(req.image_points, req.field_points)
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
    multi_tracker.reset_all()
    return {"status": "reset"}


# --- Multi-Robot Endpoints ---

@app.get("/api/tracking/robots")
async def get_all_robots():
    return {"robots": multi_tracker.get_all_live_data()}


@app.get("/api/tracking/robot-summaries")
async def get_robot_summaries():
    return {"summaries": multi_tracker.get_all_summaries()}


@app.post("/api/tracking/set-target-markers")
async def set_target_markers(req: dict):
    global _MARKER_ID_LIST
    ids = req.get("marker_ids", [])
    _MARKER_ID_LIST = ids
    multi_tracker.set_target_marker_ids(ids)
    return {"status": "ok", "marker_ids": ids}


# --- Video Recording ---

@app.post("/api/recording/start")
async def start_recording():
    if not _ensure_camera():
        return {"status": "error", "message": "No camera"}
    w, h = camera_mgr.resolution
    video_recorder.start(str(VIDEO_DIR), camera_mgr.fps, (w or 1280, h or 720))
    return {"status": "recording_started", "path": video_recorder.file_path}


@app.post("/api/recording/stop")
async def stop_recording():
    path = video_recorder.stop()
    return {"status": "recording_stopped", "path": path}


# --- Camera Calibration (lens distortion) ---

@app.post("/api/camera-calibration/detect-chessboard")
async def detect_chessboard():
    if not _ensure_camera():
        return {"success": False, "error": "No camera"}
    frame = _get_tracking_frame()
    if frame is None:
        return {"success": False, "error": "No frame"}
    ret, corners = camera_calibrator.detect_chessboard(frame)
    return {"success": ret, "count": len(corners) if corners is not None and ret else 0}


@app.post("/api/camera-calibration/calibrate")
async def run_camera_calibration():
    if not _ensure_camera():
        return {"success": False, "error": "No camera"}
    frames = []
    for _ in range(30):
        frame = _get_tracking_frame()
        if frame is not None:
            frames.append(frame)
    if len(frames) < 5:
        return {"success": False, "error": "Not enough frames"}
    try:
        result = camera_calibrator.calibrate_from_frames(frames)
        camera_calibrator.save(str(DATA_DIR / "camera_calibration.json"))
        return {"success": True, "reprojection_error": result.reprojection_error}
    except ValueError as e:
        return {"success": False, "error": str(e)}


@app.get("/api/camera-calibration/status")
async def camera_calibration_status():
    return {
        "calibrated": camera_calibrator.is_calibrated,
        "calibration": camera_calibrator.calibration,
    }


# --- Heatmap ---

@app.get("/api/heatmap")
async def get_heatmap(run_ids: str = ""):
    ids = [int(x) for x in run_ids.split(",") if x.strip().isdigit()] if run_ids else None
    result = heatmap_computer.compute(db, ids)
    return result


# --- NetworkTables ---

@app.get("/api/networktables/status")
async def nt_status():
    return nt_client.get_data()


@app.post("/api/networktables/connect")
async def nt_connect(req: dict):
    nt_client.config.server = req.get("server", "10.15.55.2")
    nt_client.config.enabled = True
    nt_client.connect()
    return {"status": "connecting"}


@app.post("/api/networktables/disconnect")
async def nt_disconnect():
    nt_client.disconnect()
    return {"status": "disconnected"}
