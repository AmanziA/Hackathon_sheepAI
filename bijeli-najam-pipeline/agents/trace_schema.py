from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Any, Literal, Optional
from datetime import datetime
import uuid


class TraceStep(BaseModel):
    step_index: int
    tool_called: str
    tool_input: dict[str, Any]
    tool_output: dict[str, Any]
    why: str
    updated_hypothesis: str
    confidence_delta: float
    duration_ms: Optional[int] = None

    @field_validator("confidence_delta")
    @classmethod
    def clamp_delta(cls, v: float) -> float:
        return max(-1.0, min(1.0, v))


class EvidenceItem(BaseModel):
    step_index: int
    fact: str
    tool_called: str


class FinalBreakdown(BaseModel):
    neighborhood: float = 0.0
    host_name: float = 0.0
    beds: float = 0.0
    photo_phash: float = 0.0
    type: float = 0.0


class AgentVerdict(BaseModel):
    final_verdict: Literal[
        "flagged",
        "clear",
        "inconclusive",
        "matched",
        "unmatched",
        "no_listings_found",
        "error",
    ]
    final_confidence: float
    final_breakdown: FinalBreakdown
    evidence_chain: list[EvidenceItem]

    @field_validator("final_confidence")
    @classmethod
    def clamp_confidence(cls, v: float) -> float:
        return max(0.0, min(1.0, v))


class AgentTrace(BaseModel):
    id: str = ""
    candidate_id: str
    agent_type: Literal["investigation", "discovery", "match_decision", "monitoring"] = "investigation"
    model: str
    steps: list[TraceStep]
    verdict: AgentVerdict
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    started_at: datetime
    completed_at: datetime

    def validate_evidence_integrity(self) -> bool:
        valid_indices = {s.step_index for s in self.steps}
        for item in self.verdict.evidence_chain:
            if item.step_index not in valid_indices:
                return False
        return True
