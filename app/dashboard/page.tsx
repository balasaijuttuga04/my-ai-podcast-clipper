import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

type VideoJobRow = {
  id: string;
  fileName: string;
  clipCount: number;
  status: string;
  createdAt: Date;
};

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
  });

  const totalVideos = jobs.length;
  const totalClips = jobs.reduce((sum, job) => sum + job.clipCount, 0);
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
                Your recent podcast clip generations.
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">File Name</th>
                    <th className="px-5 py-3 font-medium">Clips</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {jobs.map((job) => (
                    <tr key={job.id} className="transition hover:bg-white/[0.03]">
                      <td className="max-w-xs px-5 py-4">
                        <p className="truncate font-medium text-white">
                          {job.fileName}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-zinc-300">
                        {job.clipCount}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-zinc-400">
                        {formatDateTime(job.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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