import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { clipId: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clip = await prisma.clip.findFirst({
    where: {
      id: params.clipId,
      userId,
    },
  });

  if (!clip || !clip.thumbnailPath) {
    return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
  }

  const file = await readFile(clip.thumbnailPath);

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}