import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestAPI:
    def test_status(self, client):
        resp = client.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "name" in data

    def test_list_cameras(self, client):
        resp = client.get("/api/cameras")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_calibration_save(self, client):
        resp = client.post("/api/calibration/save", json={
            "name": "Test",
            "field_type": "half_field",
            "field_width": 27.0,
            "field_length": 27.0,
            "unit": "feet",
            "marker_points_image": [[100, 100], [300, 100], [300, 300], [100, 300]],
            "marker_points_field": [[0, 0], [27, 0], [27, 27], [0, 27]],
            "homography_matrix": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "calibration_id" in data

    def test_list_calibrations(self, client):
        resp = client.get("/api/calibrations")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_run_start_stop(self, client):
        resp = client.post("/api/runs/start", json={
            "name": "Test Run",
            "driver": "Test",
            "practice_type": "Testing",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

        resp = client.post("/api/runs/stop", json={
            "summary_metrics": {"duration_s": 10.0, "max_speed_ft_per_s": 5.0}
        })
        assert resp.status_code == 200

    def test_list_runs(self, client):
        resp = client.get("/api/runs")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_settings(self, client):
        resp = client.get("/api/settings")
        assert resp.status_code == 200
        assert "tracking_mode" in resp.json()

    def test_tracking_reset(self, client):
        resp = client.post("/api/tracking/reset")
        assert resp.status_code == 200
        assert resp.json()["status"] == "reset"
