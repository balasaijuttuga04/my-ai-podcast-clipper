"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Sparkles } from "lucide-react";

import Uploader from "@/components/Uploader";
import ProgressIndicator, {
  type ProgressStep
} from "@/components/ProgressIndicator";
import ClipPreview from "@/components/ClipPreview";

import type {
  Highlight,
  RenderedClip,
  TranscriptSegment,
  WordTimestamp
} from "@/lib/types";

type CropMode = "center" | "left" | "right" | "auto";
type CaptionStyle = "classic" | "bold-white" | "yellow-highlight";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [clipLength, setClipLength] = useState(45);
  const [numberOfClips, setNumberOfClips] = useState(3);
  const [step, setStep] = useState<ProgressStep>("idle");
  const [error, setError] = useState("");
  const [clips, setClips] = useState<RenderedClip[]>([]);
  const [cropMode, setCropMode] = useState<CropMode>("center");
  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyle>("yellow-highlight");

  async function generateClips() {
    if (!file) {
      setError("Upload a podcast file first.");
      return;
    }

    setError("");
    setClips([]);

    try {
      setStep("uploading");

      const transcribeForm = new FormData();
      transcribeForm.append("file", file);

      setStep("transcribing");

      const transcriptionRes = await fetch("/api/transcribe", {
        method: "POST",
        body: transcribeForm
      });

      if (!transcriptionRes.ok) {
        const errorData = await transcriptionRes.json().catch(() => null);
        throw new Error(errorData?.error || "Transcription failed.");
      }

      const transcription = (await transcriptionRes.json()) as {
        text: string;
        segments: TranscriptSegment[];
        words: WordTimestamp[];
      };

      if (!transcription.text || !transcription.words?.length) {
        throw new Error(
          "No speech was detected. Try a clearer audio/video file."
        );
      }

      setStep("analyzing");

      const highlightsRes = await fetch("/api/detect-highlights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript: transcription.text,
          segments: transcription.segments,
          clipLength,
          numberOfClips
        })
      });

      if (!highlightsRes.ok) {
        const errorData = await highlightsRes.json().catch(() => null);
        throw new Error(errorData?.error || "Highlight detection failed.");
      }

      const { highlights } = (await highlightsRes.json()) as {
        highlights: Highlight[];
      };

      if (!highlights.length) {
        throw new Error(
          "The AI could not find strong highlights. Try a longer or more conversational episode."
        );
      }

      const uploadForm = new FormData();
      uploadForm.append("file", file);

      const uploadResponse = await fetch("/api/upload-source", {
        method: "POST",
        body: uploadForm
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed.");
      }

      const { sourceId } = (await uploadResponse.json()) as {
        sourceId: string;
      };

      if (!sourceId) {
        throw new Error("Upload failed: missing sourceId.");
      }

      const jobResponse = await fetch("/api/video-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fileName: file.name,
          clipCount: highlights.length,
          status: "processing"
        })
      });

      if (!jobResponse.ok) {
        throw new Error("Could not create video job.");
      }

      const { job } = (await jobResponse.json()) as {
        job: { id: string };
      };

      const jobId = job.id;

      setStep("clipping");

      const rendered: RenderedClip[] = [];

      for (let i = 0; i < highlights.length; i++) {
        setStep("rendering");

        const h = highlights[i];
        const renderForm = new FormData();

        renderForm.append("sourceId", sourceId);
        renderForm.append("jobId", jobId);
        renderForm.append("start", String(h.start));
        renderForm.append("end", String(h.end));
        renderForm.append("title", h.title || `Clip ${i + 1}`);
        renderForm.append("words", JSON.stringify(transcription.words));
        renderForm.append("cropMode", cropMode);
        renderForm.append("captionStyle", captionStyle);

        const renderRes = await fetch("/api/render-clip", {
          method: "POST",
          body: renderForm
        });

        if (!renderRes.ok) {
          const errorText = await renderRes.text();
          console.error("RENDER_RESPONSE_TEXT", errorText);

          throw new Error(
            "Rendering failed. Check the terminal for the real backend error."
          );
        }

        const blob = await renderRes.blob();

        rendered.push({
          id: crypto.randomUUID(),
          title: h.title || `Clip ${i + 1}`,
          viralTitle: h.viralTitle,
          caption: h.caption,
          hashtags: h.hashtags,
          start: h.start,
          end: h.end,
          reason: h.reason,
          downloadUrl: URL.createObjectURL(blob)
        });

        setClips([...rendered]);
      }

      setStep("done");
    } catch (e: any) {
      console.error(e);
      setStep("error");
      setError(e.message || "Something went wrong while generating clips.");
    }
  }

  const isGenerating =
    step === "uploading" ||
    step === "transcribing" ||
    step === "analyzing" ||
    step === "clipping" ||
    step === "rendering";

  return (
    <main className="min-h-screen px-5 py-8">
      <div className="absolute right-4 top-4 z-50 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Dashboard
        </Link>

        <UserButton />
      </div>

      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
          <div className="flex items-center gap-3 text-cyan-300">
            <Sparkles className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-[0.3em]">
              CutMyShort
            </span>
          </div>

          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Turn long podcasts into captioned vertical shorts.
          </h1>

          <p className="mt-4 max-w-2xl text-slate-300">
            Upload a podcast or video file, detect strong moments with AI, and
            generate captioned vertical shorts ready for TikTok, Reels, and
            YouTube Shorts.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Uploader file={file} setFile={setFile} />

            <div className="rounded-3xl bg-slate-900/70 p-6">
              <h2 className="text-xl font-semibold">Clip settings</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-300">
                    Preferred clip length
                  </span>

                  <select
                    value={clipLength}
                    onChange={(e) =>
                      setClipLength(Number(e.target.value))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">
                    Number of clips
                  </span>

                  <select
                    value={numberOfClips}
                    onChange={(e) =>
                      setNumberOfClips(Number(e.target.value))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} clip{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">
                    Smart crop focus
                  </span>

                  <select
                    value={cropMode}
                    onChange={(e) =>
                      setCropMode(e.target.value as CropMode)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value="auto">Auto detect speaker</option>
                    <option value="center">Center speaker</option>
                    <option value="left">Left speaker</option>
                    <option value="right">Right speaker</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">
                    Caption style
                  </span>

                  <select
                    value={captionStyle}
                    onChange={(e) =>
                      setCaptionStyle(e.target.value as CaptionStyle)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3"
                  >
                    <option value="classic">Classic</option>
                    <option value="bold-white">Bold White</option>
                    <option value="yellow-highlight">
                      Yellow Highlight
                    </option>
                  </select>
                </label>
              </div>

              <button
                onClick={generateClips}
                disabled={!file || isGenerating}
                className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate Clips
              </button>

              {error && (
                <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                  {error}
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <ProgressIndicator step={step} />

            <div className="rounded-3xl bg-slate-900/70 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">How it works</p>

              <p className="mt-2">
                Word-level timestamps attach start/end seconds to each word. The
                renderer groups those words into short subtitle lines, writes an
                ASS subtitle file, and FFmpeg burns it into the final vertical
                MP4.
              </p>
            </div>
          </aside>
        </div>

        {clips.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-bold">Generated clips</h2>

            <div className="grid gap-6 lg:grid-cols-3">
              {clips.map((clip) => (
                <ClipPreview key={clip.id} clip={clip} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}