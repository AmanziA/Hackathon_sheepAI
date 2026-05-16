# CLAUDE.md

Build instructions for Bijeli Najam (working title: Crni Najam), a STR detection tool for Split. 9-hour hackathon MVP.

When editing this codebase: read this file first. Follow the conventions exactly. Do not introduce new dependencies, do not rename design tokens, do not invent new color values. If something is genuinely missing, ask before adding it.

---

## 1. What we're building

A web app that cross-references the official Croatian tourism registry (HTZ public data) against active Airbnb / Booking listings in Split, and surfaces listings that appear on platforms but are not in the registry. Output: a ranked dashboard for inspectors, a public address-lookup tool ("Ivanino zrcalo") for legal renters, and a per-neighborhood loss calculator for the City of Split.

**Framing:** not "AI guesses illegal rentals." Two real public datasets, cross-referenced. The illegal set is what falls in the gap.

**Architecture in one paragraph:** an **investigation agent** with a bounded toolset (max 6 tool calls per listing) examines each candidate, calls deterministic tools (HTZ registry lookup, sudski registar search, pHash compare, geocoding, Croatian text normalization), and emits a structured verdict with a full reasoning trace. Two pipeline stages: **Matching** (slow, deep, produces a durable entity graph) and **Monitoring** (cheap, frequent, watches deltas on known entities). The reasoning trace itself is part of the product, not a debug artifact: inspectors get a defensible chain of evidence, not a black-box score.

## 2. MVP scope (Saturday deliverable)

Five features, in priority order. Build top-down. Do not start feature N before feature N-1 demos cleanly.

### F1. Data + agent pipeline (Python, runs offline before demo)
Scrape accommodation.croatia.hr for Split → write to `registered_units`. Scrape Airbnb + Booking Split → write to `candidate_listings`. Run the **investigation agent** on each candidate → write structured verdicts and full reasoning traces to `entity_links`, `agent_traces`, `flags`. Pre-computed; cached in Supabase by Friday EOD. Section 10 has the full agent spec.

### F2. Inspector dashboard (`/dashboard`)
Ranked list of flagged units (highest confidence first), with a Leaflet map showing flag locations. Filterable by neighborhood and confidence threshold. Click row → opens evidence sheet with the agent trace.

### F3. Evidence card with agent trace (`/dashboard/[flag_id]` or sheet overlay)
Per-flag detail in three stacked panels:
1. **Candidate listing**: Airbnb screenshot, URL, scraped metadata
2. **Agent reasoning trace**: step-by-step what the agent did, which tool it called, what came back, how confidence evolved (the showstopper for technical judges)
3. **Verdict + actions**: final confidence, evidence chain, "Generiraj prijavu" button → downloads PDF formatted for Turistička inspekcija

The trace panel is what makes this defensible. It must show real tool calls with real results, not generated prose.

### F4. Ivanino zrcalo (`/lookup`)
Public address-lookup. Type an address in Split → see flagged listings within 500m, undercut-percentage, and a soft CTA to register with Klub Iznajmljivača. This is the demo-day showstopper for the general audience.

### F5. Loss calculator (`/impact`)
Aggregate view per Split neighborhood: estimated annual fiscal loss (boravišna pristojba + paušalni porez + turistička članarina). Big numbers, neighborhood ranking, simple bar chart.

If you finish all five and have time, do not start new features. Polish the agent trace presentation, fix bugs, prepare the 1-minute video demo.

### Out of scope for Saturday (mention in pitch, do not build)
- Stage 2 Monitoring (delta detection over time): we have one snapshot, not a history. **Fake exactly one compelling delta** for the pitch and label it as such. Section 12.
- Live agent execution on stage: pre-compute traces for our money-shot listings, replay them in the UI. Live agent runs only in Q&A.
- HEP/Vodovod energy-consumption signals: stays in the Tier 3 "where this goes" pitch slide. No demo.

## 3. Tech stack (locked, do not substitute)

### Frontend
- **Next.js 14+** (App Router, TypeScript strict)
- **React 18+**
- **Tailwind CSS 3.4+**
- **shadcn/ui** (Radix primitives + Tailwind)
- **Phosphor Icons** via `@phosphor-icons/react`
- **Leaflet** + `react-leaflet` (free, no API key, OpenStreetMap tiles)
- **Recharts** for any charts
- **Inter** via `next/font/google`

### Backend
- **Supabase** (Postgres + Auth + Storage, all free tier)
- **Python 3.11+** for scrapers and matcher (run locally, push to Supabase)
- **Playwright** for scraping
- **rapidfuzz** for fuzzy string matching
- **imagehash** for perceptual photo hashing (pHash)
- **OpenAI gpt-4o-mini** or **Anthropic Claude Haiku** for tie-breaker reasoning only
- **WeasyPrint** for PDF generation (or `@react-pdf/renderer` if doing client-side)

### Deploy
- **Vercel** for the Next.js app
- **Supabase** managed Postgres + Storage
- Scrapers run on a laptop; do not deploy them. They write directly to Supabase.

## 4. Project setup

```bash
# 1. Create the Next.js app
npx create-next-app@latest bijeli-najam --typescript --tailwind --app --src-dir --import-alias "@/*"
cd bijeli-najam

# 2. shadcn init
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables: YES

# 3. Install core shadcn components (one command)
npx shadcn@latest add button card badge dialog sheet input select table tabs toast tooltip progress separator skeleton

# 4. Other deps
npm install @phosphor-icons/react @supabase/supabase-js @supabase/ssr leaflet react-leaflet recharts
npm install -D @types/leaflet

# 5. Python side (in a separate folder)
mkdir ../bijeli-najam-pipeline && cd ../bijeli-najam-pipeline
python -m venv .venv && source .venv/bin/activate
pip install playwright rapidfuzz imagehash supabase python-dotenv pillow weasyprint
playwright install chromium
```

