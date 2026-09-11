export interface BlogPost {
  slug: string;
  title: string;
  metaDescription: string;
  excerpt: string;
  date: string;
  readTime: string;
  keywords: string[];
  content: { type: "h2" | "p" | "ul" | "table" | "quote"; text?: string; items?: string[]; rows?: string[][] }[];
  faqs: { q: string; a: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "gst-asmt-10-notice-reply-guide",
    title: "GST ASMT-10 Notice Reply: Complete Guide for CAs and Taxpayers (2026)",
    metaDescription:
      "How to reply to a GST ASMT-10 scrutiny notice: legal basis under Section 61, the ASMT-11 reply format, common GSTR-1 vs GSTR-3B and ITC discrepancies, and deadlines.",
    excerpt:
      "A GST ASMT-10 notice is a scrutiny notice, not a show-cause notice — and the difference changes how you should respond. Here's the full reply process, common discrepancy types, and the format that holds up.",
    date: "2026-09-01",
    readTime: "7 min read",
    keywords: [
      "GST ASMT-10 reply format",
      "GST scrutiny notice reply",
      "ASMT-11 format",
      "GSTR-1 vs GSTR-3B mismatch",
      "ITC mismatch GSTR-2B GSTR-3B reply",
      "Section 61 CGST Act",
      "GST notice reply India",
    ],
    content: [
      {
        type: "p",
        text: "Form GST ASMT-10 is the scrutiny notice issued by a proper officer under Section 61 of the CGST Act, 2017, read with Rule 99 of the CGST Rules, 2017. It is not a show-cause notice — that's a separate instrument under Form GST DRC-01, issued under Section 73 or 74. The distinction matters: ASMT-10 is a preliminary scrutiny step, and a well-drafted reply at this stage can close the matter before it ever escalates to a formal demand.",
      },
      { type: "h2", text: "What Section 61 actually authorizes" },
      {
        type: "ul",
        items: [
          "Section 61(1): the proper officer may scrutinize a return and related particulars to verify correctness — no prior approval from a higher authority is required to start this.",
          "Section 61(2): if the officer finds a discrepancy, they must inform the registered person and seek an explanation within the time specified in the notice (commonly 30 days).",
          "Section 61(3): if the explanation is found acceptable, no further action is taken. If not, the officer may proceed under Section 65 (audit), Section 66 (special audit), Section 67 (inspection/search), or issue a demand under Section 73/74.",
        ],
      },
      { type: "h2", text: "How to reply: the ASMT-11 process" },
      {
        type: "p",
        text: "The reply is filed in Form GST ASMT-11 on the GST portal (Services → User Services → View Additional Notices and Orders), verified with DSC or EVC. A reply generally has four parts: acknowledgment of the notice with its reference number and date, a point-by-point response to each discrepancy raised, supporting reconciliation statements or annexures, and a closing request that the officer accept the explanation and drop the proceedings in Form GST ASMT-12.",
      },
      { type: "h2", text: "The discrepancies that show up most often" },
      {
        type: "table",
        rows: [
          ["Discrepancy type", "What it usually means", "What to attach"],
          [
            "Outward supply mismatch (GSTR-1 vs GSTR-3B)",
            "Turnover reported in GSTR-1 doesn't match GSTR-3B for the same period",
            "Month-wise reconciliation, sales register, any amendment filed in a later period",
          ],
          [
            "ITC mismatch (GSTR-2B vs GSTR-3B)",
            "Input tax credit claimed exceeds what's reflected in auto-populated GSTR-2B",
            "Purchase register, supplier invoices, proof the supplier has since filed their GSTR-1",
          ],
          [
            "Ineligible ITC under blocked credit (Section 17(5))",
            "Credit claimed on items specifically excluded from ITC eligibility",
            "Invoice-wise breakup showing the credit was correctly classified, or a voluntary reversal with interest",
          ],
        ],
      },
      { type: "h2", text: "Deadlines and what happens if you miss one" },
      {
        type: "p",
        text: "The notice itself specifies the response window — commonly 30 days, though the officer can extend it on a reasoned request. Missing the deadline doesn't end the matter; it typically moves the officer toward audit, inspection, or a formal demand under Section 73/74, where the burden of a clean explanation only gets heavier. If you need more time, a short written request for extension, filed before the deadline, is far better than silence.",
      },
      { type: "h2", text: "A note on format" },
      {
        type: "p",
        text: "There is no single prescribed template for the explanation itself — the reply has to speak to the specific facts of the case, and experienced practitioners will structure it differently depending on the discrepancy. What stays constant across a defensible reply: a clear reference to the notice number and date, a point-wise structure that mirrors how the officer raised the discrepancies, reconciliation figures that are internally consistent with the attached annexures, and an explicit closing request (drop the proceedings, or a request for personal hearing under Section 75(4) if the matter is contested).",
      },
      {
        type: "quote",
        text: "NoticeDesk reads an incoming ASMT-10 notice PDF, extracts the discrepancy details, GSTIN, and reference number automatically, and drafts a structured first response — matched to the right client from your existing records — so the reply is ready for your review instead of a blank page.",
      },
    ],
    faqs: [
      {
        q: "Is GST ASMT-10 the same as a show-cause notice?",
        a: "No. ASMT-10 is a scrutiny notice under Section 61. A show-cause notice is a separate, later-stage instrument issued in Form GST DRC-01 under Section 73 or 74, typically only if the scrutiny explanation is rejected.",
      },
      {
        q: "How long do I have to reply to an ASMT-10 notice?",
        a: "The notice itself states the deadline — most commonly 30 days from the date of issue. Always check the specific notice rather than assuming a fixed number, and request an extension in writing before the deadline if you need more time.",
      },
      {
        q: "What happens if my explanation is accepted?",
        a: "The officer closes the matter in Form GST ASMT-12, and no further action is taken on that discrepancy.",
      },
      {
        q: "What if the officer isn't satisfied with my reply?",
        a: "The matter can move to a formal demand under Section 73 (no fraud/misstatement alleged) or Section 74 (fraud or willful misstatement alleged), issued as a show-cause notice in Form GST DRC-01.",
      },
    ],
  },
  {
    slug: "income-tax-notice-after-itr-filing-ay-2026-27",
    title: "Got an Income Tax Notice After Filing Your ITR for AY 2026-27? Here's What It Actually Means",
    metaDescription:
      "A record 7.8 crore ITRs were filed for AY 2026-27. As the department processes them, here's how to tell a routine Section 143(1) intimation from a notice that actually needs action — and what changes under the new Income Tax Act 2025.",
    excerpt:
      "Over 7.8 crore returns were filed for AY 2026-27 — a record. As the department works through that volume, more taxpayers are seeing notices land in their inbox. Most are routine. Four kinds genuinely need a response.",
    date: "2026-09-08",
    readTime: "6 min read",
    keywords: [
      "income tax notice after ITR filing",
      "Section 143(1) intimation meaning",
      "Section 143(2) scrutiny notice",
      "AIS mismatch notice",
      "Section 148 reassessment notice",
      "Income Tax Act 2025 new sections",
      "AY 2026-27 income tax notice",
    ],
    content: [
      {
        type: "p",
        text: "AY 2026-27 saw a record 7.8 crore income-tax returns filed, per Income Tax Department data. As the department works through that volume, a lot of filers are opening an SMS, email, or portal message headed \"Income Tax Department\" — and the first reaction is usually alarm. Most of the time, that's not warranted. Here's how to tell the routine ones from the ones that actually need a response.",
      },
      { type: "h2", text: "The one that needs nothing: Section 143(1) intimation" },
      {
        type: "p",
        text: "Virtually every filer gets this one. It's the CPC's automated \"your return has been processed\" message, comparing your filed figures against its own computation. If it agrees with what you filed — no demand, no adjustment — there is nothing to do. If it shows a mismatch, the notice will specify a demand or a refund adjustment, and that's when it's worth a closer look.",
      },
      { type: "h2", text: "The four that do need a response" },
      {
        type: "table",
        rows: [
          ["Notice", "What triggers it", "Typical response window"],
          [
            "Defective return (Section 139(9))",
            "A technical or arithmetic defect in the filed return",
            "15 days to fix and refile",
          ],
          [
            "Refund set-off (Section 245)",
            "An old outstanding demand is being adjusted against your current refund",
            "30 days to object, or the adjustment proceeds",
          ],
          [
            "Scrutiny notice (Section 143(2))",
            "Your return is selected for detailed examination — often triggered by an AIS mismatch, unusually high deductions, or disproportionate claims",
            "Must be issued within 3 months from the end of the FY in which the return was filed; response window per the notice, commonly ~15 days on the faceless e-Proceedings portal",
          ],
          [
            "Reassessment notice (Section 148, via 148A)",
            "The department believes income has escaped assessment in a prior year",
            "Follows a mandatory pre-notice inquiry under Section 148A before the 148 notice itself is issued",
          ],
        ],
      },
      { type: "h2", text: "Why AIS mismatches are driving so many of these" },
      {
        type: "p",
        text: "The Annual Information Statement (AIS) aggregates data the department already has from banks, employers, and other reporting entities. When what you filed doesn't line up with what AIS shows, that gap is one of the most common triggers for a 143(1) adjustment or, if unresolved, a 143(2) scrutiny notice. Reconciling your return against your own AIS and Form 26AS before filing — and again if a notice arrives — resolves a large share of these before they escalate.",
      },
      { type: "h2", text: "The Income Tax Act 2025 changes the section numbers, not the process" },
      {
        type: "p",
        text: "The Income Tax Act, 2025 took effect from April 1, 2026. For any return relating to FY 2025-26 (AY 2026-27) or earlier, the old Income Tax Act, 1961 provisions still apply — including the section numbers discussed above. From Tax Year 2026-27 onward (the Act replaces \"Assessment Year\" with \"Tax Year\"), the section numbering changes — for instance, TDS provisions previously spread across dozens of sections are consolidated under Sections 392–394. The underlying process — faceless e-Proceedings, document-backed replies, appeal routes — stays the same. What changes is the citation, not the mechanics.",
      },
      {
        type: "quote",
        text: "NoticeDesk connects to a CA's inbox, detects an incoming Income Tax or GST notice as it arrives, extracts the PAN, notice type, and key details automatically, and drafts a first response ready for review — whether the notice is under the old 1961 Act or the new 2025 numbering.",
      },
    ],
    faqs: [
      {
        q: "Do I need to respond to a Section 143(1) intimation?",
        a: "Only if it shows a demand or adjustment you disagree with. If it simply confirms your filed figures, no action is needed.",
      },
      {
        q: "How is a Section 143(2) notice different from Section 148?",
        a: "143(2) is a scrutiny notice examining the return you already filed for that year. Section 148 is a reassessment notice for a year where the department believes income wasn't assessed at all — it reopens a closed matter, not just reviews an open one.",
      },
      {
        q: "Does the Income Tax Act 2025 apply to my AY 2025-26 notice?",
        a: "No. Notices relating to FY 2025-26 (AY 2026-27) or earlier continue under the Income Tax Act, 1961. The new Act's renumbering applies to Tax Year 2026-27 onward.",
      },
      {
        q: "What's the single biggest driver of a scrutiny notice this year?",
        a: "AIS-vs-ITR mismatches — the department already holds third-party-reported data, and inconsistencies with what was filed are a leading trigger for both 143(1) adjustments and follow-on 143(2) scrutiny.",
      },
    ],
  },
];
