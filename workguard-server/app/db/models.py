from __future__ import annotations

import json
from datetime import date as DateType
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from sqlmodel import Field, SQLModel


class ContractAnalysis(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    original_filename: str
    ocr_text: str

    is_clean: bool
    violation_count: int
    warning_count: int
    normal_count: int
    unknown_count: int

    # JSON 직렬화해서 저장 (분석 항목 10개)
    items_json: str = Field(default="[]")

    model_used: str
    backend_used: str  # mlx | gguf
    elapsed_sec: float

    @property
    def items(self) -> list[dict[str, Any]]:
        return json.loads(self.items_json)

class WorkLog(SQLModel, table=True):
    id: str = Field(default_factory=lambda: uuid4().hex, primary_key=True)
    log_date: DateType = Field(index=True)
    
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    fee: Optional[int] = None
    overtime_hours: float = 0.0
    is_night_shift: bool = False
    is_holiday_work: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    