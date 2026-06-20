import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

        <p className="mb-6 text-slate-300">
          Last updated: June 2026
        </p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Information We Collect
            </h2>
            <p>
              We collect account information, uploaded videos, processing
              metadata, and usage information necessary to provide the
              CutMyShort service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Uploaded Content
            </h2>
            <p>
              Videos and media uploaded to CutMyShort are processed to generate
              clips and previews. You retain ownership of your content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Authentication
            </h2>
            <p>
              User authentication is handled through Clerk. We do not store
              your passwords.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Data Security
            </h2>
            <p>
              We use reasonable safeguards to protect your information and
              uploaded content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Contact
            </h2>
            <p>
              Questions regarding this policy may be sent to your support email.
            </p>
          </section>
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