Environment variables (`.env.local` for Next.js, `.env` for Python):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server only
OPENAI_API_KEY=              # or ANTHROPIC_API_KEY
```

## 5. Design system

The design system is built so the brand can be swapped by editing **one file** (`src/app/globals.css`). Components must reference CSS variables, never hardcoded colors. This is shadcn's pattern; respect it.

### Typography

**Inter** is the only typeface. Loaded via `next/font/google` in `src/app/layout.tsx`:

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

// in <html>: className={inter.variable}
// in tailwind.config: fontFamily.sans = ['var(--font-sans)']
```

Weights used: `400` (body), `500` (UI labels), `600` (headings), `700` (emphasis only). Do not load `300` or `800`+.

Type scale (Tailwind classes only):
- `text-xs` (12px): meta labels, timestamps
- `text-sm` (14px): body, UI text
- `text-base` (16px): default
- `text-lg` (18px): emphasized body
- `text-xl` (20px): card titles
- `text-2xl` (24px): section headings
- `text-3xl` (30px): page titles
- `text-5xl` (48px): stat numbers (impact page)

Tracking: tighten headings slightly. `tracking-tight` on `text-2xl` and above.

### Color tokens (CSS variables, neutral start)

Put all of these in `src/app/globals.css` under `@layer base`. They follow shadcn convention. Rebrand by editing this block only.

```css
@layer base {
  :root {
    /* Surfaces */
    --background: 0 0% 100%;
    --foreground: 240 10% 8%;

    /* Cards / elevated surfaces */
    --card: 0 0% 100%;
    --card-foreground: 240 10% 8%;

    /* Popover */
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 8%;

    /* Primary (brand accent — placeholder, replace when branding is final) */
    --primary: 240 5% 12%;
    --primary-foreground: 0 0% 100%;

    /* Secondary */
    --secondary: 240 5% 96%;
    --secondary-foreground: 240 10% 8%;

    /* Muted */
    --muted: 240 5% 96%;
    --muted-foreground: 240 4% 46%;

    /* Accent (hover, subtle highlight) */
    --accent: 240 5% 96%;
    --accent-foreground: 240 10% 8%;

    /* Status colors — domain-specific, used directly */
    --destructive: 0 72% 45%;       /* flagged / illegal */
    --destructive-foreground: 0 0% 100%;
    --success: 142 45% 38%;          /* matched / legal */
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;           /* review queue */
    --warning-foreground: 240 10% 8%;

    /* Borders & inputs */
    --border: 240 6% 90%;
    --input: 240 6% 90%;
    --ring: 240 5% 12%;

    --radius: 0.5rem;
  }

  .dark {
    /* Dark mode tokens — keep parity but invert. Skip on hackathon day if time is tight. */
  }
}
```

When Marija finalizes branding (Thursday in Figma):
1. Replace `--primary` HSL values with the brand color
2. Tweak `--background`, `--foreground` if going warm/cool
3. Adjust `--radius` if branding calls for sharper or softer corners
4. Everything else updates automatically

### Icons (Phosphor only)

Import per icon from `@phosphor-icons/react`. Use the **"regular"** weight by default. Use `weight="bold"` only for active states or emphasis. Never use `weight="fill"` unless it's a status indicator.

```tsx
import { MapPin, WarningCircle, CheckCircle, FilePdf } from "@phosphor-icons/react";
```

Standard sizes:
- `size={16}` for inline with text
- `size={20}` for buttons
- `size={24}` for navigation
- `size={32}+` for empty states or feature illustrations

Domain icon mapping (use these consistently):

| Concept | Icon | Weight |
|---|---|---|
| Search / lookup | `MagnifyingGlass` | regular |
| Map / location | `MapPin` | regular |
| Flagged unit | `WarningCircle` | regular (fill on destructive bg) |
| Legal / matched | `CheckCircle` | regular (fill on success bg) |
| Generate PDF | `FilePdf` | regular |
| Building / property | `Buildings` | regular |
| Aggregate stats | `ChartBar` | regular |
| Dashboard | `ListChecks` | regular |
| Evidence / inspect | `Eye` | regular |
| Filter | `FunnelSimple` | regular |
| Time / temporal | `Clock` | regular |
| Confidence high | `ShieldCheck` | regular |
| Confidence low | `ShieldWarning` | regular |
| External link | `ArrowSquareOut` | regular |
| Close / dismiss | `X` | regular |
| Settings | `GearSix` | regular |

Agent tool icon mapping (used in `ToolCallStep` headers, keep one icon per tool name):

