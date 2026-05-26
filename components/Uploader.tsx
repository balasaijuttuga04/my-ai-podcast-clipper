"use client";

import { UploadCloud, X } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
  file: File | null;
  setFile: (file: File | null) => void;
};

const allowed = ["video/mp4", "video/quicktime", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/m4a"];

export default function Uploader({ file, setFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const validate = useCallback((candidate: File) => {
    if (candidate.size > 200 * 1024 * 1024) {
      setError("Maximum upload size is 200MB.");
      return false;
    }

    const validType = allowed.includes(candidate.type) || /\.(mp4|mov|mp3|m4a)$/i.test(candidate.name);
    if (!validType) {
      setError("Use mp4, mov, mp3, or m4a files only.");
      return false;
    }

    setError("");
    return true;
  }, []);

  const onPick = (candidate?: File) => {
    if (!candidate) return;
    if (validate(candidate)) setFile(candidate);
  };

  return (
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
      className={`rounded-3xl border border-dashed p-8 text-center transition ${
        dragging ? "border-cyan-300 bg-cyan-300/10" : "border-slate-700 bg-slate-900/70"
      }`}
    >
      {!file ? (
        <>
          <UploadCloud className="mx-auto mb-4 h-12 w-12 text-cyan-300" />
          <h2 className="text-xl font-semibold">Upload podcast video or audio</h2>
          <p className="mt-2 text-sm text-slate-400">Drag and drop mp4, mov, mp3, or m4a. Max 200MB.</p>
          <label className="mt-5 inline-block cursor-pointer rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
            Choose file
            <input
              type="file"
              className="hidden"
              accept=".mp4,.mov,.mp3,.m4a,video/mp4,video/quicktime,audio/*"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-950 p-4 text-left">
          <div>
            <p className="font-semibold">{file.name}</p>
            <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            onClick={() => setFile(null)}
            className="rounded-full bg-slate-800 p-2 hover:bg-slate-700"
            aria-label="Remove file"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
    </div>
  );
}
