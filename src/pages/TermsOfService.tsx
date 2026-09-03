import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-paper-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-lg font-semibold text-ink-950">NoticeDesk</Link>
          <Link to="/" className="text-sm text-ink-600 hover:text-ink-950">← Back home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-semibold text-ink-950">Terms of Service</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: [DATE — fill in before publishing]</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-ink-700">
          <section>
            <h2 className="text-lg font-semibold text-ink-950">1. Acceptance</h2>
            <p className="mt-2">
              By creating an account or using NoticeDesk, you agree to these
              Terms of Service and our{" "}
              <Link to="/privacy" className="text-brass-dark underline">Privacy Policy</Link>.
              If you don't agree, don't use the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">2. What NoticeDesk is — and isn't</h2>
            <p className="mt-2">
              NoticeDesk generates <strong>draft</strong> responses to GST and
              Income Tax notices, using AI, for review by a qualified
              professional. It is a drafting aid, not a substitute for your
              professional judgment.
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>NoticeDesk does not file anything with any government department or portal on your behalf.</li>
              <li>NoticeDesk does not provide legal or tax advice — you remain the professional of record for anything you file.</li>
              <li>You are solely responsible for reviewing, editing, verifying, and approving every draft before it is used or filed in any way.</li>
              <li>AI-generated drafts may contain errors, omissions, or inaccuracies. Do not rely on any draft without independent professional review.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">3. Accounts</h2>
            <p className="mt-2">
              You must provide accurate information when creating an account
              and are responsible for maintaining the confidentiality of your
              account access. You're responsible for all activity under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">4. Subscriptions and billing</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Plans and pricing are described on our <Link to="/pricing" className="text-brass-dark underline">Pricing page</Link> and may change with notice.</li>
              <li>Paid plans are billed monthly in advance via Razorpay.</li>
              <li>You may cancel at any time; access continues until the end of the current billing period. No partial refunds for unused time, except where required by law.</li>
              <li>Unused drafts do not roll over between billing periods.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">5. Acceptable use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Use NoticeDesk for any unlawful purpose, or to prepare fraudulent or misleading submissions to any authority.</li>
              <li>Upload content you don't have the right to share (e.g. without your client's consent, where required).</li>
              <li>Attempt to interfere with, reverse-engineer, or abuse the service.</li>
              <li>Resell or redistribute access to the service without our written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">6. Intellectual property</h2>
            <p className="mt-2">
              You retain all rights to the notice content, case facts, and
              final edited responses you create using NoticeDesk. We retain
              rights to the NoticeDesk software, design, and branding.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">7. Disclaimer and limitation of liability</h2>
            <p className="mt-2">
              NoticeDesk is provided "as is," without warranties of any kind.
              We do not warrant that drafts are accurate, complete, or
              compliant with any specific legal requirement. To the maximum
              extent permitted by law, NoticeDesk and its operators are not
              liable for any loss, penalty, or damage arising from your use
              of, or reliance on, any draft generated by the service —
              including where a draft is filed without adequate professional
              review.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">8. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate accounts that violate these terms.
              You may stop using the service and close your account at any
              time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">9. Governing law</h2>
            <p className="mt-2">
              These terms are governed by the laws of India. [FILL IN: specify
              jurisdiction/courts for dispute resolution once your business
              entity and registered address are finalized.]
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">10. Changes to these terms</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of
              NoticeDesk after changes means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">11. Contact</h2>
            <p className="mt-2">Questions about these terms: [SUPPORT EMAIL]</p>
          </section>

          <p className="border-t border-paper-line pt-6 text-xs text-ink-400">
            This is a template and does not constitute legal advice. Have this
            reviewed by a qualified lawyer before publishing — particularly
            sections 2 and 7, since they carry the liability framing this
            entire product depends on.
          </p>
        </div>
      </main>
    </div>
  );
}
