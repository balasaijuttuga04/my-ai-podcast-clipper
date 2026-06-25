export type ChunkUploadResponse = {
  done: boolean;
  uploadedChunk?: number;
  sourceId?: string;
  size?: number;
};

export type UploadProgress = {
  uploadedChunks: number;
  totalChunks: number;
  percent: number;
};