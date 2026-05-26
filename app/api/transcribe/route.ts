import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { extractAudio, writeUploadToTemp } from "@/lib/ffmpeg";
import { transcribeWithGroq } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const allowedTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a"
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a valid file." }, { status: 400 });
    }

    const maxMb = Number(process.env.MAX_UPLOAD_MB || 200);
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json({ error: `File is too large. Maximum size is ${maxMb}MB.` }, { status: 400 });
    }

    const isAllowedType =
      allowedTypes.has(file.type) || /\.(mp4|mov|mp3|m4a)$/i.test(file.name);

    if (!isAllowedType) {
      return NextResponse.json({ error: "Unsupported file type. Use mp4, mov, mp3, or m4a." }, { status: 400 });
    }

    const { dir, inputPath } = await writeUploadToTemp(file);
    const audioPath = path.join(dir, "audio.mp3");

    await extractAudio(inputPath, audioPath);

    const audioBuffer = await readFile(audioPath);
    const audioFile = new File([audioBuffer], "audio.mp3", { type: "audio/mpeg" });
    const transcript = await transcribeWithGroq(audioFile);

    return NextResponse.json({
      text: transcript.text || "",
      segments: transcript.segments || [],
      words: transcript.words || []
    });
  } catch (error: any) {
    console.error("TRANSCRIBE_ERROR", error);
    return NextResponse.json(
      { error: friendlyError(error, "Transcription failed. Check your API key and try a shorter file.") },
      { status: 500 }
    );
  }
}

function friendlyError(error: any, fallback: string) {
  const message = String(error?.message || "");
  if (message.includes("GROQ_API_KEY")) return message;
  if (message.toLowerCase().includes("rate")) return "Groq rate limit reached. Wait a minute and try again.";
  if (message.toLowerCase().includes("auth") || message.includes("401")) {
    return "AI API authentication failed. Check your GROQ_API_KEY in .env.local.";
  }
  return fallback;
}
