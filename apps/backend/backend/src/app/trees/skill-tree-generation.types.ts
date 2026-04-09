export interface GeneratedSkill {
  title: string;
  description: string;
  icon: string;
  parentIndex: number | null;
  youtubeSearchQuery?: string;
}

export type SkillTreeGenerationProgressEvent =
  | {
      type: 'status';
      stage: 'started' | 'streaming' | 'saving';
      message: string;
    }
  | {
      type: 'delta';
      deltaText: string;
      chunkCount: number;
      receivedChars: number;
      skillCountEstimate: number;
    };