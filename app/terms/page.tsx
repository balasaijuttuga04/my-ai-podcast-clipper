import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>

        <p className="mb-6 text-slate-300">
          Last updated: June 2026
        </p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Acceptance of Terms
            </h2>
            <p>
              By using CutMyShort, you agree to these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Ownership of Content
            </h2>
            <p>
              You retain ownership of all content uploaded to CutMyShort.
              You are responsible for ensuring you have the rights to upload
              and process the content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Prohibited Use
            </h2>
            <p>
              You may not use CutMyShort to process illegal, infringing,
              harmful, abusive, or fraudulent content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Service Availability
            </h2>
            <p>
              We strive to provide reliable service but do not guarantee
              uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Limitation of Liability
            </h2>
            <p>
              CutMyShort is provided on an "as-is" basis. We are not liable
              for indirect, incidental, or consequential damages arising
              from use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Account Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate accounts that
              violate these terms.
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