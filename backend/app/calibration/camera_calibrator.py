import cv2
import numpy as np
import os
import json
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class CameraCalibrationData:
    camera_matrix: list
    distortion_coefficients: list
    calibration_date: str = ""
    image_size: list = None
    reprojection_error: float = 0.0

    def __post_init__(self):
        if self.image_size is None:
            self.image_size = [0, 0]


class CameraCalibrator:
    CHESSBOARD_SIZE = (9, 6)
    SQUARE_SIZE_MM = 25.0

    def __init__(self):
        self._calibration: Optional[CameraCalibrationData] = None
        self._calibrated = False

    @property
    def is_calibrated(self) -> bool:
        return self._calibrated

    @property
    def calibration(self) -> Optional[CameraCalibrationData]:
        return self._calibration

    def detect_chessboard(self, frame: np.ndarray) -> tuple[bool, Optional[np.ndarray]]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        ret, corners = cv2.findChessboardCorners(gray, self.CHESSBOARD_SIZE, None)
        if ret:
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
            corners = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            return True, corners
        return False, None

    def calibrate_from_frames(self, frames: list[np.ndarray]) -> CameraCalibrationData:
        objp = np.zeros((self.CHESSBOARD_SIZE[0] * self.CHESSBOARD_SIZE[1], 3), np.float32)
        objp[:, :2] = np.mgrid[0:self.CHESSBOARD_SIZE[0], 0:self.CHESSBOARD_SIZE[1]].T.reshape(-1, 2)
        objp *= self.SQUARE_SIZE_MM

        objpoints = []
        imgpoints = []

        for frame in frames:
            ret, corners = self.detect_chessboard(frame)
            if ret:
                objpoints.append(objp)
                imgpoints.append(corners)

        if len(objpoints) < 5:
            raise ValueError(f"Need at least 5 valid chessboard images, got {len(objpoints)}")

        gray = cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        ret, mtx, dist, rvecs, tvecs = cv2.calibrateCamera(
            objpoints, imgpoints, gray.shape[::-1], None, None
        )

        self._calibration = CameraCalibrationData(
            camera_matrix=mtx.tolist(),
            distortion_coefficients=dist.tolist(),
            calibration_date=__import__("datetime").datetime.now().isoformat(),
            image_size=[w, h],
            reprojection_error=float(ret),
        )
        self._calibrated = True
        return self._calibration

    def undistort(self, frame: np.ndarray) -> np.ndarray:
        if not self._calibrated:
            return frame
        mtx = np.array(self._calibration.camera_matrix)
        dist = np.array(self._calibration.distortion_coefficients)
        h, w = frame.shape[:2]
        new_mtx, roi = cv2.getOptimalNewCameraMatrix(mtx, dist, (w, h), 1, (w, h))
        dst = cv2.undistort(frame, mtx, dist, None, new_mtx)
        x, y, w, h = roi
        return dst[y:y + h, x:x + w]

    def save(self, path: str):
        if self._calibration is None:
            return
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(asdict(self._calibration), f, indent=2)

    def load(self, path: str) -> bool:
        if not os.path.exists(path):
            return False
        with open(path) as f:
            data = json.load(f)
        self._calibration = CameraCalibrationData(**data)
        self._calibrated = True
        return True
