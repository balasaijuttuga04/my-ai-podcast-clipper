import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { createSubtitleFile, renderClip, writeUploadToTemp } from "@/lib/ffmpeg";
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

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Original media file is missing." }, { status: 400 });
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return NextResponse.json({ error: "Invalid clip timestamps." }, { status: 400 });
    }

    const words = JSON.parse(wordsRaw) as WordTimestamp[];
    const { dir, inputPath } = await writeUploadToTemp(file, "source");
    const subtitlePath = await createSubtitleFile({ dir, words, start, end, title });
    const outputPath = path.join(dir, "clip.mp4");

    await renderClip({
      inputPath,
      outputPath,
      subtitlePath,
      start,
      end,
      isVideo: file.type.startsWith("video/") || /\.(mp4|mov)$/i.test(file.name)
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
          "Clip rendering failed. Try a shorter clip or confirm FFmpeg is supported on your machine."
      },
      { status: 500 }
    );
  }
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "clip";
}
