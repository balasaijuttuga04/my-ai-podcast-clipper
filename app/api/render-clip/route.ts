import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

import {
  createSubtitleFile,
  renderClip,
  writeUploadToTemp
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

const IS_RAILWAY = Boolean(process.env.RAILWAY_ENVIRONMENT);
const RAILWAY_MAX_CLIP_SECONDS = 25;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const start = Number(formData.get("start"));
    const rawEnd = Number(formData.get("end"));
    const title = String(formData.get("title") || "Podcast Clip");
    const wordsRaw = String(formData.get("words") || "[]");

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

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Original media file is missing." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return NextResponse.json(
        { error: "Invalid clip timestamps." },
        { status: 400 }
      );
    }

    const words = JSON.parse(wordsRaw) as WordTimestamp[];

    const { dir, inputPath } = await writeUploadToTemp(file, "source");

    const subtitlePath = await createSubtitleFile({
      dir,
      words,
      start,
      end,
      title,
      captionStyle
    });

    const outputPath = path.join(dir, "clip.mp4");

    const isVideo =
      file.type.startsWith("video/") || /\.(mp4|mov)$/i.test(file.name);

    console.log("RENDER_SETTINGS", {
      isRailway: IS_RAILWAY,
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

    const output = await readFile(outputPath);

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeFileName(title)}.mp4"`
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