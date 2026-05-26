import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  detectHighlightsWithGeminiFallback,
  detectHighlightsWithGroq
} from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const schema = z.object({
  transcript: z.string().min(1),
  segments: z.array(
    z.object({
      text: z.string(),
      start: z.number(),
      end: z.number()
    })
  ),
  clipLength: z.number().min(30).max(60),
  numberOfClips: z.number().min(1).max(5)
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    try {
      const highlights = await detectHighlightsWithGroq(body);
      return NextResponse.json({ highlights, provider: "groq" });
    } catch (groqError) {
      console.warn("Groq highlight detection failed. Trying Gemini fallback.", groqError);
      const highlights = await detectHighlightsWithGeminiFallback(body);
      return NextResponse.json({ highlights, provider: "gemini" });
    }
  } catch (error: any) {
    console.error("HIGHLIGHT_ERROR", error);
    return NextResponse.json(
      {
        error:
          "Highlight detection failed. Make sure your transcript exists and your Groq API key is valid."
      },
      { status: 500 }
    );
  }
}
