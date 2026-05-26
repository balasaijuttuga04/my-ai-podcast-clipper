"use client";

const steps = ["uploading", "transcribing", "analyzing", "clipping", "rendering", "done"] as const;

export type ProgressStep = (typeof steps)[number] | "idle" | "error";

export default function ProgressIndicator({ step }: { step: ProgressStep }) {
  const activeIndex = step === "idle" ? -1 : steps.indexOf(step as any);

  return (
    <div className="rounded-3xl bg-slate-900/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Generation progress</p>
        <p className="text-sm capitalize text-cyan-300">{step}</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
          style={{ width: `${step === "error" ? 100 : Math.max(0, ((activeIndex + 1) / steps.length) * 100)}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-6">
        {steps.map((s, i) => (
          <span key={s} className={i <= activeIndex ? "text-cyan-200" : ""}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
