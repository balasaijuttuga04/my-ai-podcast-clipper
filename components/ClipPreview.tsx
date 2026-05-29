"use client";

import type { RenderedClip } from "@/lib/types";
import { Download } from "lucide-react";

export default function ClipPreview({
  clip
}: {
  clip: RenderedClip;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <video
        src={clip.downloadUrl}
        controls
        className="mx-auto aspect-[9/16] max-h-[540px] rounded-2xl bg-black"
      />

      <div className="mt-4">
        <h3 className="text-lg font-semibold">
          {clip.title}
        </h3>

        <p className="mt-1 text-sm text-slate-400">
          {clip.start.toFixed(1)}s → {clip.end.toFixed(1)}s
        </p>

        <p className="mt-2 text-sm text-slate-300">
          {clip.reason}
        </p>

        {clip.viralTitle && (
          <div className="mt-4 rounded-xl border border-cyan-700 bg-cyan-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
              Viral Title
            </p>

            <p className="mt-1 text-sm text-white">
              {clip.viralTitle}
            </p>
          </div>
        )}

        {clip.caption && (
          <div className="mt-3 rounded-xl border border-purple-700 bg-purple-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-400">
              Caption
            </p>

            <p className="mt-1 text-sm text-white">
              {clip.caption}
            </p>
          </div>
        )}

        {clip.hashtags && (
          <div className="mt-3 rounded-xl border border-emerald-700 bg-emerald-950/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Hashtags
            </p>

            <p className="mt-1 text-sm text-white break-words">
              {clip.hashtags}
            </p>
          </div>
        )}

        <a
          href={clip.downloadUrl}
          download={`${clip.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}.mp4`}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <Download className="h-4 w-4" />
          Download MP4
        </a>
      </div>
    </div>
  );
}