import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.videoJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      clips: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const job = await prisma.videoJob.create({
    data: {
      userId,
      fileName: body.fileName || "Untitled upload",
      clipCount: Number(body.clipCount || 0),
      status: body.status || "processing",
    },
  });

  return NextResponse.json({ job });
}