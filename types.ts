export interface PromptSet {
  t2iEn: string;
  t2iZh: string;
  i2vEn: string;
  i2vZh: string;
}

export interface SceneData {
  id: string;
  originalScript: string;
  imageCount: number;
  aiSuggestedCount?: number;
  reasoningEn: string;
  reasoningZh: string;
  prompts: PromptSet[];
  isRegenerating?: boolean;
}

export interface GenerationSettings {
  defaultImageCount: number; // 0 indicates "AI Auto"
  artStyle: string;
  aspectRatio: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface ScriptRow {
  id: string;
  timestamp: string;
  content: string;
  duration?: string;
}

export interface HistoryItem {
  id: string;
  source: 'script' | 'prompt' | 'all' | 'auto'; // script=Input Only, prompt=Results Save, all=Save All, auto=Auto-Gen
  timestamp: number;
  rows: ScriptRow[];
  settings: GenerationSettings;
  scenes: SceneData[];
}