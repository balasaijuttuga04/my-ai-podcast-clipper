import Groq from "groq-sdk";
import type { Highlight, TranscriptSegment, WordTimestamp } from "./types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export function assertGroqConfigured() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Add it to .env.local and restart npm run dev."
    );
  }
}

export async function transcribeWithGroq(audioFile: File) {
  assertGroqConfigured();

  const transcription = await groq.audio.transcriptions.create({
    file: audioFile,
    model: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
    response_format: "verbose_json",
    timestamp_granularities: ["segment", "word"],
    temperature: 0
  } as any);

  return transcription as {
    text: string;
    segments?: TranscriptSegment[];
    words?: WordTimestamp[];
  };
}

function sanitizeJson(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  return fenced ? fenced[1].trim() : trimmed;
}

export async function detectHighlightsWithGroq(params: {
  transcript: string;
  segments: TranscriptSegment[];
  clipLength: number;
  numberOfClips: number;
}): Promise<Highlight[]> {
  assertGroqConfigured();

  const { transcript, segments, clipLength, numberOfClips } = params;

  const compactSegments = segments
    .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
    .join("\n")
    .slice(0, 45000);

  const prompt = `
You are an expert short-form podcast editor and social media strategist.

Find ${numberOfClips} viral-ready clips from this transcript.

Rules:
- Each clip must be ${Math.max(25, clipLength - 8)} to ${clipLength + 8} seconds long.
- Prefer strong hooks, conflict, useful advice, surprising statements, story turns, emotional peaks, or controversial insights.
- Avoid intros, sponsor reads, dead air, and incomplete thoughts.
- Use exact numeric seconds from the transcript.
- Create titles/captions that feel natural for TikTok, Reels, and YouTube Shorts.
- Return only valid JSON. No markdown.

JSON shape:
{
  "highlights": [
    {
      "title": "short internal title",
      "viralTitle": "viral social media title",
      "caption": "short TikTok/Reels caption",
      "hashtags": "#podcast #shorts #viral #fyp",
      "start": 12.3,
      "end": 56.8,
      "reason": "why this clip is good",
      "hook": "opening hook text",
      "score": 1-10
    }
  ]
}

Transcript segments:
${compactSegments}

Full transcript fallback:
${transcript.slice(0, 12000)}
`;

  const chat = await groq.chat.completions.create({
    model: process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You select podcast highlights for TikTok/Reels/Shorts and return strict JSON."
      },
      {
        role: "user",
        content: prompt
      }
    ]
  } as any);

  const content = chat.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(sanitizeJson(content));

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
    : [];

  return highlights
    .map((h: any) => ({
      title: String(h.title || "Podcast Clip"),
      viralTitle: String(h.viralTitle || h.title || "Podcast Clip"),
      caption: String(h.caption || ""),
      hashtags: String(h.hashtags || ""),
      start: Math.max(0, Number(h.start || 0)),
      end: Math.max(0, Number(h.end || 0)),
      reason: String(h.reason || "Strong highlight"),
      hook: String(h.hook || ""),
      score: Math.max(1, Math.min(10, Number(h.score || 7)))
    }))
    .filter((h: Highlight) => h.end > h.start)
    .slice(0, numberOfClips);
}

export async function detectHighlightsWithGeminiFallback(params: {
  transcript: string;
  segments: TranscriptSegment[];
  clipLength: number;
  numberOfClips: number;
}): Promise<Highlight[]> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini fallback is not configured.");
  }

  const segmentText = params.segments
    .map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
    .join("\n")
    .slice(0, 40000);

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Return valid JSON only with {"highlights":[...]}.

Find ${params.numberOfClips} clips of about ${params.clipLength}s.

Each highlight must include:
title,
viralTitle,
caption,
hashtags,
start,
end,
reason,
hook,
score.

Transcript:
${segmentText}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json"
    }
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    throw new Error("Gemini fallback failed.");
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(sanitizeJson(text));

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
    : [];

  return highlights
    .map((h: any) => ({
      title: String(h.title || "Podcast Clip"),
      viralTitle: String(h.viralTitle || h.title || "Podcast Clip"),
      caption: String(h.caption || ""),
      hashtags: String(h.hashtags || ""),
      start: Math.max(0, Number(h.start || 0)),
      end: Math.max(0, Number(h.end || 0)),
      reason: String(h.reason || "Strong highlight"),
      hook: String(h.hook || ""),
      score: Math.max(1, Math.min(10, Number(h.score || 7)))
    }))
    .filter((h: Highlight) => h.end > h.start)
    .slice(0, params.numberOfClips);
}