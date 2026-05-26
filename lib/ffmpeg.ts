export type CropMode = "center" | "left" | "right";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import type { WordTimestamp } from "./types";
import { createAssSubtitles, wordsForClip } from "./captions";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export async function writeUploadToTemp(file: File, prefix = "upload") {
  const dir = path.join(os.tmpdir(), "ai-podcast-clipper", randomUUID());
  await mkdir(dir, { recursive: true });

  const ext = extensionForFile(file);
  const inputPath = path.join(dir, `${prefix}${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(inputPath, buffer);

  return { dir, inputPath };
}

function extensionForFile(file: File) {
  const nameExt = path.extname(file.name || "").toLowerCase();
  if (nameExt) return nameExt;

  if (file.type.includes("mp4")) return ".mp4";
  if (file.type.includes("mpeg")) return ".mp3";
  if (file.type.includes("mp3")) return ".mp3";
  if (file.type.includes("m4a")) return ".m4a";
  if (file.type.includes("quicktime")) return ".mov";

  return ".bin";
}

export function extractAudio(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("96k")
      .outputOptions(["-ar 16000", "-ac 1"])
      .save(outputPath)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export function renderClip(params: {
  inputPath: string;
  outputPath: string;
  subtitlePath: string;
  start: number;
  end: number;
  isVideo: boolean;
  cropMode?: CropMode;
}) {
  const {
  inputPath,
  outputPath,
  subtitlePath,
  start,
  end,
  isVideo,
  cropMode = "center",
} = params;
const cropX =
  cropMode === "left"
    ? "0"
    : cropMode === "right"
    ? "iw-1080"
    : "(iw-1080)/2";
  const duration = Math.max(1, end - start);

  return new Promise<void>((resolve, reject) => {
    const command = isVideo
      ? ffmpeg(inputPath).seekInput(start).duration(duration)
      : ffmpeg()
          .input("color=c=0x111827:s=1080x1920:r=30")
          .inputOptions(["-f lavfi"])
          .input(inputPath)
          .seekInput(start)
          .duration(duration);

    if (isVideo) {
      // 9:16 vertical output:
      // 1. Scale so the frame covers 1080x1920.
      // 2. Crop the center.
      // 3. Burn ASS subtitles.
      command
        .videoFilters([
  "scale=1080:1920:force_original_aspect_ratio=increase",
  `crop=1080:1920:${cropX}:0`,
  `subtitles='${subtitlePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")}'`
])
        .outputOptions([
          "-map 0:v:0",
          "-map 0:a:0?",
          "-c:v libx264",
          "-preset veryfast",
          "-crf 23",
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
          "-shortest"
        ]);
    } else {
      command
        .outputOptions([
          "-map 0:v:0",
          "-map 1:a:0",
          "-c:v libx264",
          "-preset veryfast",
          "-crf 23",
          "-c:a aac",
          "-b:a 128k",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
          "-shortest"
        ]);
    }

    command
      .save(outputPath)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

function escapeFilterPath(filePath: string) {
  // FFmpeg filter path escaping for Windows and POSIX.
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export async function createSubtitleFile(params: {
  dir: string;
  words: WordTimestamp[];
  start: number;
  end: number;
  title: string;
}) {
  const clipWords = wordsForClip(params.words, params.start, params.end);
  const ass = createAssSubtitles(clipWords, params.title);
  const subtitlePath = path.join(params.dir, `captions-${randomUUID()}.ass`);
  await writeFile(subtitlePath, ass, "utf8");
  return subtitlePath;
}
