import { CHUNK_SIZE } from "./uploadConstants";
import type { ChunkUploadResponse, UploadProgress } from "./uploadTypes";

export async function uploadVideoInChunks(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = crypto.randomUUID();

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("uploadId", uploadId);
    formData.append("fileName", file.name);
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));

    const res = await fetch("/api/upload-chunk", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(errorData?.error || `Chunk ${chunkIndex + 1} failed`);
    }

    const data = (await res.json()) as ChunkUploadResponse;

    onProgress?.({
      uploadedChunks: chunkIndex + 1,
      totalChunks,
      percent: Math.round(((chunkIndex + 1) / totalChunks) * 100),
    });

    if (data.done) {
      if (!data.sourceId) {
        throw new Error("Upload completed but no sourceId was returned.");
      }

      return data.sourceId;
    }
  }

  throw new Error("Upload did not complete.");
}