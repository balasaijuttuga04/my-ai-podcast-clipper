import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_ROOT = "/data/uploads";

export async function POST(req: Request) {
  try {
    console.log("UPLOAD_SOURCE_START");

    const { userId } = auth();

    if (!userId) {
      console.log("UPLOAD_SOURCE_UNAUTHORIZED");

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.log("UPLOAD_SOURCE_NO_FILE");

      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    console.log("UPLOAD_SOURCE_FILE", {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const sourceId = crypto.randomUUID();

    const ext =
      path.extname(file.name || "").toLowerCase() ||
      ".mp4";

    const dir = path.join(
      UPLOAD_ROOT,
      userId,
      sourceId
    );

    await mkdir(dir, { recursive: true });

    const filePath = path.join(
      dir,
      `source${ext}`
    );

    const bytes = await file.arrayBuffer();

    await writeFile(
      filePath,
      Buffer.from(bytes)
    );

    console.log("UPLOAD_SOURCE_SAVED", {
      sourceId,
      filePath
    });

    return NextResponse.json({
      sourceId
    });
  } catch (error) {
    console.error(
      "UPLOAD_SOURCE_ERROR",
      error
    );

    return NextResponse.json(
      { error: "Source upload failed" },
      { status: 500 }
    );
  }
}