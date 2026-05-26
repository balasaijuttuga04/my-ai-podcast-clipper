export type WordTimestamp = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptSegment = {
  id?: number;
  text: string;
  start: number;
  end: number;
};

export type Highlight = {
  title: string;
  start: number;
  end: number;
  reason: string;
  hook: string;
  score: number;
};

export type RenderedClip = {
  id: string;
  title: string;
  downloadUrl: string;
  start: number;
  end: number;
  reason: string;
};
