import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

import {
  createSubtitleFile,
  renderClip,
  writeUploadToTemp
} from "@/lib/ffmpeg";

import type { CropMode } from "@/lib/ffmpeg";
import type { CaptionStyle } from "@/lib/captions";
import type { WordTimestamp } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const start = Number(formData.get("start"));
    const end = Number(formData.get("end"));
    const title = String(formData.get("title") || "Podcast Clip");
    const wordsRaw = String(formData.get("words") || "[]");

    const cropModeRaw = String(formData.get("cropMode") || "center");
    const cropMode: CropMode =
      cropModeRaw === "left" || cropModeRaw === "right"
        ? cropModeRaw
        : "center";

    const captionStyleRaw = String(
      formData.get("captionStyle") || "yellow-highlight"
    );

    const captionStyle: CaptionStyle =
      captionStyleRaw === "classic" ||
      captionStyleRaw === "bold-white" ||
      captionStyleRaw === "yellow-highlight"
        ? captionStyleRaw
        : "yellow-highlight";

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

    await renderClip({
      inputPath,
      outputPath,
      subtitlePath,
      start,
      end,
      isVideo,
      cropMode
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

function safeFileName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "clip"
  );
}