| Tool name | Icon | Notes |
|---|---|---|
| `search_htz_registry` | `MagnifyingGlass` | the kvart-narrowing call |
| `get_htz_listing` | `FileText` | fetches one full HTZ row |
| `search_sudski_registar` | `Briefcase` | company / business operator lookup |
| `phash_compare` | `Image` | photo similarity |
| `geocode` | `MapPin` | address fragment → lat/lon |
| `normalize_croatian` | `TextAa` | string preprocessing |
| (agent's final verdict) | `Gavel` | shown on the verdict panel header |

### Spacing & layout

- Container: `max-w-7xl mx-auto px-6` for app pages, `max-w-3xl` for the public lookup page
- Card padding: `p-6` default, `p-4` for compact lists
- Section gaps: `space-y-8` between major sections, `space-y-4` within sections
- Grid gaps: `gap-4` for tight grids, `gap-6` for cards
- Sidebar width: `w-64`

### Component conventions

- Server components by default. Add `"use client"` only when state, refs, or browser APIs are required.
- Co-locate components by feature when feature-specific. Generic / cross-feature goes in `src/components/`.
- shadcn primitives go in `src/components/ui/` (auto-generated by `npx shadcn add`). Do not edit them; if behavior needs to change, wrap them.
- Custom domain components go in `src/components/domain/` (see section 8).

## 6. File structure

```
bijeli-najam/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── layout.tsx          # public-facing shell, lighter chrome
│   │   │   ├── page.tsx            # landing
│   │   │   ├── lookup/
│   │   │   │   └── page.tsx        # Ivanino zrcalo
│   │   │   └── impact/
│   │   │       └── page.tsx        # loss calculator
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # inspector shell, sidebar
│   │   │   ├── page.tsx            # ranked flag list + map
│   │   │   └── [flagId]/
│   │   │       └── page.tsx        # evidence detail
│   │   ├── api/
│   │   │   └── generate-report/
│   │   │       └── route.ts        # PDF generation
│   │   ├── globals.css             # design tokens live here (edit to rebrand)
│   │   └── layout.tsx              # root layout, Inter font
│   ├── components/
│   │   ├── ui/                     # shadcn primitives, do not edit
│   │   └── domain/                 # custom components (see §8)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # browser client
│   │   │   └── server.ts           # server client
│   │   ├── format.ts               # number, currency, date formatters
│   │   ├── geo.ts                  # distance, address normalization
│   │   └── types.ts                # shared TS types matching DB schema
│   └── styles/                     # only if you need anything beyond globals.css (you should not)
└── public/
    └── samples/                    # fallback static data if Supabase is unreachable on demo day
```

Python pipeline (separate repo or `pipeline/` folder, your call):

```
bijeli-najam-pipeline/
├── scrapers/
│   ├── htz_registered.py           # accommodation.croatia.hr
│   ├── airbnb_split.py
│   ├── booking_split.py
│   └── sudski_registar.py          # company lookups (Ladin pattern)
├── tools/                          # deterministic tools the agent can call
│   ├── search_htz_registry.py      # narrow registry by neighborhood + host name
│   ├── get_htz_listing.py          # fetch a single HTZ entry by id
│   ├── search_sudski_registar.py   # company name → OIB, directors, sjedište
│   ├── phash_compare.py            # compare candidate photos against snapshot
│   ├── geocode.py                  # address fragment → lat/lon (Nominatim)
│   └── normalize_croatian.py       # diacritics, case, kvart aliases
├── agents/
│   ├── investigation.py            # main agent: 1 listing → verdict + trace
│   ├── match_decision.py           # sub-agent: candidate + HTZ entry → match?
│   ├── tool_registry.py            # binds tool functions to LLM tool-use schema
│   └── trace_schema.py             # pydantic models for trace steps + verdict
├── matching_stage.py               # batch: iterate candidates, run agent, persist
├── monitoring_stage.py             # delta detection (mocked for demo, see §10)
└── .env
```

The agent code is a separate concern from scrapers. Scrapers produce raw rows. Agents consume those rows + the registered_units snapshot, call deterministic tools, and emit structured traces. The two never overlap.

## 7. Data schema (Supabase Postgres)

Run these as the first migration. Use snake_case for everything.

### `registered_units` (from accommodation.croatia.hr)

```sql
create table registered_units (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'accommodation.croatia.hr',
  name            text not null,
  address         text,
  street          text,
  number          text,
  neighborhood    text,
  city            text not null default 'Split',
  owner           text,
  stars           int,
  beds            int,
  category        text,                 -- "Soba", "Apartman", "Studio apartman", etc
  tourist_board   text default 'Turistička zajednica grada Split',
  url             text,                 -- source URL on HTZ
  lat             double precision,
  lon             double precision,
  raw_address     text,                 -- pre-normalization
  scraped_at      timestamptz not null default now()
);

create index on registered_units (city, neighborhood);
create index on registered_units (lat, lon);
```

### `candidate_listings` (from Airbnb, Booking)

```sql
create table candidate_listings (
  id              uuid primary key default gen_random_uuid(),
  platform        text not null,        -- 'airbnb' | 'booking'
  external_id     text not null,        -- platform's listing id
  title           text not null,
  host_name       text,
  neighborhood    text,
  city            text not null default 'Split',
  approx_lat      double precision,     -- platforms hide exact, this is the pin they show
  approx_lon      double precision,
  url             text not null,
  price_per_night numeric,
  beds            int,
  guests          int,
  photos          jsonb,                -- array of {url, phash}
  scraped_at      timestamptz not null default now(),
  unique (platform, external_id)
);

create index on candidate_listings (city, neighborhood);
create index on candidate_listings (approx_lat, approx_lon);
```

### `entity_links` (durable matching output from Stage 1)

The Matching agent's persistent verdict per candidate. One row per candidate listing. Replace on re-run; do not append.

```sql
create table entity_links (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade unique,
  registered_id       uuid references registered_units(id),  -- null = no match found
  verdict             text not null,        -- 'matched' | 'unmatched' | 'inconclusive'
  confidence          numeric not null,     -- 0.0 (definitely unregistered) → 1.0 (definitely matched)
  match_signals       jsonb not null,       -- {neighborhood, host_name, beds, photo_phash, type} per signal: {fired: bool, score: 0-1, evidence: ...}
  composite_key       jsonb,                -- the normalized {kvart, beds, host_first_name} we matched on
  trace_id            uuid references agent_traces(id),  -- backlink to the full reasoning chain
  matched_at          timestamptz not null default now()
);

create index on entity_links (verdict, confidence);
create index on entity_links (registered_id) where registered_id is not null;
```

### `agent_traces` (the reasoning chain — product, not debug)

Every Matching agent run emits one trace. Every step within the loop is one row in `trace_steps`. The trace is what inspectors see and what gets serialized into the PDF.

```sql
create table agent_traces (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade,
  agent_type          text not null,        -- 'investigation' | 'match_decision' | 'monitoring'
  model               text not null,        -- 'claude-haiku-4-5' | 'gpt-4o-mini'
  step_count          int not null,
  final_verdict       text not null,        -- 'flagged' | 'clear' | 'inconclusive'
  final_confidence    numeric not null,
  final_breakdown     jsonb not null,       -- per-signal contribution to final score
  evidence_chain      jsonb not null,       -- ordered list of evidence refs that the verdict depends on
  total_tokens        int,
  total_cost_usd      numeric,
  started_at          timestamptz not null,
  completed_at        timestamptz not null
);

create table trace_steps (
  id                  uuid primary key default gen_random_uuid(),
  trace_id            uuid references agent_traces(id) on delete cascade,
  step_index          int not null,         -- 0-based order within trace
  tool_called         text not null,        -- 'search_htz_registry', 'phash_compare', etc
  tool_input          jsonb not null,       -- exact arguments passed
  tool_output         jsonb not null,       -- exact result returned
  why                 text not null,        -- agent's stated reason for this call (short)
  updated_hypothesis  text not null,        -- what the agent now believes after this result
  confidence_delta    numeric not null,     -- signed change to running confidence
  duration_ms         int,
  unique (trace_id, step_index)
);

create index on trace_steps (trace_id, step_index);
```

**Hard rule:** every external fact the agent claims in `evidence_chain` must trace back to a `tool_output` in one of its `trace_steps`. No model-produced facts. If a step has no corresponding tool call, it does not appear in the evidence chain. Section 10 covers this in detail.

### `flags` (the actionable subset, current state)

Derived from `entity_links` where verdict = unmatched or confidence < threshold. This is what the dashboard reads. Status reflects inspector workflow.

```sql
create table flags (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade unique,
  entity_link_id      uuid references entity_links(id) on delete cascade,
  trace_id            uuid references agent_traces(id) on delete cascade,
  confidence_unregistered numeric not null,  -- 1 - entity_links.confidence
  status              text not null default 'open',   -- 'open' | 'reviewed' | 'reported' | 'dismissed'
  evidence_pdf_url    text,                  -- Supabase Storage URL after PDF generation
  screenshot_url      text,                  -- archived listing screenshot
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on flags (status, confidence_unregistered desc);
```

### `monitoring_deltas` (Stage 2, mocked for hackathon demo)

Schema is here so Claude Code knows the shape. Only seed one row for the demo (see §12). Do not build the actual delta-detection pipeline this Saturday.

```sql
create table monitoring_deltas (
  id                  uuid primary key default gen_random_uuid(),
  candidate_id        uuid references candidate_listings(id) on delete cascade,
  delta_type          text not null,        -- 'host_changed' | 'beds_changed' | 'listing_disappeared' | 'new_cross_platform' | 'price_jumped' | 'photos_swapped'
  before_value        jsonb,
  after_value         jsonb,
  detected_at         timestamptz not null default now(),
  triage_verdict      text,                 -- 'no_action' | 'reinvestigate' | 'auto_flag'
  triage_reason       text,
  is_mock             boolean not null default false   -- demo data flag, always true on Saturday
);

create index on monitoring_deltas (candidate_id, detected_at desc);
```

### `neighborhoods` (for loss calculator)

```sql
create table neighborhoods (
  slug                text primary key,        -- 'veli-varos', 'spinut', 'znjan'
  name                text not null,           -- 'Veli Varoš'
  city                text not null default 'Split',
  geojson             jsonb,                   -- polygon for map shading (optional)
  flag_count          int not null default 0,  -- denormalized for speed
  registered_count    int not null default 0,
  estimated_annual_loss_eur numeric not null default 0
);
```

## 8. Custom domain components

These are the components Claude Code should build. They live in `src/components/domain/`. Each one is a wrapper or composition of shadcn primitives. Do not duplicate shadcn — wrap.

### `ConfidenceBadge`
Pill showing a 0–100% confidence with color coding. Red ≥70%, amber 40–69%, gray <40%. Uses shadcn `Badge` underneath.

Props: `score: number` (0–1), `size?: "sm" | "md"`

### `ScoreBreakdown`
Vertical list of signals that contributed to the score: address match, photo match, host match. Each row has a Phosphor icon, label, and numeric contribution. Used inside evidence sheet.

### `EvidenceCard`
The per-flag detail view. **Three stacked panels** (see §2 F3 for narrative): (1) candidate listing preview with screenshot, (2) `AgentTrace` showing the reasoning chain, (3) final verdict with confidence + `EvidenceChain` + action buttons. Used in `/dashboard/[flagId]` and as a Sheet overlay on `/dashboard`. The middle panel is the centerpiece — give it the most visual weight.

### `AgentTrace`
Vertical timeline of the investigation agent's steps for a given candidate. Reads from `agent_traces` + `trace_steps`. Header shows `agent_type`, `model`, `step_count`, `final_verdict`. Body is a chronological list of `ToolCallStep` components. Footer shows final confidence breakdown with each contributing signal.

Props: `traceId: string`. Fetches data server-side and passes to a client wrapper for any expand/collapse interactivity.

Visual: use a subtle vertical rail (1px border-left in `--border`) to connect steps. Each step has an icon corresponding to its tool (see icon mapping in §5). Total visual weight: feels like reading a detective's notes, not a debug log.

### `ToolCallStep`
A single row in `AgentTrace`. Compact by default, expandable for full tool input/output JSON. Shows:
- Tool name (mono font, e.g. `search_htz_registry`)
- One-sentence `why` reasoning (the agent's stated reason for calling this tool)
- Short summary of `tool_output` (e.g. "4 candidates found in Spinut")
- `confidence_delta` indicator (+0.12 in success-foreground green, −0.08 in destructive red)
- Expandable raw JSON for `tool_input` and `tool_output`

Props: `step: TraceStep`, `defaultExpanded?: boolean`.

### `EvidenceChain`
Ordered list of the discrete evidence pieces the final verdict depends on. Each item links back to the trace step that produced it (clicking jumps the user up to that step in `AgentTrace`). Used inside `EvidenceCard` final-verdict panel and serialized into the PDF report.

Props: `evidence: EvidenceItem[]`, `onItemClick?: (stepIndex: number) => void`.

**Important:** every item in `EvidenceChain` MUST trace back to a `trace_step.tool_output`. If the agent produced a fact with no tool call backing it, that fact does not appear here. This is the integrity rule. Section 10 enforces it on the backend; this component trusts it.

### `ListingPreview`
Compact card summarizing a candidate listing: title, host, neighborhood, price, platform badge. Used in dashboard list and inside `EvidenceCard`.

### `FlagListItem`
Row in the dashboard table: confidence badge, title, neighborhood, price, last-seen timestamp, action button. Built on shadcn `Table` row.

### `LeafletMap`
Wrapper around `react-leaflet`. Props: `markers: Array<{lat, lon, confidence, id}>`, `onMarkerClick?: (id) => void`. Markers colored by confidence (red/amber/gray). Default center: Split (43.5081, 16.4402), zoom 13.

Must be `"use client"` and dynamically imported to avoid SSR issues:

```tsx
const LeafletMap = dynamic(() => import("@/components/domain/leaflet-map"), { ssr: false });
```

### `StatNumber`
Big number with label beneath. Used on `/impact` page. Props: `value: number`, `label: string`, `format?: "eur" | "count"`, `delta?: number`.

### `NeighborhoodBar`
Single row in the neighborhood ranking: name, count, annual loss, horizontal bar. Built on shadcn `Progress`.

### `AddressLookup`
The input for Ivanino zrcalo. Croatian-address autocomplete (start simple: just text input + nominatim geocoding on submit). On submit, queries flagged listings within 500m of geocoded result.

### `EmptyState`
Reusable empty state with Phosphor illustration icon, headline, body, optional CTA. Use everywhere a list could be empty.

### `AppShell` (`src/components/domain/app-shell.tsx`)
Inspector dashboard layout: sidebar with nav, content area, optional right-side Sheet for evidence detail.

### `PublicShell` (`src/components/domain/public-shell.tsx`)
Lighter shell for public pages. Just a top bar with logo + minimal nav.

## 9. Pages

### `/` — Landing
One screen. Headline ("Bijeli Najam: izravnavamo teren za legalne iznajmljivače"), short paragraph, two CTAs: "Provjeri svoju adresu" (→ `/lookup`) and "Vidi učinak" (→ `/impact`). Inspector dashboard link is subtle (footer or top-right).

### `/lookup` — Ivanino zrcalo
Centered, simple. AddressLookup at top. On submit, geocode, then render: count of flagged listings within 500m, average price undercut, optional small inline map. Single CTA at bottom: "Pridruži se Klubu Iznajmljivača Hrvatske" (external link, no integration needed).

### `/impact` — Loss calculator
Title, three big StatNumbers across the top (total flagged units in Split, estimated annual loss, neighborhoods affected). Below: NeighborhoodBar list, sorted by loss descending. Small footnote explaining methodology.

### `/dashboard` — Inspector view
AppShell. Top: filter bar (neighborhood select, confidence threshold slider, search). Main split: ~60% width FlagListItem list, ~40% LeafletMap. Click any row → opens EvidenceCard as a Sheet on the right (with full agent trace).

### `/dashboard/[flagId]` — Evidence detail (alternative direct route)
Same EvidenceCard but full-page (three-panel layout: listing → agent trace → verdict). Useful for sharing a direct link and for the demo "click into one specific flag" moment.

## 10. Backend pipeline

The Python scripts run **once before the hackathon** (Thursday and Friday) and populate Supabase. The Next.js app reads from Supabase. No live scraping during the demo. Agent traces are pre-computed for the listings we plan to walk through on stage; a small subset can be re-run live in Q&A.

### Two stages, separate concerns

**Stage 1 — Matching** (slow, deep, runs once before demo): batch reconciliation. For each `candidate_listing`, the investigation agent runs its bounded loop, calls tools, decides verdict. Persists `entity_links` + `agent_traces` + `trace_steps`. The output is a durable entity graph: this candidate ↔ that registered unit, with full receipts. Re-running re-derives, it doesn't append.

**Stage 2 — Monitoring** (mocked for hackathon, real in production): cheap, frequent delta detection on the entity graph. Watches for listing-side changes (host changed, beds increased, listing disappeared, cross-platform clone) and registry-side changes (registration revoked, new registration that might match a previously-unmatched candidate). Kicks back into Stage 1 when an entity's identity becomes uncertain.

**Do not collapse these into a single pipeline.** Stage 1 is a batch reconciliation problem. Stage 2 is a change-detection problem. They share the entity graph; they share nothing else.

### Stage 0 — Scraping (prerequisite)

1. `scrapers/htz_registered.py`: scrape accommodation.croatia.hr for Split, pages: `/en-gb/private-rooms/split/`, `/en-gb/apartments/split/`, `/en-gb/holiday-houses/split/`. Write to `registered_units`. Throttle to 1 req/sec. Identify in User-Agent.

2. `scrapers/airbnb_split.py`: Playwright headless. Bounding box for Split. Paginate. Extract listing card fields + open each listing to get photos (first 3 only) and host first name. Write to `candidate_listings`. Throttle, randomize User-Agent.

3. `scrapers/booking_split.py`: same shape, easier site. **Also extract any business name visible on the listing** — store on `candidate_listings.host_name` if it's a company.

4. `scrapers/sudski_registar.py`: invoked on-demand by the agent's `search_sudski_registar` tool, not as a bulk scrape. Caches lookups locally so repeated calls during the same batch are free.

### The agent toolset (Stage 1)

Six tools. Fixed. The agent picks which to call and in what order, but cannot call anything else. Implementations are in `pipeline/tools/`. Each tool is a pure function: same input → same output → easy to cache.

```python
# tools/search_htz_registry.py
def search_htz_registry(neighborhood: str, host_first_name: str | None = None, beds: int | None = None) -> list[HtzCandidate]:
    """Narrow registered_units to a kvart, optionally filter by host first name (fuzzy) and bed count (exact).
    Returns 0-N candidates. This is the primary 'is there a registered unit that could be this?' tool."""

# tools/get_htz_listing.py
def get_htz_listing(registered_id: UUID) -> HtzListing:
    """Fetch full row from registered_units. Use after search returns candidates to inspect details."""

# tools/search_sudski_registar.py
def search_sudski_registar(company_name: str) -> SudskiRegistarResult:
    """Look up a business in the public court registry. Returns OIB, directors, registered seat, or None.
    Used when a Booking listing shows a business name."""

# tools/phash_compare.py
def phash_compare(candidate_photo_phashes: list[str], registered_id: UUID) -> PhotoMatchResult:
    """Compare candidate's photo pHashes against a registered unit's photo set. Returns min Hamming distance
    and a match boolean (distance < 8)."""

# tools/geocode.py
def geocode(address_fragment: str) -> GeocodeResult | None:
    """Nominatim lookup. Used when candidate listing reveals a partial address (rare on Airbnb, sometimes on Booking)."""

# tools/normalize_croatian.py
def normalize_croatian(text: str) -> str:
    """Lowercase, strip diacritics, normalize kvart aliases (Veli Varoš = Veli varos = Old Town = Stari grad).
    Pure helper; agents call it before string comparisons."""
```

### The investigation agent (Stage 1)

`agents/investigation.py`. One agent, one model (Claude Haiku 4.5 or gpt-4o-mini), tool-use enabled.

**Constraints — enforce in code, not just in prompts:**

- **Max 6 tool calls per candidate.** Stop the loop on the 6th call regardless of state. If verdict is still unclear, emit `inconclusive`.
- **No free-form output for facts.** The agent's `tool_input`, `tool_output`, `why`, and `updated_hypothesis` for each step go through pydantic models in `agents/trace_schema.py`. Reject any output that doesn't validate.
- **Every fact in `evidence_chain` must reference a `step_index`.** Validator runs after the loop completes; if any evidence item lacks a step backref, log the trace as `corrupt` and skip it. No exceptions for "the agent was probably right."

**Loop shape:**

```python
async def investigate(candidate: Candidate) -> Trace:
    state = AgentState(candidate=candidate, steps=[], confidence=0.5)
    while len(state.steps) < MAX_STEPS:
        decision = await llm.decide_next_action(state, tools=TOOL_REGISTRY)
        if decision.kind == "final":
            return finalize(state, decision)
        step = await execute_tool(decision.tool, decision.input)
        state.steps.append(step)
        state.confidence = update_confidence(state, step)
    return finalize(state, force_inconclusive=True)
```

**Verdict thresholds (post-loop):**
- `confidence >= 0.8` → `clear` (matched to a registered unit, link persisted)
- `confidence <= 0.2` → `flagged` (no plausible registered match — actionable)
- otherwise → `inconclusive` (needs human review)

`flagged` rows flow into the `flags` table for the dashboard.

### The match-decision sub-agent (Stage 1)

`agents/match_decision.py`. Used by the investigation agent when it needs to decide if a specific HTZ candidate matches the listing being investigated. Narrower problem, narrower toolset, easier to validate.

Single decision: given `(candidate_listing, htz_candidate)`, is it the same property? Output: `{is_match: bool, confidence: 0-1, reasoning: str}`. Max 2 tool calls (`phash_compare`, `normalize_croatian`). Called multiple times per investigation when there are multiple HTZ candidates in a kvart.

### Composite key matching (the actual heuristic)

Airbnb hides exact addresses. So the match is not "address ∈ registry" — it's a constrained fuzzy match on the composite key:

1. **Neighborhood (kvart)** — narrows registry from thousands to dozens. Always required.
2. **Bed count** — strongest discriminator. Mismatch is not automatically illegal (could be expansion beyond rješenje), but it is a signal.
3. **Host first name** — Airbnb shows only first name; HTZ has full name. Fuzzy match on first name within neighborhood candidates.
4. **Property type + room count** — secondary tie-breaker.
5. **Photos (pHash)** — final tie-breaker before vision LLM.

Vision LLM is allowed only as a last resort when pHash is ambiguous (Hamming distance 8–12). Budget cap: 50 vision calls total across the full batch. If you hit the cap, mark the remaining ambiguous cases `inconclusive` and move on.

### Pre-compute strategy for demo

The Saturday demo cannot afford live agent runs at scale (latency + non-determinism risk). Pre-compute, cache, replay:

1. **Thursday evening**: run scrapers, populate `registered_units` and `candidate_listings`.
2. **Friday morning**: run the matching stage on the full candidate set (~1,200 listings). Persist all traces. Budget: 90 minutes wall clock, ~$15 in LLM costs. If it runs longer or costs more, cut to 500 listings.
3. **Friday afternoon**: pick 4–6 **money-shot listings** for the demo. These should be: real flagged cases with rich, surprising traces (e.g., agent caught a photo match against a registered unit under a different name → cross-platform fraud pattern). Mark them in the DB so the dashboard surfaces them first.
4. **Friday evening**: dry-run the demo flow end-to-end on the actual hardware Marija will demo on. Time it. Fix anything that's slow.
5. **Saturday during pitch**: navigate to pre-computed traces. The "live" agent run is reserved for one Q&A moment after the formal pitch ends.

### PDF generation

`/api/generate-report/route.ts`: receives `flag_id`, fetches flag + candidate + entity_link + trace data, renders an HTML template (Croatian, formatted as a complaint to Turistička inspekcija), runs through `@react-pdf/renderer` (simpler than WeasyPrint, server-runtime in Next.js). Returns PDF blob. Store in Supabase Storage, return signed URL.

The PDF must include:
- Header: "Prijava sumnje na neregistrirano pružanje ugostiteljskih usluga"
- Subject: source URL, platform, listing title, scrape timestamp
- Evidence: archived listing screenshot, scraped data table
- **Investigation trace summary**: ordered list of what the agent did, which tools fired, what each returned. This is what makes the report defensible — inspectors can audit the reasoning.
- Footer: timestamp, submitter ("Bijeli Najam · automated detection layer"), legal disclaimer that this is a tip, not a binding determination, human-in-the-loop required for any action.

### Stage 2 — Monitoring (do not build this Saturday)

Schema is in `monitoring_deltas` (§7). Pipeline is `monitoring_stage.py`. For Saturday, **manually insert one mock row** that walks the audience through the pattern (see §12). Build the actual delta detection in a v2.

Reference shape for the v2 build (NOT for Saturday):

```python
# monitoring_stage.py
async def detect_deltas(since: datetime) -> list[Delta]:
    """Compare current snapshot against last snapshot. Emit Delta rows for anything that changed."""

async def triage(delta: Delta) -> TriageVerdict:
    """Monitoring agent: 2 tool calls max. Decide if delta warrants action.
    Most deltas return 'no_action'. Real signal is when delta crosses entity-identity threshold."""
```

## 11. Conventions

### TypeScript
- `strict: true`
- No `any`. Use `unknown` and narrow.
- Shared types in `src/lib/types.ts` should match Supabase schema 1:1.

### Imports
- Use `@/` alias for everything from `src/`
- Import order: React/Next → external libs → internal `@/lib` → internal `@/components` → relative

### Naming
- Files: `kebab-case.tsx`
- Components: `PascalCase`
- Functions / variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- DB columns: `snake_case`

### Styling
- Tailwind utility classes only. No inline `style={}` except for dynamic values (e.g., percentage width on a bar).
- No CSS modules. No styled-components.
- If you need a complex composition of classes, extract a component, not a CSS class.
- Use `cn()` from `@/lib/utils` (added by shadcn init) for conditional classes.

### Croatian-language strings
- All user-facing copy is in Croatian.
- Don't hard-code English placeholder copy that "we'll translate later." Write it in Croatian the first time.
- Diacritics matter. Use ć, č, đ, š, ž correctly: "Veli Varoš", "Splićanin", "Iznajmljivač".

### Loading / empty / error states
Every list, every async page must have three states designed: loading (skeleton), empty (EmptyState component), error (terse message + retry button). No exceptions.

### Accessibility
- Every interactive element needs `aria-label` when icon-only.
- Color is never the only signal. Confidence badges have both color AND text.
- Focus rings are not removed.

## 12. What to fake for demo (and clearly mark as such)

These are not lies if you label them. Standard hackathon practice.

- **Live scraping**: cached snapshot from Thursday/Friday. Note on the about screen "Data snapshot: 14 May 2026".
- **Live agent execution**: pre-computed traces from Friday's batch run. Replay them through the AgentTrace component. In the dashboard, the rows the user clicks during the formal demo are our pre-vetted **money-shot listings** (§10). Save one listing for a true live agent run in Q&A — that's where non-determinism is acceptable and the audience expects it.
- **Stage 2 Monitoring**: we don't have weekly snapshots, so true delta detection isn't possible Saturday. Insert **exactly one** mock-but-plausible `monitoring_deltas` row before the demo. Suggested: a real candidate that's currently `clear` in our entity graph, faked to have changed `host_name` from "Marko" to "Apartments Marko d.o.o." and `beds` from 4 to 8 in the past week. Walk through what the monitoring agent would do with this delta. Label it on screen: "Mock delta — illustrative." Do not lie about this in Q&A.
- **Inspector authentication**: skip. Dashboard is open. Add a faux "Pretvaraj se da si inspektor" toggle in the header if it bothers you.
- **PDF submission to Turistička inspekcija**: the PDF generates and downloads. There's no actual submission endpoint. If asked, say "live integration via DPIA-covered partnership; today we generate the report."
- **Heatmap precision**: aggregated to neighborhood polygons, not parcel-level. This is by design (privacy).
- **Pre-population**: 4–6 specific flagged units pinned to the top of the dashboard for the demo. They should be real flags from the scrape, with real agent traces. Marija should know exactly what each one shows before she gets on stage.

Do NOT fake:
- The TuRegistar / accommodation.croatia.hr ground truth. Use real data.
- The Airbnb / Booking listings. Use real (cached) data.
- The agent traces. Every `tool_called`, `tool_input`, `tool_output` row must be a real call that actually happened. Generated prose passing as a tool result is the one thing that ends this pitch on the spot.
- The confidence breakdown. If a flag has confidence 87%, the contributing signals must be real.
- The number of flagged units shown on `/impact`. Real count, from the real `flags` table.

## 13. Acceptance criteria for "demo-ready"

The demo is ready when all of the following are true:

- [ ] `/` loads in under 2 seconds with no console errors
- [ ] `/lookup` accepts a real Split address (e.g., "Spinčićeva 5"), geocodes it, and shows real flagged listings within 500m
- [ ] `/impact` shows real numbers from Supabase, not placeholders
- [ ] `/dashboard` lists at least 100 real flagged units, sorted by confidence
- [ ] Clicking a flag opens EvidenceCard with the three-panel layout (listing → agent trace → verdict)
- [ ] The agent trace renders correctly: each step shows tool name, why, output summary, confidence delta. Expanding a step shows raw input/output JSON.
- [ ] Money-shot listings (the 4–6 we plan to walk through) have real, surprising, well-formed traces. Each one tells a story when read top to bottom.
- [ ] EvidenceChain items in the verdict panel link back to specific trace steps when clicked
- [ ] One mock `monitoring_deltas` row exists and renders on a designated "monitoring preview" section of the dashboard, clearly labeled as illustrative
- [ ] "Generiraj prijavu" button produces a downloadable PDF in Croatian, formatted correctly, with the investigation trace summary included
- [ ] The map renders, markers are colored by confidence, click works
- [ ] Mobile responsive (Marija will demo on her laptop; backup is her phone)
- [ ] Croatian copy throughout, no English placeholder text
- [ ] No console errors, no broken images, no missing icons
- [ ] One-minute video demo recorded (screen capture with voiceover)

## 14. Time budget (Saturday)

| Hour | Owner | Task |
|---|---|---|
| 0 (10:00) | All | Kickoff, listen to brief, confirm theme fit |
| 1 | Backend | Verify Supabase data is loaded, traces are populated, money-shot listings pinned |
| 1 | Frontend | Boot Next.js, shadcn init, install deps |
| 1 | Marija | Final design tokens in `globals.css`, money-shot listing selection |
| 2–3 | Frontend | AppShell, PublicShell, basic routing |
| 2–3 | Backend | Spot-check 10 random traces for integrity, fix any data issues, seed the one mock monitoring delta |
| 3–4 | Frontend | `/dashboard` list + map (F2) |
| 4 | Marija | EvidenceCard three-panel design, hand to frontend |
| 4–5 | Frontend | EvidenceCard + AgentTrace + ToolCallStep + EvidenceChain (F3) — the centerpiece, give it the time it needs |
| 5 | Backend | PDF generation endpoint working, includes trace summary |
| 6 | Frontend | `/lookup` (F4) |
| 6 | Marija | `/impact` design polished |
| 7 | All | `/impact` (F5), end-to-end demo run, dry-run on Marija's laptop, fix bugs |
| 8 (18:00) | All | Record 1-min video, write project description, submit |

If behind at Hour 5: cut `/impact` and replace with a static screenshot of the design. Loss calculator narrative can live in the deck. **Do not cut F3** — the agent trace IS the technical differentiator. Without it we're a CRUD dashboard.

If ahead by Hour 6: polish the agent trace presentation (animations on step expansion, smooth scroll to evidence chain refs). Do not add features.

## 15. Quick-reference imports

```tsx
// Supabase
import { createClient } from "@/lib/supabase/server";

// shadcn primitives
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Phosphor icons
import { MapPin, WarningCircle, FilePdf, MagnifyingGlass, Eye, ShieldCheck } from "@phosphor-icons/react";

// Domain components
import { ConfidenceBadge } from "@/components/domain/confidence-badge";
import { EvidenceCard } from "@/components/domain/evidence-card";
import { AgentTrace } from "@/components/domain/agent-trace";
import { ToolCallStep } from "@/components/domain/tool-call-step";
import { EvidenceChain } from "@/components/domain/evidence-chain";

// Utils
import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/format";
```

---

**One more rule before you start writing code:** every time you reach for a third-party library not listed in section 3, stop. Either solve it with what's already installed or ask. We're 9 hours from a pitch, not 9 weeks from launch.
