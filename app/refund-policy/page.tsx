import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">Refund Policy</h1>

        <p className="mb-6 text-slate-300">Last updated: June 2026</p>

        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Subscription Payments
            </h2>
            <p>
              CutMyShort may offer paid subscription plans in the future.
              Monthly subscription payments are generally non-refundable.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Cancellation
            </h2>
            <p>
              You may cancel your subscription at any time. If you cancel, your
              access will continue until the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Billing Issues
            </h2>
            <p>
              If you believe you were charged in error, please contact us so we
              can review the issue.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Contact
            </h2>
            <p>
              Questions about refunds or billing may be sent to your support
              email.
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