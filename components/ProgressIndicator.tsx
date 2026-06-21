"use client";

const steps = [
  "uploading",
  "transcribing",
  "analyzing",
  "clipping",
  "rendering",
  "done"
] as const;

export type ProgressStep = (typeof steps)[number] | "idle" | "error";

const stepLabels: Record<ProgressStep, string> = {
  idle: "Ready to start",
  uploading: "Uploading video...",
  transcribing: "Transcribing audio...",
  analyzing: "AI finding highlights...",
  clipping: "Preparing clips...",
  rendering: "Rendering shorts...",
  done: "Clips generated successfully",
  error: "Something went wrong"
};

const estimatedTimes: Record<ProgressStep, string> = {
  idle: "~3-5 minutes after upload",
  uploading: "~4 minutes remaining",
  transcribing: "~3 minutes remaining",
  analyzing: "~2 minutes remaining",
  clipping: "~1 minute remaining",
  rendering: "Less than 1 minute remaining",
  done: "Completed",
  error: "Please try again"
};

export default function ProgressIndicator({ step }: { step: ProgressStep }) {
  const activeIndex = step === "idle" ? -1 : steps.indexOf(step as any);

  const progress =
    step === "error"
      ? 100
      : step === "idle"
        ? 0
        : Math.max(0, ((activeIndex + 1) / steps.length) * 100);

  return (
    <div className="rounded-3xl bg-slate-900/70 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-white">Generation Progress</p>
          <p className="mt-1 text-sm text-slate-400">
            Estimated processing time: {estimatedTimes[step]}
          </p>
        </div>

        <p className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-300">
          {Math.round(progress)}%
        </p>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Current Step
        </p>
        <p className="mt-2 text-lg font-bold text-white">
          {stepLabels[step]}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`rounded-lg px-2 py-2 text-center capitalize transition-all ${
              i <= activeIndex
                ? "bg-cyan-400/20 text-cyan-200"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}