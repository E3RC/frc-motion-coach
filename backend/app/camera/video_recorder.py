import cv2
import os
import threading
from datetime import datetime
from typing import Optional


class VideoRecorder:
    def __init__(self):
        self._writer: Optional[cv2.VideoWriter] = None
        self._path: str = ""
        self._lock = threading.Lock()
        self._recording = False

    @property
    def is_recording(self) -> bool:
        return self._recording

    @property
    def file_path(self) -> str:
        return self._path

    def start(self, output_dir: str, fps: float = 30.0, resolution: tuple[int, int] = (1280, 720)):
        os.makedirs(output_dir, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self._path = os.path.join(output_dir, f"run_{ts}.mp4")
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        self._writer = cv2.VideoWriter(self._path, fourcc, fps, resolution)
        self._recording = True

    def write_frame(self, frame: cv2.Mat, overlay: Optional[dict] = None):
        if not self._recording or self._writer is None:
            return
        with self._lock:
            display = frame.copy()
            if overlay:
                self._apply_overlay(display, overlay)
            self._writer.write(display)

    def stop(self) -> str:
        with self._lock:
            self._recording = False
            if self._writer:
                self._writer.release()
                self._writer = None
        return self._path

    def _apply_overlay(self, frame: cv2.Mat, data: dict):
        h, w = frame.shape[:2]
        font = cv2.FONT_HERSHEY_SIMPLEX

        overlay_data = {
            "speed": f"Speed: {data.get('speed', 0):.1f} ft/s",
            "accel": f"Accel: {data.get('acceleration', 0):.1f} ft/s²",
            "g": f"G: {data.get('estimated_g', 0):.2f}",
            "state": f"State: {data.get('state', 'unknown')}",
            "pos": f"Pos: ({data.get('field_x', 0):.1f}, {data.get('field_y', 0):.1f})",
        }

        for i, (key, text) in enumerate(overlay_data.items()):
            y = 30 + i * 22
            cv2.putText(frame, text, (10, y), font, 0.5, (0, 191, 255), 1, cv2.LINE_AA)

        marker_id = data.get("marker_id")
        if marker_id is not None:
            mid_text = f"Marker: {marker_id}"
            cv2.putText(frame, mid_text, (10, 30 + len(overlay_data) * 22), font, 0.5, (0, 255, 0), 1, cv2.LINE_AA)

        confidence = data.get("confidence", 0)
        cv2.putText(frame, f"Conf: {confidence:.0%}", (w - 120, 30), font, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(frame, datetime.now().strftime("%H:%M:%S"), (w - 120, h - 10), font, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
