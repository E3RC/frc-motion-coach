"""SQLite storage: calibration profiles, runs, tracking samples, event markers."""
import json
import os
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, Float, String, Text, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

Base = declarative_base()


class CalibrationProfileModel(Base):
    __tablename__ = "calibration_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    field_type = Column(String(50), nullable=False)
    field_width = Column(Float, nullable=False)
    field_length = Column(Float, nullable=False)
    unit = Column(String(20), default="feet")
    camera_resolution = Column(String(50), default="")
    marker_points_image = Column(Text, default="[]")
    marker_points_field = Column(Text, default="[]")
    homography_matrix = Column(Text, default="")
    notes = Column(Text, default="")


class RunModel(Base):
    __tablename__ = "runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    name = Column(String(255), default="")
    driver = Column(String(255), default="")
    robot_config = Column(String(255), default="")
    practice_type = Column(String(255), default="")
    calibration_profile_id = Column(Integer, nullable=True)
    video_file_path = Column(String(500), default="")
    notes = Column(Text, default="")
    summary_metrics_json = Column(Text, default="{}")


class TrackingSampleModel(Base):
    __tablename__ = "tracking_samples"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)
    frame_number = Column(Integer, default=0)
    pixel_x = Column(Float, default=0.0)
    pixel_y = Column(Float, default=0.0)
    field_x = Column(Float, default=0.0)
    field_y = Column(Float, default=0.0)
    speed = Column(Float, default=0.0)
    acceleration = Column(Float, default=0.0)
    estimated_g = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    state = Column(String(20), default="unknown")


class EventMarkerModel(Base):
    __tablename__ = "event_markers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)
    event_type = Column(String(50), default="")
    label = Column(String(255), default="")
    notes = Column(Text, default="")


class Database:
    def __init__(self, db_path: str = ""):
        if not db_path:
            db_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "data",
                "frc_motion_coach.db",
            )
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.engine = create_engine(f"sqlite:///{db_path}", echo=False)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def get_session(self) -> Session:
        return self.Session()

    def save_calibration(self, data: dict) -> int:
        with self.get_session() as session:
            model = CalibrationProfileModel(**data)
            session.add(model)
            session.commit()
            return model.id

    def get_calibrations(self) -> list:
        with self.get_session() as session:
            return session.query(CalibrationProfileModel).order_by(
                CalibrationProfileModel.created_at.desc()
            ).all()

    def get_calibration(self, cal_id: int) -> Optional[CalibrationProfileModel]:
        with self.get_session() as session:
            return session.query(CalibrationProfileModel).filter_by(id=cal_id).first()

    def save_run(self, data: dict) -> int:
        with self.get_session() as session:
            if "summary_metrics_json" in data and isinstance(
                data["summary_metrics_json"], dict
            ):
                data["summary_metrics_json"] = json.dumps(data["summary_metrics_json"])
            model = RunModel(**data)
            session.add(model)
            session.commit()
            return model.id

    def update_run(self, run_id: int, data: dict):
        with self.get_session() as session:
            if "summary_metrics_json" in data and isinstance(
                data["summary_metrics_json"], dict
            ):
                data["summary_metrics_json"] = json.dumps(data["summary_metrics_json"])
            session.query(RunModel).filter_by(id=run_id).update(data)
            session.commit()

    def get_runs(self) -> list:
        with self.get_session() as session:
            return session.query(RunModel).order_by(
                RunModel.created_at.desc()
            ).all()

    def get_run(self, run_id: int) -> Optional[RunModel]:
        with self.get_session() as session:
            return session.query(RunModel).filter_by(id=run_id).first()

    def save_samples(self, samples: list[dict]):
        with self.get_session() as session:
            for s in samples:
                session.add(TrackingSampleModel(**s))
            session.commit()

    def get_samples(self, run_id: int) -> list:
        with self.get_session() as session:
            return session.query(TrackingSampleModel).filter_by(
                run_id=run_id
            ).order_by(TrackingSampleModel.frame_number).all()

    def save_event(self, data: dict) -> int:
        with self.get_session() as session:
            model = EventMarkerModel(**data)
            session.add(model)
            session.commit()
            return model.id

    def get_events(self, run_id: int) -> list:
        with self.get_session() as session:
            return session.query(EventMarkerModel).filter_by(run_id=run_id).all()
