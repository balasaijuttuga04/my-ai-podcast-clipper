"use client";

import type { RenderedClip } from "@/lib/types";
import { Download, Play } from "lucide-react";

export default function ClipPreview({ clip }: { clip: RenderedClip }) {
  const previewUrl = clip.downloadUrl || `/api/clips/${clip.id}/preview`;
  const downloadUrl = clip.downloadUrl || `/api/clips/${clip.id}/download`;
  const thumbnailUrl = `/api/clips/${clip.id}/thumbnail`;

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-xl shadow-cyan-500/5 transition hover:-translate-y-1 hover:shadow-cyan-500/20">
      <div className="relative bg-black">
        <video
          src={previewUrl}
          poster={thumbnailUrl}
          controls
          preload="metadata"
          className="mx-auto aspect-[9/16] max-h-[520px] w-full bg-black object-contain"
        />

        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-cyan-300 backdrop-blur">
          AI Clip
        </div>
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 text-xl font-bold text-white">
          {clip.title}
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          {clip.start.toFixed(1)}s → {clip.end.toFixed(1)}s
        </p>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
          {clip.reason}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            <Play className="h-4 w-4" />
            Preview
          </a>

          <a
            href={downloadUrl}
            download={`${clip.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}.mp4`}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300"
          >
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>

        {clip.viralTitle && (
          <div className="mt-5 rounded-2xl border border-cyan-700/70 bg-cyan-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
              Viral Title
            </p>
            <p className="mt-2 text-sm text-white">{clip.viralTitle}</p>
          </div>
        )}

        {clip.caption && (
          <div className="mt-3 rounded-2xl border border-purple-700/70 bg-purple-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-400">
              Caption
            </p>
            <p className="mt-2 text-sm text-white">{clip.caption}</p>
          </div>
        )}

        {clip.hashtags && (
          <div className="mt-3 rounded-2xl border border-emerald-700/70 bg-emerald-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Hashtags
            </p>
            <p className="mt-2 break-words text-sm text-white">
              {clip.hashtags}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}