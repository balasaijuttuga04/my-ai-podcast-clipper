import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { auth } from "@clerk/nextjs/server";
import { copyFile, mkdir, mkdtemp, readFile, readdir } from "fs/promises";

import { prisma } from "@/lib/prisma";

import {
  createSubtitleFile,
  renderClip
} from "@/lib/ffmpeg";

import type {
  CropMode,
  LayoutMode,
  BackgroundVideo
} from "@/lib/ffmpeg";
import type { CaptionStyle } from "@/lib/captions";
import type { WordTimestamp } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const UPLOAD_ROOT = "/data/uploads";
const CLIP_ROOT = "/data/clips";

const IS_RAILWAY = Boolean(process.env.RAILWAY_ENVIRONMENT);
const RAILWAY_MAX_CLIP_SECONDS = 25;

async function getSourcePath(userId: string, sourceId: string) {
  const possibleDirs = [
    path.join(UPLOAD_ROOT, userId, sourceId),
    path.join(UPLOAD_ROOT, "public-user", sourceId),
  ];

  for (const sourceDir of possibleDirs) {
    try {
      const files = await readdir(sourceDir);
      const sourceFile = files.find((f) => f.startsWith("source."));

      if (sourceFile) {
        return path.join(sourceDir, sourceFile);
      }
    } catch {
      // Try next location
    }
  }

  throw new Error(`Source video not found for sourceId ${sourceId}`);
}

async function createThumbnail(videoPath: string, thumbnailPath: string) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-ss",
    "00:00:01",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=360:-1",
    thumbnailPath,
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const sourceId = String(formData.get("sourceId") || "");
    const jobId = String(formData.get("jobId") || "");
    const start = Number(formData.get("start"));
    const rawEnd = Number(formData.get("end"));
    const title = String(formData.get("title") || "Podcast Clip");
    const wordsRaw = String(formData.get("words") || "[]");

    if (!sourceId) {
      return NextResponse.json(
        { error: "Missing sourceId." },
        { status: 400 }
      );
    }

    if (!jobId) {
      return NextResponse.json(
        { error: "Missing jobId." },
        { status: 400 }
      );
    }

    const existingJob = await prisma.videoJob.findFirst({
      where: {
        id: jobId,
        userId,
      },
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: "Video job not found." },
        { status: 404 }
      );
    }

    const cropMode = parseCropMode(formData.get("cropMode"));
    const captionStyle = parseCaptionStyle(formData.get("captionStyle"));

    const layoutMode: LayoutMode = IS_RAILWAY
      ? "normal"
      : parseLayoutMode(formData.get("layoutMode"));

    const backgroundVideo = parseBackgroundVideo(
      formData.get("backgroundVideo")
    );

    const end = IS_RAILWAY
      ? Math.min(rawEnd, start + RAILWAY_MAX_CLIP_SECONDS)
      : rawEnd;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return NextResponse.json(
        { error: "Invalid clip timestamps." },
        { status: 400 }
      );
    }

    const inputPath = await getSourcePath(userId, sourceId);
    const dir = await mkdtemp(path.join(os.tmpdir(), "cutmyshort-render-"));

    const words = JSON.parse(wordsRaw) as WordTimestamp[];

    const subtitlePath = await createSubtitleFile({
      dir,
      words,
      start,
      end,
      title,
      captionStyle
    });

    const outputPath = path.join(dir, "clip.mp4");

    const isVideo = /\.(mp4|mov|m4v|webm)$/i.test(inputPath);

    console.log("RENDER_SETTINGS", {
      isRailway: IS_RAILWAY,
      sourceId,
      jobId,
      start,
      end,
      duration: end - start,
      layoutMode,
      cropMode,
      isVideo,
      backgroundVideo
    });

    await renderClip({
      inputPath,
      outputPath,
      subtitlePath,
      start,
      end,
      isVideo,
      cropMode,
      layoutMode,
      backgroundVideo
    });

    const safeTitle = safeFileName(title);
    const clipId = crypto.randomUUID();
    const clipFileName = `${safeTitle}-${clipId}.mp4`;
    const thumbnailFileName = `${safeTitle}-${clipId}.jpg`;

    const clipDir = path.join(CLIP_ROOT, userId, jobId);
    await mkdir(clipDir, { recursive: true });

    const savedClipPath = path.join(clipDir, clipFileName);
    const thumbnailPath = path.join(clipDir, thumbnailFileName);

    await copyFile(outputPath, savedClipPath);

    try {
      await createThumbnail(savedClipPath, thumbnailPath);
    } catch (thumbnailError) {
      console.error("THUMBNAIL_ERROR", thumbnailError);
    }

    await prisma.clip.create({
      data: {
        id: clipId,
        userId,
        jobId,
        title,
        fileName: clipFileName,
        filePath: savedClipPath,
        thumbnailPath,
        start,
        end,
      },
    });

    await prisma.videoJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: "completed",
      },
    });

    const output = await readFile(outputPath);

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`
      }
    });
  } catch (error) {
    console.error("RENDER_ERROR", error);

    return NextResponse.json(
      {
        error:
          "Clip rendering failed. Try a shorter clip or check the terminal for FFmpeg errors."
      },
      { status: 500 }
    );
  }
}

function parseCropMode(value: FormDataEntryValue | null): CropMode {
  const raw = String(value || "center");

  if (raw === "left" || raw === "right") {
    return raw;
  }

  return "center";
}

function parseCaptionStyle(value: FormDataEntryValue | null): CaptionStyle {
  const raw = String(value || "yellow-highlight");

  if (
    raw === "classic" ||
    raw === "bold-white" ||
    raw === "yellow-highlight"
  ) {
    return raw;
  }

  return "yellow-highlight";
}

function parseLayoutMode(value: FormDataEntryValue | null): LayoutMode {
  const raw = String(value || "normal");

  if (raw === "split-screen") {
    return "split-screen";
  }

  return "normal";
}

function parseBackgroundVideo(
  value: FormDataEntryValue | null
): BackgroundVideo {
  const raw = String(value || "gameplay");

  if (
    raw === "gameplay" ||
    raw === "minecraft" ||
    raw === "satisfying"
  ) {
    return raw;
  }

  return "gameplay";
}

function safeFileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "clip"
  );
}
