import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { mkdir, appendFile, rename, stat } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UPLOAD_ROOT = "/data/uploads";
const TEMP_ROOT = "/data/uploads/.tmp";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const chunk = formData.get("chunk") as File | null;
    const uploadId = String(formData.get("uploadId") || "");
    const fileName = String(formData.get("fileName") || "source.mp4");
    const chunkIndex = Number(formData.get("chunkIndex"));
    const totalChunks = Number(formData.get("totalChunks"));

    if (!chunk || !uploadId || Number.isNaN(chunkIndex) || Number.isNaN(totalChunks)) {
      return NextResponse.json({ error: "Invalid chunk upload" }, { status: 400 });
    }

    const ext = path.extname(fileName).toLowerCase() || ".mp4";
    const safeUploadId = uploadId.replace(/[^a-zA-Z0-9_-]/g, "");

    const tempDir = path.join(TEMP_ROOT, userId, safeUploadId);
    await mkdir(tempDir, { recursive: true });

    const tempFilePath = path.join(tempDir, `source${ext}.part`);

    const bytes = Buffer.from(await chunk.arrayBuffer());
    await appendFile(tempFilePath, bytes);

    console.log("UPLOAD_CHUNK_SAVED", {
      uploadId: safeUploadId,
      chunkIndex,
      totalChunks,
      chunkSize: chunk.size,
    });

    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        done: false,
        uploadedChunk: chunkIndex,
      });
    }

    const sourceId = crypto.randomUUID();
    const finalDir = path.join(UPLOAD_ROOT, userId, sourceId);
    await mkdir(finalDir, { recursive: true });

    const finalPath = path.join(finalDir, `source${ext}`);
    await rename(tempFilePath, finalPath);

    const fileStats = await stat(finalPath);

    console.log("UPLOAD_CHUNK_COMPLETE", {
      sourceId,
      finalPath,
      size: fileStats.size,
    });

    return NextResponse.json({
      done: true,
      sourceId,
      size: fileStats.size,
    });
  } catch (error) {
    console.error("UPLOAD_CHUNK_ERROR", error);

    return NextResponse.json(
      { error: "Chunk upload failed" },
      { status: 500 }
    );
  }
}