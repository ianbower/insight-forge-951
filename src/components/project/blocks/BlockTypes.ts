// Block type definitions for the step page layout system

export type BlockType = 
  | 'heading'
  | 'text' 
  | 'image'
  | 'video'
  | 'divider'
  | 'tool'
  | 'checklist'
  | 'form'
  | 'poll'
  | 'ai-chat'
  | 'deliverables'
  | 'notes'
  | 'assessments';

export interface GridPosition {
  x: number;  // Grid column (0-11 for 12-column grid)
  y: number;  // Grid row
  w: number;  // Width in grid units
  h: number;  // Height in grid units
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
  gridPosition?: GridPosition; // Optional grid position for grid layout mode
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  content: string;
  level: 1 | 2 | 3;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  url: string;
  caption?: string;
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  url: string;
  caption?: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

export interface ToolBlock extends BaseBlock {
  type: 'tool';
  toolName: string;
  embedded: boolean; // true = show inline, false = link to open
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistBlock extends BaseBlock {
  type: 'checklist';
  title: string;
  items: ChecklistItem[];
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  required: boolean;
  options?: string[]; // for select type
  value?: string;
}

export interface FormBlock extends BaseBlock {
  type: 'form';
  title: string;
  fields: FormField[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollBlock extends BaseBlock {
  type: 'poll';
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface AIChatBlock extends BaseBlock {
  type: 'ai-chat';
  contextPrompt?: string;
}

export interface DeliverablesBlock extends BaseBlock {
  type: 'deliverables';
}

export interface NotesBlock extends BaseBlock {
  type: 'notes';
}

export interface AssessmentsBlock extends BaseBlock {
  type: 'assessments';
}

export type StepBlock = 
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | DividerBlock
  | ToolBlock
  | ChecklistBlock
  | FormBlock
  | PollBlock
  | AIChatBlock
  | DeliverablesBlock
  | NotesBlock
  | AssessmentsBlock;

export interface StepLayout {
  blocks: StepBlock[];
  theme?: 'default' | 'minimal' | 'presentation';
}

// Default layout templates
export const DEFAULT_STEP_LAYOUT: StepLayout = {
  blocks: [
    { id: 'heading-1', type: 'heading', order: 0, content: '', level: 1 },
    { id: 'text-1', type: 'text', order: 1, content: '' },
    { id: 'deliverables-1', type: 'deliverables', order: 2 },
    { id: 'notes-1', type: 'notes', order: 3 },
  ],
  theme: 'default'
};

export const LAYOUT_TEMPLATES = {
  discovery: {
    name: 'Discovery Phase',
    description: 'For initial research and stakeholder interviews',
    blocks: [
      { id: 'h1', type: 'heading' as const, order: 0, content: 'Discovery Overview', level: 1 as const },
      { id: 't1', type: 'text' as const, order: 1, content: 'Key objectives for this discovery phase...' },
      { id: 'cl1', type: 'checklist' as const, order: 2, title: 'Key Questions', items: [] },
      { id: 'f1', type: 'form' as const, order: 3, title: 'Stakeholder Interview Notes', fields: [] },
      { id: 'ai1', type: 'ai-chat' as const, order: 4, contextPrompt: 'Help with discovery and research' },
      { id: 'd1', type: 'deliverables' as const, order: 5 },
    ]
  },
  analysis: {
    name: 'Analysis Phase',
    description: 'For SWOT, competitive analysis, data review',
    blocks: [
      { id: 'h1', type: 'heading' as const, order: 0, content: 'Analysis Framework', level: 1 as const },
      { id: 't1', type: 'text' as const, order: 1, content: '' },
      { id: 'tool1', type: 'tool' as const, order: 2, toolName: 'SWOT Analysis', embedded: true },
      { id: 'n1', type: 'notes' as const, order: 3 },
      { id: 'ai1', type: 'ai-chat' as const, order: 4, contextPrompt: 'Help analyze findings' },
      { id: 'd1', type: 'deliverables' as const, order: 5 },
    ]
  },
  strategy: {
    name: 'Strategy Development',
    description: 'For creating strategic recommendations',
    blocks: [
      { id: 'h1', type: 'heading' as const, order: 0, content: 'Strategic Recommendations', level: 1 as const },
      { id: 't1', type: 'text' as const, order: 1, content: '' },
      { id: 'tool1', type: 'tool' as const, order: 2, toolName: 'Business Model Canvas', embedded: true },
      { id: 'cl1', type: 'checklist' as const, order: 3, title: 'Strategic Priorities', items: [] },
      { id: 'p1', type: 'poll' as const, order: 4, question: 'Which priority should we focus on first?', options: [], allowMultiple: false },
      { id: 'd1', type: 'deliverables' as const, order: 5 },
    ]
  },
  implementation: {
    name: 'Implementation',
    description: 'For execution and tracking progress',
    blocks: [
      { id: 'h1', type: 'heading' as const, order: 0, content: 'Implementation Plan', level: 1 as const },
      { id: 't1', type: 'text' as const, order: 1, content: '' },
      { id: 'cl1', type: 'checklist' as const, order: 2, title: 'Action Items', items: [] },
      { id: 'tool1', type: 'tool' as const, order: 3, toolName: 'Transformation Roadmap', embedded: true },
      { id: 'n1', type: 'notes' as const, order: 4 },
      { id: 'd1', type: 'deliverables' as const, order: 5 },
    ]
  },
  presentation: {
    name: 'Client Presentation',
    description: 'Clean layout for presenting to clients',
    blocks: [
      { id: 'h1', type: 'heading' as const, order: 0, content: '', level: 1 as const },
      { id: 't1', type: 'text' as const, order: 1, content: '' },
      { id: 'div1', type: 'divider' as const, order: 2 },
      { id: 'h2', type: 'heading' as const, order: 3, content: 'Key Findings', level: 2 as const },
      { id: 't2', type: 'text' as const, order: 4, content: '' },
      { id: 'd1', type: 'deliverables' as const, order: 5 },
    ]
  }
};
