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

      const rendered: RenderedClip[] = highlights.map((h, i) => ({
        id: crypto.randomUUID(),
        title: h.title || `Clip ${i + 1}`,
        viralTitle: h.viralTitle,
        caption: h.caption,
        hashtags: h.hashtags,
        start: h.start,
        end: h.end,
        reason: h.reason,
        downloadUrl: ""
      }));

      setClips(rendered);

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

      setStep("done");
      setError(
        "Rendering started in the background. Go to Dashboard and refresh to see clips as they finish."
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-4 py-6 text-white sm:px-5 sm:py-8">
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
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 shadow-2xl">
  <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
  <div className="absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

  <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
    <div>
      <div className="flex items-center gap-3 text-cyan-300">
        <Sparkles className="h-6 w-6" />
        <span className="text-sm font-semibold uppercase tracking-[0.3em]">
          CutMyShort
        </span>
      </div>

      <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
        Turn Long Videos Into Viral Shorts in Minutes
      </h1>

      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
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
        <div className="aspect-[9/16] overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-slate-800 to-black p-4">
          <div className="h-32 rounded-2xl bg-gradient-to-br from-cyan-300/30 to-blue-500/20" />

          <div className="mt-6 space-y-3">
            <div className="h-3 w-3/4 rounded-full bg-white/80" />
            <div className="h-3 w-1/2 rounded-full bg-cyan-300/80" />
            <div className="h-3 w-2/3 rounded-full bg-white/50" />
          </div>

          <div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
            <p className="text-xs font-semibold text-cyan-200">
              AI Highlight Found
            </p>
            <p className="mt-1 text-[11px] text-slate-300">
              00:13:42 - Best viral moment
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="h-20 rounded-2xl bg-white/10" />
            <div className="h-20 rounded-2xl bg-cyan-300/20" />
          </div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-8 rotate-6 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-xl backdrop-blur">
        <p className="text-xs text-slate-400">Rendering</p>
        <p className="text-sm font-bold text-cyan-300">3 clips ready</p>
      </div>
    </div>
  </div>
</section>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "Step 1",
              title: "Upload Video",
              description:
                "Upload a podcast, webinar, interview, or paste a video URL."
            },
            {
              step: "Step 2",
              title: "AI Finds Highlights",
              description:
                "AI analyzes transcripts and detects the most engaging moments."
            },
            {
              step: "Step 3",
              title: "Download Shorts",
              description:
                "Get captioned vertical clips ready for TikTok, Reels, and YouTube Shorts."
            }
          ].map((item) => (
            <div
              key={item.step}
              className="group rounded-3xl border border-white/10 bg-gradient-to-br
              from-slate-900 to-slate-950 p-6 shadow-xl transition-all duration-300
              hover:-translate-y-2 hover:rotate-1 hover:shadow-cyan-500/20"
            >
              <div className="mb-4 inline-flex rounded-2xl bg-cyan-400/20 px-4 py-2
              font-bold text-cyan-300 shadow-lg shadow-cyan-500/20">
              {item.step}
</div>
              <h3 className="mt-3 text-xl font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "AI Highlight Detection",
              description:
                "Finds strong hooks, emotional moments, and high-retention segments."
            },
            {
              title: "Auto Captions",
              description:
                "Burns clean, short-form subtitles directly into every clip."
            },
            {
              title: "Background Rendering",
              description:
                "Start processing and continue working while clips render."
            },
            {
              title: "Upload History",
              description:
                "Preview, download, and manage every generated short from your dashboard."
            }
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-slate-900/60 p-6"
            >
              <h3 className="text-lg font-bold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
        <section className="mt-16">
          ...
          </section>

        <div id="upload-section" className="grid w-full min-w-0 grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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
            <footer className="mt-24 border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-center text-sm text-slate-400 md:flex-row md:text-left">
          <div>
            <p className="font-semibold text-white">CutMyShort</p>
            <p className="mt-1">
              AI-powered podcast clipping and short-form content creation.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="/privacy" className="hover:text-white">
              Privacy
            </a>

            <a href="/terms" className="hover:text-white">
              Terms
            </a>

            <a href="/refund-policy" className="hover:text-white">
              Refund Policy
            </a>

            <a href="/contact" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          © 2026 CutMyShort. All rights reserved.
        </div>
      </footer>
    </main>
  );
}