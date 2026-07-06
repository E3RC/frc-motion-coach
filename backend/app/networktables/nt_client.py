import threading
import json
from dataclasses import dataclass, field
from typing import Optional, Any


@dataclass
class NTConfig:
    server: str = "10.15.55.2"
    port: int = 5810
    app_id: str = "FRC Motion Coach"
    enabled: bool = False


@dataclass
class NTData:
    robot_x: float = 0.0
    robot_y: float = 0.0
    robot_heading: float = 0.0
    robot_speed: float = 0.0
    battery_voltage: float = 0.0
    match_time: float = 0.0
    robot_enabled: bool = False
    has_data: bool = False


class NetworkTablesClient:
    def __init__(self, config: Optional[NTConfig] = None):
        self.config = config or NTConfig()
        self.data = NTData()
        self._connected = False
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._nt = None
        self._lock = threading.Lock()

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def enabled(self) -> bool:
        return self.config.enabled

    def connect(self):
        if not self.config.enabled:
            return
        try:
            from networktables import NetworkTables
            NetworkTables.initialize(server=self.config.server)
            self._nt = NetworkTables
            self._connected = True
            self._running = True
            self._thread = threading.Thread(target=self._poll_loop, daemon=True)
            self._thread.start()
        except ImportError:
            self._connected = False

    def disconnect(self):
        self._running = False
        self._connected = False

    def _poll_loop(self):
        while self._running:
            try:
                table = self._nt.getTable("SmartDashboard")
                with self._lock:
                    self.data.robot_x = table.getNumber("robot_x", 0.0)
                    self.data.robot_y = table.getNumber("robot_y", 0.0)
                    self.data.robot_heading = table.getNumber("robot_heading", 0.0)
                    self.data.robot_speed = table.getNumber("robot_speed", 0.0)
                    self.data.battery_voltage = table.getNumber("battery_voltage", 0.0)
                    self.data.match_time = table.getNumber("Match Time", 0.0)
                    self.data.robot_enabled = table.getBoolean("RobotEnabled", False)
                    self.data.has_data = True
            except Exception:
                self.data.has_data = False
            import time
            time.sleep(0.05)

    def get_data(self) -> dict:
        with self._lock:
            return {
                "connected": self._connected,
                "robot_x": self.data.robot_x,
                "robot_y": self.data.robot_y,
                "robot_heading": self.data.robot_heading,
                "robot_speed": self.data.robot_speed,
                "battery_voltage": self.data.battery_voltage,
                "match_time": self.data.match_time,
                "robot_enabled": self.data.robot_enabled,
                "has_data": self.data.has_data,
            }
