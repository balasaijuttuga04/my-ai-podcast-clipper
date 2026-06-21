"use client";
import Image from "next/image";
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
  const [videoUrl, setVideoUrl] = useState("");
  const [clipLength, setClipLength] = useState(45);
  const [numberOfClips, setNumberOfClips] = useState(3);
  const [step, setStep] = useState<ProgressStep>("idle");
  const [error, setError] = useState("");
  const [clips, setClips] = useState<RenderedClip[]>([]);
  const [cropMode, setCropMode] = useState<CropMode>("center");
  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyle>("yellow-highlight");

  async function generateClips() {
    if (!file && !videoUrl.trim()) {
      setError("Upload a podcast file or paste a video URL first.");
      return;
    }

    setError("");
    setClips([]);

    try {
      setStep("uploading");

      let workingFile = file;

      if (!workingFile && videoUrl.trim()) {
        const downloadRes = await fetch("/api/download-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoUrl.trim() })
        });

        if (!downloadRes.ok) {
          const errorData = await downloadRes.json().catch(() => null);
          throw new Error(
            errorData?.error || "Could not download this video URL."
          );
        }

        const blob = await downloadRes.blob();

        workingFile = new File([blob], "downloaded-video.mp4", {
          type: "video/mp4"
        });
      }

      if (!workingFile) {
        throw new Error("No valid video file found.");
      }

      const transcribeForm = new FormData();
      transcribeForm.append("file", workingFile);

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
        headers: { "Content-Type": "application/json" },
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
      uploadForm.append("file", workingFile);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: workingFile.name,
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

      setStep("rendering");
      setClips([]);


      await Promise.all(
        highlights.map(async (h, i) => {
          const renderForm = new FormData();

          renderForm.append("sourceId", sourceId);
          renderForm.append("jobId", jobId);
          renderForm.append("start", String(h.start));
          renderForm.append("end", String(h.end));
          renderForm.append("title", h.title || `Clip ${i + 1}`);
          renderForm.append("words", JSON.stringify(transcription.words));
          renderForm.append("cropMode", cropMode);
          renderForm.append("captionStyle", captionStyle);
          renderForm.append("background", "true");

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
        })
      );
            let attempts = 0;

      while (attempts < 20) {
        const jobStatusRes = await fetch(`/api/video-jobs/${jobId}`);

        if (jobStatusRes.ok) {
          const { job } = await jobStatusRes.json();

          if (job?.clips?.length > 0) {
            setClips(
              job.clips.map((clip: any) => ({
                id: clip.id,
                title: clip.title,
                start: clip.start,
                end: clip.end,
                reason: "Rendered clip ready to preview and download.",
                downloadUrl: `/api/clips/${clip.id}/download`
              }))
            );

            break;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts += 1;
      }

      setStep("done");
      setError(
        "Rendering complete. You can preview and download your clips below."
      );
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

    const isDone = step === "done" && clips.length > 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-4 py-3 text-white sm:px-5 sm:py-4">
      <div className="mb-6 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-white.png"
            alt="CutMyShort"
            width={320}
            height={100}
            priority
            className="h-20 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Dashboard
          </Link>

          <UserButton />
        </div>
      </div>

      <div className="mx-auto max-w-[1700px]">
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 shadow-2xl">
  <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
  <div className="absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

  <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
    <div>
      

      <h1 className="mt-5 max-w-5xl text-4xl font-bold leading-tight md:text-7xl">
        Turn Long Videos Into Viral Shorts in Minutes
        </h1>

      <p className="mt-5 max-w-4xl text-xl leading-9 text-slate-300">
        Upload a podcast, interview, webinar, or YouTube-style video.
        CutMyShort finds the best moments, adds captions, and renders
        vertical clips ready for TikTok, Instagram Reels, and YouTube Shorts.
      </p>

      <div className="mt-8 flex flex-wrap gap-4">
        <button
          onClick={() =>
            document
              .getElementById("upload-section")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="rounded-2xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:-translate-y-0.5 hover:bg-cyan-300"
        >
          Start Creating Shorts
        </button>

        <Link
          href="/dashboard"
          className="rounded-2xl border border-white/20 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
        >
          View Dashboard
        </Link>
      </div>
    </div>

    

    <div className="relative hidden lg:block">
  <div className="absolute -left-8 top-10 h-28 w-28 rounded-3xl bg-cyan-400/20 blur-2xl" />

  <div className="relative mx-auto w-[280px] rotate-[-6deg] rounded-[2rem] border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-cyan-500/10">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-slate-800 to-black p-4">
  <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-cyan-300/20 to-blue-500/20" />

  <div className="absolute left-6 right-6 top-8 rounded-2xl bg-black/40 p-4">
    <p className="text-xs font-semibold text-slate-300">Long video</p>
    <div className="mt-3 h-20 rounded-xl bg-slate-700/80" />
  </div>

  <div className="absolute left-6 right-6 top-40 space-y-3">
    <div className="h-3 w-3/4 rounded-full bg-white/80" />
    <div className="h-3 w-1/2 rounded-full bg-cyan-300/80" />
    <div className="h-3 w-2/3 rounded-full bg-white/50" />
  </div>

  <div className="scan-line absolute left-6 right-6 top-36 h-1 rounded-full bg-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.9)]" />

<div className="absolute left-6 right-6 top-52 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
  <p className="text-xs font-bold text-cyan-200">AI Processing</p>
  <p className="mt-1 text-[11px] text-slate-300">
    Finding viral moments...
  </p>
</div>

  <div className="short-card short-card-1 absolute bottom-24 left-5 h-28 w-20 rounded-xl bg-cyan-300/20 p-2">
    <div className="h-14 rounded-lg bg-white/10" />
    <div className="mt-2 h-2 rounded-full bg-cyan-300" />
    <div className="mt-1 h-2 w-2/3 rounded-full bg-white/50" />
  </div>

  <div className="short-card short-card-2 absolute bottom-20 left-28 h-28 w-20 rounded-xl bg-purple-300/20 p-2">
    <div className="h-14 rounded-lg bg-white/10" />
    <div className="mt-2 h-2 rounded-full bg-purple-300" />
    <div className="mt-1 h-2 w-2/3 rounded-full bg-white/50" />
  </div>

  <div className="short-card short-card-3 absolute bottom-16 right-5 h-28 w-20 rounded-xl bg-fuchsia-300/20 p-2">
    <div className="h-14 rounded-lg bg-white/10" />
    <div className="mt-2 h-2 rounded-full bg-fuchsia-300" />
    <div className="mt-1 h-2 w-2/3 rounded-full bg-white/50" />
  </div>
    </div>
  </div>

    <div className="absolute -right-4 bottom-8 rotate-6 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-xl backdrop-blur">
    
  </div>
</div>
</div>
</section>

<section className="mb-10 grid gap-5 md:grid-cols-3">
  {[
    {
      step: "Step 1",
      title: "Upload Video",
      description: "Upload a podcast, webinar, interview, or paste a video URL."
    },
    {
      step: "Step 2",
      title: "AI Finds Highlights",
      description: "AI analyzes transcripts and detects the most engaging moments."
    },
    {
      step: "Step 3",
      title: "Download Shorts",
      description: "Get captioned vertical clips ready for TikTok, Reels, and YouTube Shorts."
    }
  ].map((item, index) => (
    <div
      key={item.step}
      className="animate-float rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-7 shadow-xl shadow-cyan-500/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-cyan-500/20"
      style={{
        animationDelay: `${index * 0.25}s`
      }}
    >
      <div className="mb-8 inline-flex rounded-2xl bg-cyan-400/20 px-5 py-3 font-bold text-cyan-300 shadow-lg shadow-cyan-500/20">
        {item.step}
      </div>

      <h3 className="text-2xl font-bold text-white">{item.title}</h3>

      <p className="mt-3 text-base leading-7 text-slate-400">
        {item.description}
      </p>
    </div>
  ))}
</section>
        <div id="upload-section" className="mx-auto grid max-w-[1500px] gap-7 lg:grid-cols-[1fr_430px]">
          <div className="space-y-6">
            <Uploader
              file={file}
              setFile={setFile}
              videoUrl={videoUrl}
              setVideoUrl={setVideoUrl}
            />

            <div className="rounded-2xl bg-slate-900/70 p-4 sm:rounded-3xl sm:p-6">
              <h2 className="text-xl font-semibold">Clip settings</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-slate-300">
                    Preferred clip length
                  </span>

                  <select
                    value={clipLength}
                    onChange={(e) => setClipLength(Number(e.target.value))}
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
                    onChange={(e) => setCropMode(e.target.value as CropMode)}
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
                    <option value="yellow-highlight">Yellow Highlight</option>
                  </select>
                </label>
              </div>

              <button
                onClick={generateClips}
                disabled={(!file && !videoUrl.trim()) || isGenerating}
                className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-bold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generate Clips
              </button>

              {isDone && (
  <div className="success-pop mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-200">
    ✓ {clips.length} Short{clips.length > 1 ? "s" : ""} Generated Successfully
  </div>
)}

{error && !isDone && (
  <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
    {error}
  </p>
)}
            </div>
          </div>

          <aside className="space-y-7">
            <ProgressIndicator step={step} />

            <div className="rounded-3xl bg-slate-900/70 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">How it works</p>

              <p className="mt-2">
                AI analyzes your content, finds viral moments,
                adds captions automatically, 
                and exports ready-to-post shorts for TikTok, Reels,
                and YouTube Shorts.
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



      <section className="mt-20">
  <div className="mx-auto max-w-4xl">
    <h2 className="mb-10 text-center text-4xl font-bold">
      Frequently Asked Questions
    </h2>

    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">
          What video formats are supported?
        </h3>
        <p className="mt-2 text-slate-400">
          MP4, MOV, MP3 and M4A files are supported.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">
          Does CutMyShort automatically find highlights?
        </h3>
        <p className="mt-2 text-slate-400">
          Yes. Our AI analyzes your content and identifies the most engaging moments for short-form clips.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">
          Can I upload YouTube videos?
        </h3>
        <p className="mt-2 text-slate-400">
          Yes. Paste a supported video URL and CutMyShort will process it automatically.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">
          Who owns the generated clips?
        </h3>
        <p className="mt-2 text-slate-400">
          You retain ownership of your uploaded content and generated clips.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
        <h3 className="text-lg font-semibold">
          Is CutMyShort free to use?
        </h3>
        <p className="mt-2 text-slate-400">
          Currently yes. Subscription plans will be introduced in the future.
        </p>
      </div>
    </div>
  </div>
</section>
            <footer className="mt-32 border-t border-white/10 py-16">
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 px-8 text-center md:flex-row md:items-start md:text-left">
    <div className="max-w-md">
      <p className="text-3xl font-bold text-white">
        CutMyShort
      </p>

      <p className="mt-4 text-lg leading-8 text-slate-400">
        AI-powered podcast clipping and short-form content creation.
      </p>
    </div>

    <div className="flex flex-wrap items-center justify-center gap-8 text-lg">
      <a
        href="/privacy"
        className="text-slate-400 transition hover:text-cyan-300"
      >
        Privacy
      </a>

      <a
        href="/terms"
        className="text-slate-400 transition hover:text-cyan-300"
      >
        Terms
      </a>

      <a
        href="/refund-policy"
        className="text-slate-400 transition hover:text-cyan-300"
      >
        Refund Policy
      </a>

      <a
        href="/contact"
        className="text-slate-400 transition hover:text-cyan-300"
      >
        Contact
      </a>
    </div>
  </div>

  <div className="mt-12 text-center text-base text-slate-500">
    © 2026 CutMyShort. All rights reserved.
  </div>
</footer>
    </main>
  );
}