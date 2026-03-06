

## Assessment Types Framework

### Current State
The platform has a single assessment type: **Standard Maturity Assessment** — a set of Likert-scale questions grouped by dimensions, scored as-is and to-be, producing gap analysis and a prioritisation matrix.

### Proposed Assessment Types

Beyond the two you described, here are additional types that fit well in a consulting context:

#### 1. **Standard Assessment** (existing)
Questions grouped by dimensions, each scored on a configurable scale. Results in radar charts, gap analysis, and prioritisation matrix.

#### 2. **Use Case Assessment** (your idea)
A configurable list of use cases (e.g. "Automated Invoice Processing", "Predictive Maintenance"), each evaluated against the same set of questions (e.g. "Business value", "Technical feasibility", "Data readiness"). Results feed directly into a prioritisation matrix where each use case is an item, positioned by composite scores on effort vs value axes. The assessment creator defines both the use case list and the evaluation criteria.

#### 3. **Comparative / Vendor Assessment**
Similar to Use Case but for comparing options — vendors, platforms, solutions. Each option is scored against weighted evaluation criteria. Results produce a ranked comparison table and a spider/radar overlay chart.

#### 4. **Process Assessment**
Evaluate a set of business processes against standard criteria (efficiency, automation level, risk, customer impact). Each process becomes a row, each criterion a column. Results show a heat map and identify processes ripe for transformation.

#### 5. **Checklist / Compliance Assessment**
Binary or traffic-light (Red/Amber/Green) responses against a set of compliance requirements or readiness criteria. Results show completion percentage, compliance gaps, and a categorised action list. Useful for governance reviews, audit readiness, or go-live checklists.

### Implementation Plan

**1. Database changes**
- Add `assessment_type` column to `assessment_templates` (enum or text: `standard`, `use_case`, `comparative`, `process`, `checklist`)
- Create `assessment_items` table for use cases / vendors / processes — linked to template, with fields: `id`, `template_id`, `title`, `description`, `order_index`, `metadata_json`
- Add `item_id` (nullable) to `assessment_responses` to link a response to a specific item

**2. Assessment Builder updates**
- Add a type selector when creating a new template
- For `use_case` / `comparative` / `process` types: show an "Items" management section where the creator defines the list of use cases/vendors/processes
- For `checklist` type: configure response format as binary or RAG instead of Likert
- All types retain the existing question/dimension builder, plus optional explanation text and free-text toggle per question

**3. Assessment Taking updates**
- For item-based types: render an item-by-item flow where each item shows the full question set
- Progress tracking accounts for items × questions
- For checklist: render toggle/RAG selectors instead of Likert scales

**4. Results & Visualisation updates**
- For `use_case` / `comparative` / `process`: auto-generate prioritisation matrix with items as initiatives, composite question scores mapped to effort/impact axes
- For `comparative`: add ranked comparison table and overlaid radar chart
- For `checklist`: show compliance percentage dashboard and gap list
- Existing standard assessment results remain unchanged

**5. Files to modify**
- `supabase/migrations/` — new migration for schema changes
- `src/components/assessments/AssessmentBuilder.tsx` — type selector, items editor
- `src/pages/AssessmentTake.tsx` and `src/pages/AssessmentRespond.tsx` — item-based flow
- `src/components/assessments/AssessmentResults.tsx` — type-aware visualisations
- `src/components/canvas/PrioritisationMatrix.tsx` — accept item-based composite scores

This is a significant feature. I would recommend implementing it incrementally, starting with the **Use Case Assessment** type as the second type alongside the existing standard, then extending to the others.

