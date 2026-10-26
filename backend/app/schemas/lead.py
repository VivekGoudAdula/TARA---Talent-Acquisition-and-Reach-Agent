"""Lead schemas and filter definitions."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class LeadResponse(BaseModel):
    """External lead details returned for authenticated tenant users."""

    id: str
    tenant_id: str
    name: str
    phone: str
    language: str
    city: str
    age: int
    income: float
    segment: str
    consent: bool
    dnd: bool
    source: str
    attributes: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | str

    model_config = ConfigDict(from_attributes=True)
