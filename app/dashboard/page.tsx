import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type ClipRow = {
  id: string;
  title: string;
  fileName: string;
  start: number;
  end: number;
  createdAt: Date;
};

type VideoJobRow = {
  id: string;
  fileName: string;
  clipCount: number;
  status: string;
  createdAt: Date;
  clips: ClipRow[];
};

async function deleteJob(formData: FormData) {
  "use server";

  const { userId } = await auth();
  const jobId = formData.get("jobId");

  if (!userId || typeof jobId !== "string") {
    return;
  }

  await prisma.videoJob.deleteMany({
    where: {
      id: jobId,
      userId,
    },
  });

  revalidatePath("/dashboard");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(start: number, end: number) {
  const duration = Math.max(0, Math.round(end - start));
  return `${duration}s`;
}

function statusClass(status: string) {
  const value = status.toLowerCase();

  if (value === "completed") {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }

  if (value === "failed") {
    return "bg-red-500/10 text-red-300 border-red-500/20";
  }

  if (value === "processing") {
    return "bg-blue-500/10 text-blue-300 border-blue-500/20";
  }

  return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  const jobs: VideoJobRow[] = await prisma.videoJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      clips: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const totalVideos = jobs.length;
  const totalClips = jobs.reduce((sum, job) => {
    return sum + (job.clips.length || job.clipCount);
  }, 0);
  const lastUpload = jobs[0]?.createdAt;

  const displayName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Creator";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950 to-zinc-900 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-400">Welcome back</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                {displayName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Track your podcast uploads, generated clips, and rendering status.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              New Upload
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Videos Processed" value={String(totalVideos)} />
          <StatCard title="Clips Generated" value={String(totalClips)} />
          <StatCard
            title="Last Upload"
            value={lastUpload ? formatDate(lastUpload) : "None"}
          />
          <StatCard title="Account Plan" value="Starter" />
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-950 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Upload History</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Your recent podcast clip generations and saved shorts.
              </p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
                No uploads yet
              </div>
              <h3 className="text-xl font-semibold">
                Create your first short clip
              </h3>
              <p className="mt-2 max-w-md text-sm text-zinc-400">
                Upload a podcast or long video and CutMyShort will generate short-form clips.
              </p>
              <Link
                href="/"
                className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Upload Video
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {jobs.map((job) => (
                <div key={job.id} className="p-5 transition hover:bg-white/[0.03]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {job.fileName}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                        <span>{job.clips.length || job.clipCount} clips</span>
                        <span>•</span>
                        <span>{formatDateTime(job.createdAt)}</span>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>

                    <form action={deleteJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                      >
                        Delete Job
                      </button>
                    </form>
                  </div>

                  {job.clips.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {job.clips.map((clip, index) => (
                        <div
                          key={clip.id}
                          className="rounded-xl border border-white/10 bg-black/40 p-4"
                        >
                          <p className="truncate text-sm font-semibold text-white">
                            {clip.title || `Clip ${index + 1}`}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Duration: {formatDuration(clip.start, clip.end)}
                          </p>

                          <a
                            href={`/api/clips/${clip.id}/download`}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-black transition hover:bg-cyan-300"
                          >
                            Download Clip {index + 1}
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-black/30 p-4 text-sm text-zinc-500">
                      No saved clips for this job yet.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-xl">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}