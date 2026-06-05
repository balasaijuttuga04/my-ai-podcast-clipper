import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { mkdir } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile, readdir } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { extractAudio, writeUploadToTemp } from "@/lib/ffmpeg";
import { transcribeWithGroq } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

const allowedTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a"
]);

const CHUNK_SECONDS = 8 * 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a valid file." },
        { status: 400 }
      );
    }

    const maxMb = Number(process.env.MAX_UPLOAD_MB || 500);

    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${maxMb}MB.` },
        { status: 400 }
      );
    }

    const isAllowedType =
      allowedTypes.has(file.type) || /\.(mp4|mov|mp3|m4a)$/i.test(file.name);

    if (!isAllowedType) {
      return NextResponse.json(
        { error: "Unsupported file type. Use mp4, mov, mp3, or m4a." },
        { status: 400 }
      );
    }

    const { dir, inputPath } = await writeUploadToTemp(file);

    const audioPath = path.join(dir, "audio-compressed.mp3");

    await extractAudio(inputPath, audioPath);

    const chunksDir = path.join(dir, "chunks");
    await mkdir(chunksDir, { recursive: true });

    await execFileAsync(ffmpegInstaller.path, [
  "-y",
  "-i",
  audioPath,
  "-ac",
  "1",
  "-ar",
  "16000",
  "-b:a",
  "32k",
  "-f",
  "segment",
  "-segment_time",
  String(CHUNK_SECONDS),
  "-reset_timestamps",
  "1",
  path.join(chunksDir, "chunk-%03d.mp3")
]);

    const chunkFiles = (await readdir(chunksDir))
      .filter((name) => name.endsWith(".mp3"))
      .sort();

    if (!chunkFiles.length) {
      throw new Error("Could not split audio for transcription.");
    }

    let fullText = "";
    const mergedSegments: any[] = [];
    const mergedWords: any[] = [];

    for (let i = 0; i < chunkFiles.length; i++) {
      const chunkPath = path.join(chunksDir, chunkFiles[i]);
      const chunkBuffer = await readFile(chunkPath);

      const chunkFile = new File([chunkBuffer], chunkFiles[i], {
        type: "audio/mpeg"
      });

      const offset = i * CHUNK_SECONDS;

      const transcript = await transcribeWithGroq(chunkFile);

      if (transcript.text) {
        fullText += `${transcript.text.trim()} `;
      }

      if (Array.isArray(transcript.segments)) {
        for (const segment of transcript.segments) {
          mergedSegments.push({
            ...segment,
            start: typeof segment.start === "number" ? segment.start + offset : segment.start,
            end: typeof segment.end === "number" ? segment.end + offset : segment.end
          });
        }
      }

      if (Array.isArray(transcript.words)) {
        for (const word of transcript.words) {
          mergedWords.push({
            ...word,
            start: typeof word.start === "number" ? word.start + offset : word.start,
            end: typeof word.end === "number" ? word.end + offset : word.end
          });
        }
      }
    }

    return NextResponse.json({
      text: fullText.trim(),
      segments: mergedSegments,
      words: mergedWords
    });
  } catch (error: any) {
    console.error("TRANSCRIBE_ERROR", error);

    return NextResponse.json(
      {
        error: friendlyError(
          error,
          "Transcription failed. Try a shorter or clearer file."
        )
      },
      { status: 500 }
    );
  }
}

function friendlyError(error: any, fallback: string) {
  const message = String(error?.message || "");

  if (message.includes("GROQ_API_KEY")) return message;

  if (message.toLowerCase().includes("rate")) {
    return "Groq rate limit reached. Wait a minute and try again.";
  }

  if (
    message.toLowerCase().includes("auth") ||
    message.includes("401")
  ) {
    return "AI API authentication failed. Check your GROQ_API_KEY in .env.local.";
  }

  if (
    message.toLowerCase().includes("request entity too large") ||
    message.toLowerCase().includes("request_too_large")
  ) {
    return "The audio is still too large after compression. Try a shorter file.";
  }

  return fallback;
}