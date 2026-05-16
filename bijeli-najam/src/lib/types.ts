export type Verdict = "matched" | "unmatched" | "inconclusive";
export type FlagStatus = "open" | "reviewed" | "reported" | "dismissed";
export type AgentType = "investigation" | "match_decision" | "monitoring";
export type DeltaType =
  | "host_changed"
  | "beds_changed"
  | "listing_disappeared"
  | "new_cross_platform"
  | "price_jumped"
  | "photos_swapped";

export interface RegisteredUnit {
  id: string;
  source: string;
  name: string;
  address: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string;
  owner: string | null;
  stars: number | null;
  beds: number | null;
  category: string | null;
  tourist_board: string | null;
  url: string | null;
  lat: number | null;
  lon: number | null;
  raw_address: string | null;
  scraped_at: string;
}

export interface CandidateListing {
  id: string;
  platform: "airbnb" | "booking";
  external_id: string;
  title: string;
  host_name: string | null;
  neighborhood: string | null;
  city: string;
  approx_lat: number | null;
  approx_lon: number | null;
  url: string;
  price_per_night: number | null;
  beds: number | null;
  guests: number | null;
  photos: Array<{ url: string; phash: string }> | null;
  scraped_at: string;
}

export interface MatchSignal {
  fired: boolean;
  score: number;
  evidence: string;
}

export interface EntityLink {
  id: string;
  candidate_id: string;
  registered_id: string | null;
  verdict: Verdict;
  confidence: number;
  match_signals: {
    neighborhood?: MatchSignal;
    host_name?: MatchSignal;
    beds?: MatchSignal;
    photo_phash?: MatchSignal;
    type?: MatchSignal;
  };
  composite_key: { kvart: string; beds: number | null; host_first_name: string | null } | null;
  trace_id: string | null;
  matched_at: string;
}

export interface AgentTrace {
  id: string;
  candidate_id: string;
  agent_type: AgentType;
  model: string;
  step_count: number;
  final_verdict: "flagged" | "clear" | "inconclusive";
  final_confidence: number;
  final_breakdown: Record<string, number>;
  evidence_chain: EvidenceItem[];
  total_tokens: number | null;
  total_cost_usd: number | null;
  started_at: string;
  completed_at: string;
}

export interface TraceStep {
  id: string;
  trace_id: string;
  step_index: number;
  tool_called: string;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  why: string;
  updated_hypothesis: string;
  confidence_delta: number;
  duration_ms: number | null;
}

export interface EvidenceItem {
  step_index: number;
  fact: string;
  tool_called: string;
}

export interface Flag {
  id: string;
  candidate_id: string;
  entity_link_id: string;
  trace_id: string;
  confidence_unregistered: number;
  status: FlagStatus;
  evidence_pdf_url: string | null;
  screenshot_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  candidate_listings?: CandidateListing;
  agent_traces?: AgentTrace;
}

export interface Neighborhood {
  slug: string;
  name: string;
  city: string;
  geojson: unknown | null;
  flag_count: number;
  registered_count: number;
  estimated_annual_loss_eur: number;
}

export interface MonitoringDelta {
  id: string;
  candidate_id: string;
  delta_type: DeltaType;
  before_value: unknown | null;
  after_value: unknown | null;
  detected_at: string;
  triage_verdict: "no_action" | "reinvestigate" | "auto_flag" | null;
  triage_reason: string | null;
  is_mock: boolean;
}
