import pytest
import os
import tempfile
from app.storage.database import Database


class TestDatabase:
    @pytest.fixture(autouse=True)
    def setup_method(self):
        self.tmp = tempfile.mktemp(suffix=".db")
        self.db = Database(self.tmp)
        yield
        if os.path.exists(self.tmp):
            os.remove(self.tmp)

    def test_save_and_get_calibration(self):
        cal_id = self.db.save_calibration({
            "name": "Test Cal",
            "field_type": "half_field",
            "field_width": 27.0,
            "field_length": 27.0,
            "unit": "feet",
        })
        cal = self.db.get_calibration(cal_id)
        assert cal is not None
        assert cal.name == "Test Cal"
        assert cal.field_type == "half_field"

    def test_list_calibrations(self):
        self.db.save_calibration({
            "name": "Cal 1", "field_type": "full_field",
            "field_width": 54.0, "field_length": 27.0,
        })
        self.db.save_calibration({
            "name": "Cal 2", "field_type": "half_field",
            "field_width": 27.0, "field_length": 27.0,
        })
        cals = self.db.get_calibrations()
        assert len(cals) >= 2

    def test_save_and_get_run(self):
        run_id = self.db.save_run({
            "name": "Test Run",
            "driver": "Alice",
            "robot_config": "Swerve",
            "practice_type": "Driver Practice",
        })
        run = self.db.get_run(run_id)
        assert run is not None
        assert run.name == "Test Run"
        assert run.driver == "Alice"

    def test_list_runs(self):
        self.db.save_run({"name": "Run 1", "driver": "A"})
        self.db.save_run({"name": "Run 2", "driver": "B"})
        runs = self.db.get_runs()
        assert len(runs) >= 2

    def test_save_and_get_samples(self):
        run_id = self.db.save_run({"name": "Sample Run"})
        samples = [
            {"run_id": run_id, "timestamp": 0.0, "frame_number": 0,
             "field_x": 0.0, "field_y": 0.0, "speed": 0.0,
             "acceleration": 0.0, "estimated_g": 0.0, "confidence": 1.0,
             "state": "stopped"},
            {"run_id": run_id, "timestamp": 0.033, "frame_number": 1,
             "field_x": 0.5, "field_y": 0.0, "speed": 15.0,
             "acceleration": 0.0, "estimated_g": 0.0, "confidence": 1.0,
             "state": "moving"},
        ]
        self.db.save_samples(samples)
        retrieved = self.db.get_samples(run_id)
        assert len(retrieved) == 2

    def test_save_and_get_events(self):
        run_id = self.db.save_run({"name": "Event Run"})
        self.db.save_event({
            "run_id": run_id, "timestamp": 1.0,
            "event_type": "note", "label": "Started auto",
        })
        events = self.db.get_events(run_id)
        assert len(events) == 1

    def test_update_run(self):
        run_id = self.db.save_run({"name": "Before"})
        self.db.update_run(run_id, {"name": "After"})
        run = self.db.get_run(run_id)
        assert run.name == "After"
