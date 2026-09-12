import { useEffect } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Calendar, Clock, ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BLOG_POSTS } from "../lib/blogPosts";

export default function BlogPost() {
  const { slug } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  useEffect(() => {
    if (!post) return;
    const prevTitle = document.title;
    document.title = `${post.title} | NoticeDesk`;

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") ?? "";
    metaDesc?.setAttribute("content", post.metaDescription);

    // JSON-LD structured data — helps both search engines and AI answer
    // engines identify this as an Article with an attached FAQ, which is
    // one of the more reliable ways to get pulled into direct answers.
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: post.title,
          description: post.metaDescription,
          datePublished: post.date,
          author: { "@type": "Organization", name: "NoticeDesk" },
        },
        {
          "@type": "FAQPage",
          mainEntity: post.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    });
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      metaDesc?.setAttribute("content", prevDesc);
      document.head.removeChild(script);
    };
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  function handleEnterApp() {
    navigate(session ? "/app" : "/login");
  }

  const otherPost = BLOG_POSTS.find((p) => p.slug !== post.slug);

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
              Get Started <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-14 lg:px-8">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-black/50 hover:text-black">
          <ChevronLeft size={15} /> All guides
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] font-medium text-black/40">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {post.readTime}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight lg:text-[40px]">{post.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-black/60">{post.excerpt}</p>

        <article className="prose-notice mt-10 space-y-5 text-[15px] leading-[1.75] text-black/80">
          {post.content.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2 key={i} className="!mt-10 text-xl font-bold text-ink-950 lg:text-2xl">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "p") {
              return <p key={i}>{block.text}</p>;
            }
            if (block.type === "ul") {
              return (
                <ul key={i} className="list-disc space-y-2 pl-5">
                  {block.items?.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              );
            }
            if (block.type === "quote") {
              return (
                <div key={i} className="rounded-xl border border-brass/30 bg-brass-tint p-5 text-[14px] text-ink-800">
                  {block.text}
                </div>
              );
            }
            if (block.type === "table" && block.rows) {
              const [header, ...rows] = block.rows;
              return (
                <div key={i} className="overflow-x-auto rounded-xl border border-black/10">
                  <table className="w-full border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="bg-paper-dim">
                        {header.map((h, j) => (
                          <th key={j} className="border-b border-black/10 p-3 font-semibold text-ink-950">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, j) => (
                        <tr key={j} className="border-b border-black/5 last:border-0">
                          {row.map((cell, k) => (
                            <td key={k} className="p-3 align-top text-black/70">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })}
        </article>

        {/* FAQ block — structured Q&A reads well for both readers and AI-answer extraction */}
        <div className="mt-12 border-t border-black/10 pt-8">
          <h2 className="text-xl font-bold text-ink-950">Frequently asked questions</h2>
          <div className="mt-5 space-y-5">
            {post.faqs.map((f, i) => (
              <div key={i}>
                <p className="font-semibold text-ink-950">{f.q}</p>
                <p className="mt-1 text-sm leading-relaxed text-black/60">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {otherPost && (
          <Link
            to={`/blog/${otherPost.slug}`}
            className="mt-14 block rounded-2xl border border-black/10 bg-paper-dim p-6 transition hover:border-brass/50"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-brass-dark">Read next</p>
            <p className="mt-1 text-lg font-bold text-ink-950">{otherPost.title}</p>
          </Link>
        )}
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
