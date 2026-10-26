"""Product models and eligibility rules schemas."""

from pydantic import BaseModel, ConfigDict, Field


class EligibilityRules(BaseModel):
    """Eligibility gating criteria for financial products."""

    min_income: float = Field(ge=0, default=25000.0)
    min_age: int = Field(ge=18, le=100, default=21)
    max_age: int = Field(ge=18, le=100, default=65)

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    """Product representation returned by the API."""

    id: str
    tenant_id: str
    name: str
    category: str
    description: str
    active: bool = True
    eligibility_rules: EligibilityRules

    model_config = ConfigDict(from_attributes=True)
