"use client";

import { Link, UploadCloud, Video, X } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  file: File | null;
  setFile: (file: File | null) => void;
  videoUrl: string;
  setVideoUrl: (url: string) => void;
};

const MAX_UPLOAD_MB = 500;

const allowed = [
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a"
];

export default function Uploader({
  file,
  setFile,
  videoUrl,
  setVideoUrl
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const validate = useCallback((candidate: File) => {
    if (candidate.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`Maximum upload size is ${MAX_UPLOAD_MB}MB.`);
      return false;
    }

    const validType =
      allowed.includes(candidate.type) ||
      /\.(mp4|mov|mp3|m4a)$/i.test(candidate.name);

    if (!validType) {
      setError("Use MP4, MOV, MP3, or M4A files only.");
      return false;
    }

    setError("");
    return true;
  }, []);

  const onPick = (candidate?: File) => {
    if (!candidate) return;

    if (validate(candidate)) {
      setVideoUrl("");
      setFile(candidate);
    }
  };

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Upload Source
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Start with a video or URL
          </h2>
        </div>

        <div className="hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-300 sm:block">
          <Video className="h-6 w-6" />
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onPick(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-3xl border border-dashed p-4 text-center transition sm:p-8 ${
          dragging
            ? "border-cyan-300 bg-cyan-300/10"
            : "border-slate-700 bg-black/30 hover:border-slate-500"
        }`}
      >
        <div className="flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 transition focus-within:border-cyan-300">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="text-xl font-semibold text-white">
          Drag and drop your video here
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          Supports podcasts, interviews, webinars, MP4, MOV, MP3, and M4A. Manual uploads up to{" "}
          {MAX_UPLOAD_MB}MB.
        </p>

        {!file ? (
          <label className="mt-5 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300">
            Choose file
            <input
              type="file"
              className="hidden"
              accept=".mp4,.mov,.mp3,.m4a,video/mp4,video/quicktime,audio/*"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 text-left">
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{file.name}</p>
              <p className="text-sm text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB selected
              </p>
            </div>

            <button
              onClick={() => setFile(null)}
              className="rounded-full bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="Remove file"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          or paste a link
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 overflow-hidden">
        <Link className="h-5 w-5 shrink-0 text-cyan-300" />

        <input
          value={videoUrl}
          onChange={(e) => {
            setFile(null);
            setVideoUrl(e.target.value);
            setError("");
          }}
          placeholder="Paste YouTube or direct MP4 video URL"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          Direct MP4 URLs work best
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          YouTube may require cookies
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          Clips save to dashboard
        </div>
      </div>

      {videoUrl && !file && (
        <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">
          URL ready. Click Generate Clips to download and process it.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}