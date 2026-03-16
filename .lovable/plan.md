

# AI-Powered Maturity Dashboard Generator

## What We're Building

A dynamic, client-facing maturity dashboard (like the Automotive AI Maturity page) that can be generated for **any** assessment topic. It combines three data sources with clear provenance tagging:

1. **Proprietary data** -- scores from completed assessments in the platform
2. **AI-researched data** -- AI-generated benchmarks and insights when no assessment data exists
3. **Blended** -- proprietary scores augmented with AI research to fill gaps

Each data point on the dashboard is tagged with its source: `Proprietary`, `Public Research`, or `Blended`.

---

## Architecture

```text
┌─────────────────────────────────────────────────┐
│              Maturity Dashboard Page             │
│  /maturity-dashboards/:id                        │
│                                                  │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Hero    │  │ Snapshot │  │ Capability     │  │
│  │ Banner  │  │ KPIs     │  │ Scoring Cards  │  │
│  └─────────┘  └──────────┘  └────────────────┘  │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Radar Chart  │  │ Recommended Next Moves  │  │
│  └──────────────┘  └─────────────────────────┘  │
│  Each item has: 🏷️ Proprietary | 🌐 Public     │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌────────────────────┐
│ maturity_       │  │ generate-maturity-  │
│ dashboards (DB) │  │ dashboard (Edge Fn) │
│ + _capabilities │  │ AI research +       │
│                 │  │ assessment merge    │
└─────────────────┘  └────────────────────┘
```

---

## Database Changes (2 new tables)

### `maturity_dashboards`
Stores each generated dashboard configuration.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | text | e.g. "Automotive AI Maturity" |
| subtitle | text | |
| topic | text | Search/generation topic |
| industry | text | |
| assessment_instance_id | uuid FK nullable | Link to assessment if exists |
| assessment_template_id | uuid FK nullable | Link to template |
| owner_id | uuid FK auth.users | Creator |
| project_id | uuid FK nullable | |
| hero_style | text | 'navy' / 'gradient' / 'minimal' |
| maturity_bands | jsonb | Configurable band definitions |
| recommended_moves | jsonb | Array of action items |
| snapshot_metrics | jsonb | KPI cards config |
| metadata | jsonb | Branding, export settings |
| created_at / updated_at | timestamptz | |

### `maturity_dashboard_capabilities`
Individual capability/dimension scores with source tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| dashboard_id | uuid FK | |
| name | text | Capability name |
| score | numeric | Current score (1-5) |
| target_score | numeric nullable | To-be target |
| source_type | text | 'proprietary' / 'ai_research' / 'blended' |
| source_detail | text | e.g. "Assessment: Q3 Digital Maturity" or "Gartner 2024" |
| owner | text | Responsible party |
| summary | text | AI or human description |
| dimension_id | uuid FK nullable | Link to assessment_dimensions |
| order_index | int | Display order |
| metadata | jsonb | Extra data, citations |
| created_at | timestamptz | |

RLS: Owner + project members can read/write. Uses existing `can_access_project` for project-linked dashboards.

---

## Edge Function: `generate-maturity-dashboard`

Accepts `{ topic, industry, assessment_instance_id? }` and:

1. If `assessment_instance_id` provided: pulls dimension scores from `assessment_responses`, computes averages per dimension
2. Calls AI (via existing LLM config) with the topic + any existing scores to:
   - Fill gaps for dimensions without data (tagged `ai_research`)
   - Generate executive summary, recommended moves, snapshot KPIs
   - Research public benchmarks for context
3. Returns structured JSON that the frontend saves to the two new tables
4. Each capability gets a `source_type` based on whether it came from assessment data, AI, or both

---

## Frontend Changes

### New Page: `MaturityDashboard.tsx`
Route: `/maturity-dashboards/:id`

Reuses the visual design from `AutomotiveAIMaturity.tsx` but is fully dynamic:
- Hero banner with configurable title/subtitle/industry icon
- Snapshot KPIs (maturity band, priority domain, strongest signal)
- Capability scoring cards -- each shows a source badge (`Proprietary` in purple, `Public Research` in blue, `Blended` in amber)
- Radar chart overlaying proprietary vs. research scores
- Recommended next moves (AI-generated or manually edited)
- Export PDF / Share link (reuse existing `exportToPDF`)

### New Page: `MaturityDashboardList.tsx`
Route: `/maturity-dashboards`

List/grid of all created dashboards with:
- "Create New" button opening a wizard
- Wizard flow: Enter topic + industry → optionally link an assessment → Generate

### Dashboard Creation Wizard
3-step flow:
1. **Topic & Industry** -- text input + industry selector
2. **Data Source** -- choose: "Start from AI research only", "Link existing assessment", or "Both"
3. **Generate** -- calls edge function, shows progress, then redirects to the dashboard

### Assessment Integration
- Add a "Generate Dashboard" button on assessment results pages
- Pre-fills the wizard with assessment data, producing a blended dashboard

### Navigation
- Add "Maturity Dashboards" to sidebar under the Intelligence section (near Benchmarking)

---

## Implementation Sequence

1. Database migration (2 tables + RLS policies)
2. Edge function `generate-maturity-dashboard`
3. Dashboard list page + creation wizard
4. Dynamic dashboard renderer page
5. Assessment results integration (Generate Dashboard button)
6. Sidebar navigation update

---

## Technical Details

- Source tagging uses a simple enum-like text field: `proprietary`, `ai_research`, `blended`
- When an assessment is linked and later updated, users can "Refresh" the dashboard to re-merge scores
- The AI prompt instructs the model to return structured JSON with capabilities, recommendations, and KPIs using tool calling for reliable extraction
- PDF export reuses the existing `exportToPDF` utility targeting the dashboard content div
- Public/shareable dashboards can be enabled later via client portal tokens (same pattern as existing portal)

