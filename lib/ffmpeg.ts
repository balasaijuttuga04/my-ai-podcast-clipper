import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import os from "os";

import type { WordTimestamp } from "./types";

import {
  createAssSubtitles,
  wordsForClip,
  type CaptionStyle
} from "./captions";

export type CropMode = "center" | "left" | "right";
export type LayoutMode = "normal" | "split-screen";
export type BackgroundVideo = "gameplay" | "minecraft" | "satisfying";

const OUTPUT_WIDTH = 720;
const OUTPUT_HEIGHT = 1280;
const HALF_HEIGHT = 640;

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

function escapeSubtitlePath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

function backgroundPath(backgroundVideo: BackgroundVideo = "gameplay") {
  const fileMap: Record<BackgroundVideo, string> = {
    gameplay: "gameplay.mp4",
    minecraft: "minecraft.mp4",
    satisfying: "satisfying.mp4"
  };

  return path.join(
    process.cwd(),
    "PUBLIC",
    "backgrounds",
    fileMap[backgroundVideo]
  );
}

function cropXForMode(cropMode: CropMode, width = OUTPUT_WIDTH) {
  if (cropMode === "left") return "0";
  if (cropMode === "right") return `iw-${width}`;
  return `(iw-${width})/2`;
}

export function extractAudio(inputPath: string, outputPath: string) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("80k")
      .outputOptions(["-ar 16000", "-ac 1"])
      .save(outputPath)
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export function extractFrame(
  inputPath: string,
  outputPath: string,
  timestamp = 2
) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(timestamp)
      .frames(1)
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
  layoutMode?: LayoutMode;
  backgroundVideo?: BackgroundVideo;
}) {
  const {
    inputPath,
    outputPath,
    subtitlePath,
    start,
    end,
    isVideo,
    cropMode = "center",
    layoutMode = "normal",
    backgroundVideo = "gameplay"
  } = params;

  const cropX = cropXForMode(cropMode);
  const duration = Math.max(1, Math.min(60, end - start));
  const escapedSubtitlePath = escapeSubtitlePath(subtitlePath);

  return new Promise<void>((resolve, reject) => {
    if (layoutMode === "split-screen" && isVideo) {
      ffmpeg()
        .input(inputPath)
        .seekInput(start)
        .duration(duration)
        .input(backgroundPath(backgroundVideo))
        .inputOptions(["-stream_loop -1"])
        .duration(duration)
        .complexFilter([
          `[0:v]scale=${OUTPUT_WIDTH}:${HALF_HEIGHT}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH}:${HALF_HEIGHT}:${cropX}:0[top]`,
          `[1:v]scale=${OUTPUT_WIDTH}:${HALF_HEIGHT}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH}:${HALF_HEIGHT}:(iw-${OUTPUT_WIDTH})/2:(ih-${HALF_HEIGHT})/2[bottom]`,
          `[top][bottom]vstack=inputs=2,subtitles='${escapedSubtitlePath}'[v]`
        ])
        .outputOptions([
          "-map [v]",
          "-map 0:a:0?",
          "-c:v libx264",
          "-preset ultrafast",
          "-crf 28",
          "-r 24",
          "-threads 1",
          "-c:a aac",
          "-b:a 96k",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
          "-shortest"
        ])
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", reject);

      return;
    }

    const command = isVideo
      ? ffmpeg(inputPath).seekInput(start).duration(duration)
      : ffmpeg()
          .input(`color=c=0x111827:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:r=24`)
          .inputOptions(["-f lavfi"])
          .input(inputPath)
          .seekInput(start)
          .duration(duration);

    if (isVideo) {
      command
        .videoFilters([
          `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase`,
          `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:${cropX}:0`,
          `subtitles='${escapedSubtitlePath}'`
        ])
        .outputOptions([
          "-map 0:v:0",
          "-map 0:a:0?",
          "-c:v libx264",
          "-preset ultrafast",
          "-crf 28",
          "-r 24",
          "-threads 1",
          "-c:a aac",
          "-b:a 96k",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
          "-shortest"
        ]);
    } else {
      command.outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        "-c:v libx264",
        "-preset ultrafast",
        "-crf 28",
        "-r 24",
        "-threads 1",
        "-c:a aac",
        "-b:a 96k",
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

export async function createSubtitleFile(params: {
  dir: string;
  words: WordTimestamp[];
  start: number;
  end: number;
  title: string;
  captionStyle?: CaptionStyle;
}) {
  const clipWords = wordsForClip(params.words, params.start, params.end);

  const ass = createAssSubtitles(
    clipWords,
    params.title,
    params.captionStyle || "yellow-highlight"
  );

  const subtitlePath = path.join(params.dir, `captions-${randomUUID()}.ass`);

  await writeFile(subtitlePath, ass, "utf8");

  return subtitlePath;
}