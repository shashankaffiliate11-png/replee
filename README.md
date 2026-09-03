# NoticeDesk

GST & Income Tax notice response drafting for practicing Chartered Accountants in India.

**Stack:** React + TypeScript + Vite + Tailwind CSS + Supabase (Postgres, Auth, Edge Functions) + Claude API for drafting + Razorpay for billing (stubbed, see below).

---

## 1. What's in this codebase

```
src/
  pages/          Landing page, login, onboarding, dashboard, new draft,
                   draft detail/review, history, settings, pricing
  components/      AppShell (sidebar), AuthModal (Google/Apple), ProtectedRoute
  context/         AuthContext — wraps Supabase auth session
  lib/             supabaseClient, database types, pricing plan definitions

supabase/
  migrations/0001_init.sql        All tables + Row Level Security policies
  functions/draft-notice/         Edge function: calls Claude, enforces plan
                                   limits, saves the draft
  functions/razorpay-webhook/     Edge function: subscription webhook stub
  config.toml                     Local Supabase project config
```

This is a working, runnable codebase — not a mockup. The one thing you must
supply yourself is a live Supabase project and API keys, because none of
those can be created on your behalf.

---

## 2. Prerequisites

- Node.js 18+ and npm
- A free [Supabase](https://supabase.com) account
- An [Anthropic API key](https://console.anthropic.com) (for the drafting engine)
- (Later, for real payments) A [Razorpay](https://razorpay.com) account

---

## 3. Set up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy your **Project URL** and **anon public key**.
3. Copy `.env.example` to `.env` and paste those two values in.
4. Run the schema migration. Easiest path — open **SQL Editor** in the
   Supabase dashboard, paste the contents of `supabase/migrations/0001_init.sql`,
   and run it. (Or, if you have the Supabase CLI installed: `npx supabase db push`.)

This creates four tables — `profiles`, `notices`, `usage_counters`,
`subscriptions` — all with Row Level Security enabled so each CA can only
ever see their own data.

---

## 4. Set up Google sign-in

1. In the [Google Cloud Console](https://console.cloud.google.com), create
   an OAuth 2.0 Client ID (type: Web application).
2. Add this authorized redirect URI (replace with your actual project ref):
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. In Supabase Dashboard → **Authentication → Providers → Google**, paste
   your Client ID and Client Secret, and enable the provider.

## 5. Set up Apple sign-in

Apple's setup is more involved and requires a paid Apple Developer account:

1. In the [Apple Developer portal](https://developer.apple.com/account),
   create a Services ID, enable "Sign in with Apple," and register the
   redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. Generate a private key for Sign in with Apple and note your Team ID,
   Key ID, and Services ID.
3. In Supabase Dashboard → **Authentication → Providers → Apple**, enter
   these details and enable the provider.

Supabase's own guide has the exact screen-by-screen steps for both:
https://supabase.com/docs/guides/auth/social-login

**You can ship with Google only first** and add Apple once you have paying
users — nothing else in the app depends on Apple being configured. The
"Continue with Apple" button will just show an error until it's set up.

---

## 6. Deploy the edge function (the actual AI drafting logic)

The `draft-notice` function is what calls Claude and enforces plan limits —
it must run on Supabase, not in the browser, so your Anthropic key is never
exposed to users.

```bash
npm install -g supabase   # if you don't have the CLI yet
supabase login
supabase link --project-ref <your-project-ref>

# Set the secrets the function needs:
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here

# Deploy:
supabase functions deploy draft-notice
```

The function already has access to `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` automatically — Supabase injects those for every
edge function, you don't set them yourself.

---

## 7. Run it locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. Sign in, and on first login you'll land on
a short onboarding form, then the dashboard.

---

## 8. Billing (Razorpay) — full setup

The pricing plans themselves live in one file: `src/lib/plans.ts`. Edit the
`priceInr`, `noticesPerMonth`, and `features` there and every page (landing,
pricing, dashboard usage bar) updates automatically.

The full checkout flow is now wired up end to end:
`PricingPage.tsx` → `create-razorpay-subscription` edge function (creates
the subscription server-side) → Razorpay's Checkout widget opens in the
browser → on payment, Razorpay calls `razorpay-webhook` → that updates
`subscriptions` and `profiles.plan`. Here's how to activate it:

1. **Create a Razorpay account** at [razorpay.com](https://razorpay.com) and
   complete business KYC (this is the one step nobody can do on your behalf
   — Razorpay requires it before live payments work; test mode works
   immediately without KYC).

2. **Create two Plans** in Razorpay Dashboard → Subscriptions → Plans:
   - "Starter" — ₹999, monthly billing cycle
   - "Professional" — ₹2,499, monthly billing cycle

   Each gives you a Plan ID like `plan_ABC123XYZ`.

3. **Get your API keys**: Dashboard → Settings → API Keys → generate a
   Key ID and Key Secret (use Test Mode keys first, switch to Live once
   you're ready for real payments).

4. **Set edge function secrets:**
   ```bash
   supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
   supabase secrets set RAZORPAY_KEY_SECRET=your_key_secret
   supabase secrets set RAZORPAY_PLAN_STARTER=plan_your_starter_plan_id
   supabase secrets set RAZORPAY_PLAN_PROFESSIONAL=plan_your_professional_plan_id
   ```

5. **Deploy both Razorpay-related functions:**
   ```bash
   supabase functions deploy create-razorpay-subscription
   supabase functions deploy razorpay-webhook --no-verify-jwt
   ```
   (`--no-verify-jwt` matters for the webhook — Razorpay calls it directly,
   with no Supabase user session attached.)

6. **Fill in the plan map** in
   `supabase/functions/razorpay-webhook/index.ts` — replace the commented-out
   lines in `RAZORPAY_PLAN_MAP` with your real Plan IDs from step 2:
   ```ts
   const RAZORPAY_PLAN_MAP: Record<string, "starter" | "professional"> = {
     "plan_your_starter_plan_id": "starter",
     "plan_your_professional_plan_id": "professional",
   };
   ```
   Redeploy the webhook after editing this.

7. **Register the webhook URL** in Razorpay Dashboard → Settings → Webhooks
   → Add New Webhook. URL:
   `https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook`.
   Enable these events: `subscription.activated`, `subscription.charged`,
   `subscription.cancelled`, `subscription.completed`. Razorpay will show
   you a webhook secret — set it:
   ```bash
   supabase secrets set RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxx
   ```

8. **Test it**: on `/pricing`, signed in, click "Choose plan" on Starter.
   You should see Razorpay's checkout widget open. Use
   [Razorpay's test card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/)
   in Test Mode. On success, the pricing page polls your profile for a few
   seconds and redirects to Settings once the webhook has flipped your plan.

**Before Razorpay is fully configured**, everyone who signs up sits on the
`free_trial` plan (3 drafts/month) — which is fine for your first week of
outreach: let early CAs try it free, and manually flip their `profiles.plan`
to `starter` in the Supabase table editor once they pay you directly (UPI/
bank transfer is completely fine for your first 10–20 customers — don't
block launch on finishing this section).

---

## 9. Deploy the frontend

Any static host works since this is a Vite app. Simplest: [Vercel](https://vercel.com).

```bash
npm run build
```

Push to GitHub, import the repo in Vercel, set the two `VITE_SUPABASE_*` env
vars in Vercel's project settings, deploy. Then go back to Supabase →
Authentication → URL Configuration and add your production URL (e.g.
`https://noticedesk.vercel.app/auth/callback`) to the allowed redirect URLs
— otherwise sign-in will work locally but fail in production.

---

## 10. The AI prompt — where to tune it

`supabase/functions/draft-notice/index.ts` contains `SYSTEM_PROMPT`, which
controls how the draft is structured and worded. As you get feedback from
your first CA users on tone, formatting, or what's missing, this is the one
place to adjust it — no frontend changes needed.

---

## 11. A note on liability

The product is deliberately framed everywhere — landing page, sign-in modal,
draft screen — as producing a **draft for professional review**, never a
final filing. Keep that framing when you talk to CAs too: you are not
claiming the AI is right, you're claiming it saves them the blank-page
problem. Don't remove those disclaimers to make the product feel more
"finished" — they're doing real liability work.
