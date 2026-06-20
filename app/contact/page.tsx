import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Contact</h1>

        <p className="mb-6 text-slate-300">
          Have questions, feedback, or need support? Contact the CutMyShort team.
        </p>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
          <h2 className="mb-2 text-2xl font-semibold text-white">
            Support Email
          </h2>

          <p className="text-slate-300">
            Email us at{" "}
            <a
              href="mailto:support@cutmyshort.com"
              className="text-cyan-400 hover:text-cyan-300"
            >
              support@cutmyshort.com
            </a>
          </p>
        </div>

        <Link
          href="/"
          className="mt-10 inline-block text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}