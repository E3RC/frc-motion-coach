import numpy as np
from scipy.signal import savgol_filter
from typing import Optional


class SmoothingFilter:
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self._buffer_x: list[float] = []
        self._buffer_y: list[float] = []

    def add_sample(self, x: float, y: float):
        self._buffer_x.append(x)
        self._buffer_y.append(y)
        if len(self._buffer_x) > self.window_size * 2:
            self._buffer_x.pop(0)
            self._buffer_y.pop(0)

    def smooth_moving_average(self, values: list[float]) -> list[float]:
        if len(values) < self.window_size:
            return values
        cumsum = np.cumsum(np.insert(values, 0, 0))
        return (cumsum[self.window_size:] - cumsum[:-self.window_size]) / self.window_size

    def smooth_savgol(self, values: list[float], window: int = 5, order: int = 2) -> list[float]:
        if len(values) < window:
            return values
        if window % 2 == 0:
            window += 1
        if window < order + 2:
            window = order + 3
        if window > len(values):
            window = len(values) if len(values) % 2 == 1 else len(values) - 1
        if window < order + 2:
            return values
        return savgol_filter(values, window, order).tolist()

    def get_smoothed_position(self) -> Optional[tuple[float, float]]:
        if len(self._buffer_x) < 3:
            return None
        sx = self.smooth_moving_average(self._buffer_x)
        sy = self.smooth_moving_average(self._buffer_y)
        return (sx[-1], sy[-1]) if len(sx) > 0 else None


class KalmanFilter1D:
    def __init__(self, process_noise: float = 0.01, measurement_noise: float = 0.1):
        self.Q = process_noise
        self.R = measurement_noise
        self.x = 0.0
        self.P = 1.0
        self.K = 0.0
        self.initialized = False

    def update(self, measurement: float) -> float:
        if not self.initialized:
            self.x = measurement
            self.initialized = True
            return self.x

        self.P = self.P + self.Q
        self.K = self.P / (self.P + self.R)
        self.x = self.x + self.K * (measurement - self.x)
        self.P = (1 - self.K) * self.P
        return self.x

    def reset(self):
        self.initialized = False
        self.P = 1.0
        self.x = 0.0
