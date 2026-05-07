from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.database import get_session
from app.db.models import WorkLog

router = APIRouter(prefix='/work-logs', tags=['work_logs'])

class WorkLogRequest(BaseModel):
    log_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    fee: Optional[int] = None
    overtime_hours: float = 0.0
    is_night_shift: bool = False
    is_holiday_work: bool = False
    
class WorkLogResponse(BaseModel):
    id: str
    log_date: date
    start_time: Optional[str]
    end_time: Optional[str]
    fee: Optional[int]
    overtime_hours: float
    is_night_shift: bool
    is_holiday_work: bool
    
@router.get("/{year}/{month}", response_model=list[WorkLogResponse])
def get_monthly_logs(year: int, month: int, session: Session = Depends(get_session)):
    logs = session.exec(select(WorkLog)).all()
    return [l for l in logs if l.log_date.year == year and l.log_date.month == month]

@router.get("/{year}/{month}/{day}", response_model=WorkLogResponse)
def get_daily_log(year: int, month: int, day: int, session: Session = Depends(get_session)):
    target = date(year, month, day)
    log = session.exec(select(WorkLog).where(WorkLog.log_date == target)).first()
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")
    return log

@router.post("", response_model=WorkLogResponse)
def create_log(body: WorkLogRequest, session: Session = Depends(get_session)):
    log = WorkLog(**body.model_dump())
    session.add(log)
    session.commit()
    session.refresh(log)
    return log

@router.put("/{log_id}", response_model=WorkLogResponse)
def update_log(log_id: str, body: WorkLogRequest, session: Session = Depends(get_session)):
    log = session.get(WorkLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Work log not found")
    for key, value in body.model_dump().items():
        setattr(log, key, value)
    session.add(log)
    session.commit()
    session.refresh(log)
    return log