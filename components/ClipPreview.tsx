"use client";

import type { RenderedClip } from "@/lib/types";
import { Download } from "lucide-react";

export default function ClipPreview({ clip }: { clip: RenderedClip }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4">
      <video src={clip.downloadUrl} controls className="mx-auto aspect-[9/16] max-h-[540px] rounded-2xl bg-black" />
      <div className="mt-4">
        <h3 className="text-lg font-semibold">{clip.title}</h3>
        <p className="mt-1 text-sm text-slate-400">
          {clip.start.toFixed(1)}s → {clip.end.toFixed(1)}s
        </p>
        <p className="mt-2 text-sm text-slate-300">{clip.reason}</p>
        <a
          href={clip.downloadUrl}
          download={`${clip.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mp4`}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
        >
          <Download className="h-4 w-4" />
          Download MP4
        </a>
      </div>
    </div>
  );
}
