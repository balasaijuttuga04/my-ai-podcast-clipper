import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const jobs = await prisma.videoJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Upload History</h1>
            <p className="mt-2 text-gray-400">
              Your previous podcast clip generations.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
          >
            New Upload
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-xl border border-gray-800 bg-gray-950 p-8 text-center">
            <p className="text-gray-300">No uploads yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-300">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Clips</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-800 bg-gray-950">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-4 py-3 font-medium">{job.fileName}</td>
                    <td className="px-4 py-3">{job.clipCount}</td>
                    <td className="px-4 py-3">{job.status}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}