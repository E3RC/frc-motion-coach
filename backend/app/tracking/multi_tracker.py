from typing import Optional
import numpy as np

from .tracker import Tracker, TrackingMode, TrackingResult
from ..metrics.calculator import MetricsCalculator, MetricsConfig


class RobotTracker:
    def __init__(self, marker_id: int, metrics_config: Optional[MetricsConfig] = None):
        self.marker_id = marker_id
        self.metrics = MetricsCalculator(metrics_config)
        self.current_pos: tuple[float, float] = (0.0, 0.0)
        self.current_speed: float = 0.0
        self.current_accel: float = 0.0
        self.current_g: float = 0.0
        self.current_confidence: float = 0.0
        self.current_state: str = "unknown"
        self.path: list[dict] = []
        self.last_seen: float = 0.0

    def update(self, timestamp: float, field_x: float, field_y: float, confidence: float):
        sample = self.metrics.add_sample(timestamp, field_x, field_y, confidence)
        self.current_pos = (field_x, field_y)
        self.current_speed = sample.speed
        self.current_accel = sample.acceleration
        self.current_g = sample.estimated_g
        self.current_confidence = confidence
        self.current_state = sample.state.value
        self.path.append({"x": field_x, "y": field_y, "t": timestamp})
        self.last_seen = timestamp

    def get_summary(self) -> dict:
        s = self.metrics.compute_summary()
        return {
            "marker_id": self.marker_id,
            "duration_s": s.duration_s,
            "max_speed_ft_per_s": s.max_speed_ft_per_s,
            "avg_moving_speed_ft_per_s": s.avg_moving_speed_ft_per_s,
            "peak_estimated_g": s.peak_estimated_g,
            "total_distance_ft": s.total_distance_ft,
            "time_moving_s": s.time_moving_s,
            "time_stopped_s": s.time_stopped_s,
            "sample_count": s.sample_count,
        }

    def get_live_data(self) -> dict:
        return {
            "marker_id": self.marker_id,
            "field_x": self.current_pos[0],
            "field_y": self.current_pos[1],
            "speed": self.current_speed,
            "acceleration": self.current_accel,
            "estimated_g": self.current_g,
            "confidence": self.current_confidence,
            "state": self.current_state,
        }


class MultiTracker:
    def __init__(self, metrics_config: Optional[MetricsConfig] = None):
        self.base_tracker = Tracker()
        self.metrics_config = metrics_config or MetricsConfig()
        self.robots: dict[int, RobotTracker] = {}
        self._yolo_model = None

    def set_mode(self, mode: TrackingMode):
        self.base_tracker.mode = mode

    def set_color_range(self, lower: tuple[int, int, int], upper: tuple[int, int, int]):
        self.base_tracker.set_color_range(lower, upper)

    def set_marker_offset(self, x: float, y: float):
        self.base_tracker.set_marker_offset(x, y)

    def set_target_marker_ids(self, ids: list[int]):
        self.robots = {mid: RobotTracker(mid, self.metrics_config) for mid in ids}

    def load_yolo(self, model_path: str = "yolov8n.pt"):
        try:
            from ultralytics import YOLO
            self._yolo_model = YOLO(model_path)
        except ImportError:
            raise ImportError("Install ultralytics: pip install ultralytics")

    def track_yolo(self, frame: np.ndarray) -> list[TrackingResult]:
        if self._yolo_model is None:
            return []
        results = self._yolo_model(frame, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                if cls == 0:
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2
                    detections.append(TrackingResult(
                        success=True,
                        pixel_x=cx,
                        pixel_y=cy,
                        confidence=conf,
                        marker_id=cls,
                    ))
        return detections

    def track(self, frame: np.ndarray, calibrator=None, H=None) -> dict[int, dict]:
        if self.base_tracker.mode == TrackingMode.YOLO:
            results = self.track_yolo(frame)
        else:
            corners, ids, _ = self.base_tracker.detector.detectMarkers(frame)
            results = []
            if ids is not None:
                for i, mid in enumerate(ids.flatten()):
                    center = np.mean(corners[i][0], axis=0)
                    results.append(TrackingResult(
                        success=True,
                        pixel_x=float(center[0]),
                        pixel_y=float(center[1]),
                        confidence=0.95,
                        marker_id=int(mid),
                    ))

        output = {}
        for result in results:
            mid = result.marker_id
            if mid not in self.robots:
                self.robots[mid] = RobotTracker(mid, self.metrics_config)

            field_x, field_y = result.pixel_x, result.pixel_y
            if H is not None and calibrator is not None:
                field_x, field_y = calibrator.transform_point(result.pixel_x, result.pixel_y, H)

            field_x += self.base_tracker.marker_offset_x
            field_y += self.base_tracker.marker_offset_y

            import time
            ts = time.time()
            self.robots[mid].update(ts, field_x, field_y, result.confidence)
            output[mid] = self.robots[mid].get_live_data()

        return output

    def get_all_live_data(self) -> list[dict]:
        return [r.get_live_data() for r in self.robots.values() if r.current_confidence > 0]

    def get_all_summaries(self) -> list[dict]:
        return [r.get_summary() for r in self.robots.values()]

    def reset_all(self):
        for r in self.robots.values():
            r.metrics.reset()
            r.path.clear()

    def reset_robot(self, marker_id: int):
        if marker_id in self.robots:
            self.robots[marker_id].metrics.reset()
            self.robots[marker_id].path.clear()
