import cv2
import threading
from dataclasses import dataclass
from typing import Optional


@dataclass
class CameraInfo:
    id: int
    name: str
    backend: str = "USB"


class CameraManager:
    def __init__(self, camera_id: int = 0):
        self.camera_id = camera_id
        self.cap: Optional[cv2.VideoCapture] = None
        self._lock = threading.Lock()
        self._running = False
        self._frame = None
        self._width = 0
        self._height = 0
        self._fps = 30.0

    def open(self) -> bool:
        with self._lock:
            if self.cap is not None:
                self.cap.release()
            self.cap = cv2.VideoCapture(self.camera_id, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                return False
            self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            self._fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
            self._running = True
            return True

    def read(self) -> Optional[cv2.Mat]:
        with self._lock:
            if self.cap is None or not self._running:
                return None
            ret, frame = self.cap.read()
            if not ret:
                return None
            self._frame = frame
            return frame

    def release(self):
        with self._lock:
            self._running = False
            if self.cap:
                self.cap.release()
                self.cap = None

    @property
    def resolution(self) -> tuple[int, int]:
        return self._width, self._height

    @property
    def fps(self) -> float:
        return self._fps

    @staticmethod
    def list_cameras(max_test: int = 10) -> list[CameraInfo]:
        available = []
        for i in range(max_test):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    available.append(CameraInfo(id=i, name=f"Camera {i}"))
                cap.release()
        return available
