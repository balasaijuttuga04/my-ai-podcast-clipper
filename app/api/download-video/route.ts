import { NextRequest, NextResponse } from "next/server";
import path from "path";
import os from "os";
import { mkdir, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Video URL is required." }, { status: 400 });
    }

    const dir = path.join(os.tmpdir(), "ai-podcast-clipper-url", randomUUID());
    await mkdir(dir, { recursive: true });

    const outputPath = path.join(dir, "source.mp4");
    const ytDlpPath = "C:\\ai-podcast-clipper\\bin\\yt-dlp.exe";

    console.log("USING_YT_DLP_PATH", ytDlpPath);

    await execFileAsync(ytDlpPath, [
      url,
      "--output",
      outputPath,
      "--format",
      "best[ext=mp4]/best",
      "--no-playlist",
      "--merge-output-format",
      "mp4"
    ]);

    const video = await readFile(outputPath);

    return new NextResponse(video, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="downloaded-video.mp4"`
      }
    });
  } catch (error: any) {
    console.error("DOWNLOAD_VIDEO_ERROR", error);

    return NextResponse.json(
      {
        error:
          error?.stderr ||
          error?.message ||
          "Could not download this video URL. Try another link or upload manually."
      },
      { status: 500 }
    );
  }
}
