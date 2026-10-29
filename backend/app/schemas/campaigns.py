"""Pydantic schemas for Campaign Builder, audience previews, voice configs, and lifecycle."""

from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class ConversationStep(BaseModel):
    """Conversation step structure for dialogue guidance."""

    key: str
    text: str


class QuestionItem(BaseModel):
    """Question item specifying structured field to extract during call."""

    field: str
    question: str
    required: bool = True


class RetryPolicy(BaseModel):
    """Retry settings for unanswered or failed outreach calls."""

    max_attempts: int = Field(default=1, ge=1, le=3)
    interval_minutes: int = Field(default=60, ge=5)


class VoiceConfigInput(BaseModel):
    """Configuration model for outbound voice calls."""

    language_mode: Literal["recipient", "fixed"] = "recipient"
    language: str | None = "telugu"
    tone: Literal["Professional", "Friendly", "Formal"] = "Professional"
    opening_message: str
    objective: str
    system_prompt_addendum: str | None = ""
    conversation_steps: list[ConversationStep] = Field(default_factory=list)
    questions_to_collect: list[QuestionItem] = Field(default_factory=list)
    success_condition: str
    fallback_behaviour: str
    retry_policy: RetryPolicy = Field(default_factory=RetryPolicy)
    call_termination: str | None = ""


class WhatsAppConfigInput(BaseModel):
    """Configuration model for WhatsApp outreach."""

    template_name: str = ""
    body: str = ""
    cta_label: str | None = None
    cta_url: str | None = None


class SMSConfigInput(BaseModel):
    """Configuration model for SMS outreach."""

    body: str = ""


class EmailConfigInput(BaseModel):
    """Configuration model for Email outreach."""

    sender_name: str = ""
    subject: str = ""
    body: str = ""
    cta_label: str | None = None
    cta_url: str | None = None


class CampaignCreate(BaseModel):
    """Payload to initiate a new draft campaign."""

    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    product_id: str
    entity_type: Literal["lead", "customer"]
    objective: str = Field(min_length=3)
    test_run_label: str | None = Field(None, max_length=60)


class CampaignUpdate(BaseModel):
    """Payload to update an existing draft/ready campaign."""

    name: str | None = Field(None, min_length=2, max_length=120)
    description: str | None = None
    product_id: str | None = None
    entity_type: Literal["lead", "customer"] | None = None
    objective: str | None = None
    test_run_label: str | None = Field(None, max_length=60)


class CampaignListItem(BaseModel):
    """Summary item for campaign index listing."""

    id: str
    name: str
    product_id: str
    product_name: str
    entity_type: str
    status: str
    test_run_label: str | None = None
    total_recipients: int
    contacted_count: int
    recipient_counts: dict[str, int] = Field(default_factory=dict)
    updated_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignDetail(BaseModel):
    """Detailed view of campaign configuration, audience, and execution state."""

    id: str
    tenant_id: str
    name: str
    description: str | None
    product_id: str
    product_name: str
    entity_type: str
    objective: str
    status: str
    test_run_label: str | None = None
    channels: list[str]
    audience_filter: dict[str, Any] = Field(default_factory=dict)
    include_not_eligible: bool = False
    scoring_run_id: str | None = None
    config_version: int = 0
    created_by: str
    created_at: datetime
    updated_at: datetime
    launched_at: datetime | None = None
    completed_at: datetime | None = None
    current_voice_config: dict[str, Any] | None = None
    recipient_counts: dict[str, int] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class AudienceCandidateItem(BaseModel):
    """Scored candidate evaluated for potential campaign audience inclusion."""

    entity_id: str
    name: str
    phone_masked: str
    language: str
    band: str
    match_score: float
    eligibility: str
    consent: bool
    dnd: bool
    already_selected: bool
    will_be_blocked_reason: str | None = None
    match_id: str | None = None


class AudienceSummaryCounts(BaseModel):
    """Real-time aggregated counts across candidate audience filters."""

    total: int
    by_band: dict[str, int]
    by_eligibility: dict[str, int]
    selectable: int
    would_be_blocked: int


class AudiencePreviewResponse(BaseModel):
    """Response payload for campaign audience preview with pagination and breakdown."""

    candidates: list[AudienceCandidateItem]
    summary: AudienceSummaryCounts
    page: int
    page_size: int
    total: int
    total_pages: int


class AudienceSetRequest(BaseModel):
    """Payload to modify campaign recipient audience."""

    mode: Literal["filter", "manual", "add", "remove"]
    filter: dict[str, Any] | None = None
    entity_ids: list[str] | None = None
    include_not_eligible: bool = False
    confirm_override: bool = False


class CampaignRecipientItem(BaseModel):
    """Individual recipient record inside an active or completed campaign."""

    id: str
    campaign_id: str
    entity_type: str
    entity_id: str
    name: str
    language: str
    match_score: float
    band: str
    eligibility: str
    status: str
    blocked_reason: str | None = None
    tester_scenario: str | None = None
    last_communication_id: str | None = None
    attempts: int = 0
    last_contact_at: datetime | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecipientScenarioUpdate(BaseModel):
    """Payload to assign an expected testing scenario note to a campaign recipient."""

    tester_scenario: str | None = Field(None, max_length=200)


class CampaignLaunchRequest(BaseModel):
    """Strict confirmation payload required to trigger campaign dispatch."""

    confirm: bool
    expected_recipient_count: int


class CampaignLaunchResponse(BaseModel):
    """Response returned upon accepting campaign launch request."""

    message: str
    campaign_id: str
    status: str
    recipient_count: int
    test_mode: bool
    notice: str | None = None
    blocked_estimate: int = 0


class CampaignPreviewRequest(BaseModel):
    """Payload to request non-dispatch rendered voice preview for a recipient."""

    entity_id: str | None = None


class CampaignPreviewResponse(BaseModel):
    """Rendered voice preview showing exact user_data sent to provider."""

    rendered_opening_message: str
    user_data_variables: dict[str, str]
    config_version: int
    validation_report: dict[str, Any]


class CampaignProgress(BaseModel):
    """Live progress counts and blocked reasons breakdown for a campaign."""

    campaign_id: str
    status: str
    total_recipients: int
    counts_by_status: dict[str, int]
    blocked_reasons_breakdown: dict[str, int]
    last_updated: datetime
