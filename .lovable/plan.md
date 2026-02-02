
# Plan: aXet Consult Platform Documentation Page with PDF Export

## Overview
Create a dedicated Documentation page that displays comprehensive platform documentation and provides a one-click PDF export feature for IT department distribution.

---

## Implementation Steps

### Step 1: Create the Documentation Page Component

**File**: `src/pages/Documentation.tsx`

Create a new page that renders the complete platform documentation in a well-structured, printable format with:

- **Header section** with title, version, and export button
- **Table of Contents** with anchor links to each section
- **Documentation sections**:
  - Executive Summary
  - System Architecture (Frontend, Backend, Security)
  - Core Modules (Projects, Assessments, Tools, Runbooks, AI)
  - Database Schema Overview
  - Edge Functions Reference
  - User Roles & Permissions
  - Deployment & Environment
  - Troubleshooting Guide

The entire documentation will be wrapped in a container with an ID for PDF capture.

---

### Step 2: Add PDF Export Utility Function

**File**: `src/lib/exportUtils.ts`

Add a new function `exportDocumentationToPDF` that:
- Uses jsPDF with multi-page support for long documents
- Captures the documentation container using html2canvas
- Splits content across multiple pages automatically
- Adds headers, footers, and page numbers
- Sets portrait orientation for better readability

```typescript
export async function exportDocumentationToPDF(
  elementId: string, 
  title: string
): Promise<void>
```

---

### Step 3: Add Route and Navigation

**File**: `src/App.tsx`
- Add route: `/documentation` pointing to the Documentation page

**File**: `src/components/layout/AppSidebar.tsx`
- Add navigation item with `FileText` icon under Admin section

---

### Step 4: Documentation Content Structure

The documentation will include these sections with proper styling:

| Section | Content |
|---------|---------|
| **1. Executive Summary** | Platform purpose, key capabilities, target users |
| **2. Technology Stack** | React, Vite, Tailwind, Supabase, key libraries |
| **3. Architecture** | Frontend structure, backend services, data flow |
| **4. Core Modules** | Projects, Assessments, Tools, Runbooks, Expert AI, Research |
| **5. Database Schema** | Key tables, relationships, RLS overview |
| **6. Edge Functions** | API endpoints, authentication, integrations |
| **7. User Roles** | Admin, Practice Leader, Engagement Lead, Member permissions |
| **8. Security** | RLS policies, authentication flow, data protection |
| **9. Deployment** | Environment variables, build process |
| **10. Troubleshooting** | Common issues and solutions |

---

## Technical Details

### PDF Generation Approach
The implementation uses a two-stage approach:
1. **Screen rendering**: Full documentation displayed on page
2. **PDF generation**: When export is clicked:
   - html2canvas captures the content at 2x scale for quality
   - jsPDF creates a multi-page document
   - Content is sliced and distributed across pages
   - Page numbers and footers added to each page

### Styling Considerations
- Print-friendly styles with proper contrast
- Consistent typography hierarchy
- Tables with borders for schema documentation
- Code blocks with monospace font
- Proper spacing for readability

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Documentation.tsx` | Create - Main documentation page |
| `src/lib/exportUtils.ts` | Modify - Add multi-page PDF export function |
| `src/App.tsx` | Modify - Add route |
| `src/components/layout/AppSidebar.tsx` | Modify - Add nav item |

---

## User Experience

1. User navigates to Documentation page via sidebar
2. Full documentation is displayed with table of contents
3. User clicks "Export to PDF" button
4. Loading indicator shows while PDF generates
5. PDF downloads automatically with filename `aXet_Consult_Documentation.pdf`

The PDF will be suitable for printing and offline distribution to IT teams.
