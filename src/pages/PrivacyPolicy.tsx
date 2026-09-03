import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-paper-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-lg font-semibold text-ink-950">NoticeDesk</Link>
          <Link to="/" className="text-sm text-ink-600 hover:text-ink-950">← Back home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-semibold text-ink-950">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink-500">Last updated: Sept 3rd 2026</p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-ink-700">
          <section>
            <h2 className="text-lg font-semibold text-ink-950">1. Who we are</h2>
            <p className="mt-2">
              NoticeDesk ("we," "us") provides a tool for practicing Chartered
              Accountants to draft responses to GST and Income Tax notices.
              This policy explains what information we collect, why, and how
              it's handled when you use the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">2. What we collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Account information:</strong> your name, email address,
                and profile photo, provided via Google or Apple sign-in.
              </li>
              <li>
                <strong>Firm details:</strong> firm name and ICAI membership
                number, if you choose to provide them.
              </li>
              <li>
                <strong>Notice content:</strong> the text or files (PDF/image)
                of tax notices you upload, the case facts you enter, and the
                drafts generated and edited within the app. This may include
                your clients' names and confidential financial/tax details.
              </li>
              <li>
                <strong>Usage data:</strong> which features you use and how
                often, to enforce plan limits and improve the product.
              </li>
              <li>
                <strong>Payment information:</strong> handled entirely by
                Razorpay, our payment processor — we do not receive or store
                your card or bank details.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">3. Legal basis for processing</h2>
            <p className="mt-2">
              Under India's Digital Personal Data Protection Act, 2023 ("DPDP
              Act"), we process your personal data on the basis of your{" "}
              <strong>consent</strong>, given when you create an account and
              accept this policy. Where you upload a client's data, our
              processing of that data rests on the consent and instructions
              you (as the Data Fiduciary for that client) provide to us as
              your processor — see Section 7 below. You may withdraw consent
              at any time by contacting us at shashank.bawane@gmail.com or deleting your
              account; withdrawal does not affect processing already carried
              out, and may mean we can no longer provide the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">4. How we use it</h2>
            <p className="mt-2">
              We use your data to: operate the drafting feature (sending
              notice content to our AI processor to generate a draft),
              maintain your account and draft history, enforce plan limits,
              process payments, and communicate with you about your account.
              We do not sell your data, or your clients' data, to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">5. Third parties who process your data</h2>
            <p className="mt-2">Because of how the app is built, the following third parties handle data on our behalf:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
	Notice files and drafts are stored in NoticeDesk Database.
              </li>
              <li>
                <strong>Razorpay</strong> — processes subscription payments.
              </li>
              <li>
                <strong>Google/Apple</strong> — used only for authentication;
                we receive your name, email, and profile photo, nothing else.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">6. Cross-border data transfer</h2>
            <p className="mt-2">
              The DPDP Act permits transfer of personal data outside India except to countries the Central
              Government restricts by notification; we do not transfer data
              to any such restricted country. As a CA, you should independently
              confirm this is consistent with any confidentiality undertakings
              you have with your clients.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">7. Your responsibility for client data</h2>
            <p className="mt-2">
              As a Chartered Accountant, you remain responsible for your own
              professional and confidentiality obligations toward your
              clients. By uploading a client's notice or facts to NoticeDesk,
              you confirm you have the right to do so, and that using this
              tool for that purpose is consistent with your obligations to
              that client. For the purposes of the DPDP Act, you act as the{" "}
              <strong>Data Fiduciary</strong> for your clients' personal data,
              and NoticeDesk acts as your <strong>processor</strong>, handling
              that data only to provide the drafting service, on your
              instructions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">8. Data retention and deletion</h2>
            <p className="mt-2">
              We retain your account data and draft history for as long as
              your account is active, and for 90 days after
              closure to allow for recovery, unless a longer period is needed
              to meet a legal obligation. You may request deletion of your
              account and associated data at any time by contacting us at
	shashank.bawane@gmail.com; we will act on verified requests within
              7 Days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">9. Your rights as a Data Principal</h2>
            <p className="mt-2">Under the DPDP Act, you have the right to:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Access</strong> a summary of the personal data we hold about you and the processing we carry out.</li>
              <li><strong>Correct or update</strong> inaccurate or incomplete personal data.</li>
              <li><strong>Erase</strong> personal data that is no longer needed for the purpose it was collected, subject to any legal retention requirement.</li>
              <li><strong>Withdraw consent</strong> at any time (see Section 3).</li>
              <li><strong>Grievance redressal</strong> — raise a complaint about how we handle your data (see Section 12).</li>
              <li><strong>Nominate</strong> another individual to exercise these rights on your behalf in the event of your death or incapacity.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, contact us at shashank.bawane@gmail.com.
              We will respond within 7 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">10. Security</h2>
            <p className="mt-2">
              Notice files and drafts are stored in a private, access-controlled
              storage bucket — only you can access your own uploads and drafts.
              We use industry-standard practices for data in transit and at
              rest, but no system is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">11. Data breach notification</h2>
            <p className="mt-2">
              If a personal data breach occurs that is likely to affect you,
              we will notify you and the Data Protection Board of India as
              required under the DPDP Act, describing the nature of the
              breach and the steps we're taking in response.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">12. Grievance Officer</h2>
            <p className="mt-2">
              As required under the DPDP Act, we have appointed a Grievance
              Officer to address complaints about how your personal data is
              processed. If you're unsatisfied with our response, you may
              escalate your complaint to the Data Protection Board of India.
            </p>
            <p className="mt-2">
              Shashank Bawane<br />
              Email: shashank.bawane@gmail.com<br />
              We will acknowledge complaints within [CONFIRM: e.g. 7 working days]
              and aim to resolve them within 7 working days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">13. Changes to this policy</h2>
            <p className="mt-2">
              We may update this policy from time to time. Material changes
              will be notified via email or an in-app notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink-950">14. Contact</h2>
            <p className="mt-2">Questions about this policy: shashank.bawane@gmail.com</p>
          </section>

          <p className="border-t border-paper-line pt-6 text-xs text-ink-400">
            This is a template and does not constitute legal advice. Have this
            reviewed by a qualified lawyer — particularly the third-party
            data-processing section — before relying on it, given the
            sensitivity of the client data this app handles.
          </p>
        </div>
      </main>
    </div>
  );
}
