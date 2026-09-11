import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BLOG_POSTS } from "../lib/blogPosts";

export default function Blog() {
  const { session } = useAuth();
  const navigate = useNavigate();

  function handleEnterApp() {
    navigate(session ? "/app" : "/login");
  }

  return (
    <div className="min-h-screen bg-white text-ink-950">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-[1440px] grid-cols-[auto_1fr_auto] items-center px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 rotate-[-3deg] items-center justify-center rounded-[10px] bg-brass shadow-[0_2px_8px_rgba(255,199,0,0.4)]">
              <div className="grid h-7 w-7 -rotate-[3deg] place-items-center rounded-[7px] bg-black text-[15px] font-extrabold text-brass">
                N
              </div>
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Notice<span className="text-brass">Desk</span>
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-7 text-sm font-medium text-black/60 lg:flex">
            <Link to="/#features" className="transition hover:text-black">Features</Link>
            <Link to="/#how" className="transition hover:text-black">How it works</Link>
            <Link to="/#pricing" className="transition hover:text-black">Pricing</Link>
            <Link to="/blog" className="text-black">Blog</Link>
          </nav>

          <div className="flex items-center gap-3 justify-self-end">
            <button
              onClick={handleEnterApp}
              className="flex h-9 items-center gap-1.5 rounded-full bg-brass px-5 text-[13px] font-bold text-black shadow-[0_4px_12px_rgba(255,199,0,0.35)] transition hover:brightness-105"
            >
              Draft New Response <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1000px] px-6 py-16 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-widest text-brass">NoticeDesk Blog</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight lg:text-4xl">
          GST &amp; Income Tax notice guides for CAs
        </h1>
        <p className="mt-3 max-w-[640px] text-base text-black/60">
          Practical, current guides on GST and Income Tax notices — reply formats,
          deadlines, and what actually changes each year.
        </p>

        <div className="mt-10 space-y-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="block rounded-2xl border border-black/10 bg-white p-6 transition hover:border-brass/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] lg:p-8"
            >
              <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium text-black/40">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {post.readTime}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-bold leading-snug lg:text-2xl">{post.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-black/60">{post.excerpt}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-dark">
                Read guide <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-black/[0.06] bg-black py-10 text-white/60">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 text-sm lg:px-8">
          <Link to="/" className="font-bold text-white">NoticeDesk</Link>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/blog" className="hover:text-white">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
