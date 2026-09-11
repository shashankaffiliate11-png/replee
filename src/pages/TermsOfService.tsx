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
        <p className="mt-2 text-sm text-ink-500">Last updated: 10th Sept 2026</p>

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
              <li>Where a notice is matched to a client automatically (see our Privacy Policy), you remain responsible for confirming that match is correct before relying on or filing the draft.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">3. Eligibility</h2>
            <p className="mt-2">
              You must be at least 18 years old and have the legal capacity to
              enter into a binding contract to use NoticeDesk. By creating an
              account, you represent that you meet these requirements and
              that you are a practicing Chartered Accountant or acting under
              the authorization of one.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">4. Accounts</h2>
            <p className="mt-2">
              You must provide accurate information when creating an account
              and are responsible for maintaining the confidentiality of your
              account access. You're responsible for all activity under your
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">5. Subscriptions and billing</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Plans and pricing are described on our <Link to="/pricing" className="text-brass-dark underline">Pricing page</Link> and may change with notice.</li>
              <li>All fees are exclusive of applicable taxes (including GST) unless stated otherwise; taxes will be added at checkout where applicable.</li>
              <li>Paid plans are billed monthly in advance via Razorpay and <strong>automatically renew</strong> each billing period unless you cancel before the renewal date.</li>
              <li>You may cancel at any time; access continues until the end of the current billing period. No partial refunds for unused time, except where required by law.</li>
              <li>Unused drafts do not roll over between billing periods.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">6. Acceptable use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Use NoticeDesk for any unlawful purpose, or to prepare fraudulent or misleading submissions to any authority.</li>
              <li>Upload content you don't have the right to share (e.g. without your client's consent, where required).</li>
              <li>Attempt to interfere with, reverse-engineer, or abuse the service.</li>
              <li>Resell or redistribute access to the service without our written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">7. Data protection responsibilities</h2>
            <p className="mt-2">
              Where you upload a client's personal data (including notice
              content or case facts), you act as the Data Fiduciary for that
              data under India's Digital Personal Data Protection Act, 2023,
              and NoticeDesk acts solely as your processor, handling it only
              to generate and store drafts on your instructions. You confirm
              that you have a valid basis (such as your client's consent or an
              applicable legal exemption) to share that data with us for this
              purpose, and that doing so is consistent with your professional
              confidentiality obligations as a Chartered Accountant. See our{" "}
              <Link to="/privacy" className="text-brass-dark underline">Privacy Policy</Link>{" "}
              for how we handle data, including your rights and our Grievance
              Officer's contact details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">8. Intellectual property</h2>
            <p className="mt-2">
              You retain all rights to the notice content, case facts, and
              final edited responses you create using NoticeDesk. We retain
              rights to the NoticeDesk software, design, and branding.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">9. Disclaimer and limitation of liability</h2>
            <p className="mt-2">
              NoticeDesk is provided "as is," without warranties of any kind.
              We do not warrant that drafts are accurate, complete, or
              compliant with any specific legal requirement. To the maximum
              extent permitted by law, NoticeDesk and its operators are not
              liable for any loss, penalty, or damage arising from your use
              of, or reliance on, any draft generated by the service —
              including where a draft is filed without adequate professional
              review, or where an automated client match is relied on without
              confirmation.
            </p>
            <p className="mt-2">
              Where liability cannot be fully excluded under applicable law,
              our aggregate liability for any claim arising out of or relating
              to the service will not exceed the amount you paid us in the 3
              months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">10. Indemnification</h2>
            <p className="mt-2">
              You agree to indemnify and hold NoticeDesk and its operators
              harmless from any claim, loss, or expense (including reasonable
              legal fees) arising from: your breach of these terms, your
              violation of any law or a third party's rights (including a
              client's confidentiality or data protection rights), or content
              you submit to the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">11. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate accounts that violate these terms.
              You may stop using the service and close your account at any
              time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">12. Governing law</h2>
            <p className="mt-2">
              These terms shall be governed by and construed in accordance
              with the laws of India. Any disputes arising out of or in
              connection with these terms shall be subject to the exclusive
              jurisdiction of the courts located in Nagpur, Maharashtra.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">13. General provisions</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Force majeure:</strong> We are not liable for any delay or failure to perform caused by events beyond our reasonable control.</li>
              <li><strong>Severability:</strong> If any provision of these terms is found unenforceable, the remaining provisions continue in full effect.</li>
              <li><strong>Entire agreement:</strong> These terms, together with our Privacy Policy, form the entire agreement between you and NoticeDesk regarding the service.</li>
              <li><strong>No waiver:</strong> Our failure to enforce any provision is not a waiver of our right to do so later.</li>
              <li><strong>Assignment:</strong> You may not assign these terms without our consent. We may assign them in connection with a merger, acquisition, or sale of assets.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">14. Changes to these terms</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of
              NoticeDesk after changes means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">15. Contact</h2>
            <p className="mt-2">
              Questions about these terms: shashank.bawane@gmail.com
              <br />
              Grievance Officer: Shashank Bawane, shashank.bawane@gmail.com
            </p>
          </section>

          <p className="border-t border-paper-line pt-6 text-xs text-ink-400">
          </p>
        </div>
      </main>
    </div>
  );
}
