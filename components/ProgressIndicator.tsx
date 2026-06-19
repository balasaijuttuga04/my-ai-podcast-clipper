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

export default function ProgressIndicator({
  step
}: {
  step: ProgressStep;
}) {
  const activeIndex = step === "idle" ? -1 : steps.indexOf(step as any);

  return (
    <div className="rounded-3xl bg-slate-900/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">Generation Progress</p>
        <p className="text-sm capitalize text-cyan-300">
          {step === "idle" ? "Ready" : step}
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all duration-500"
          style={{
            width: `${
              step === "error"
                ? 100
                : Math.max(
                    0,
                    ((activeIndex + 1) / steps.length) * 100
                  )
            }%`
          }}
        />
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

      {step === "idle" && (
        <p className="mt-4 text-sm text-slate-400">
          Upload a video and AI will automatically create viral clips.
        </p>
      )}
    </div>
  );
}