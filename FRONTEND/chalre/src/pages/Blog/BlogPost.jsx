// src/pages/Blog/BlogPost.jsx
// Route: /blog/:slug
// Individual blog article page with full SEO, JSON-LD (BlogPosting + BreadcrumbList),
// content block renderer, related articles, and CTA.

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getBlogBySlug, getRelatedPosts } from "../../data/blogs";
import { calculateReadingTime } from "../../utils/readingTime";
import BlogMeta from "../../components/BlogMeta";
import BlogCard from "../../components/BlogCard";
import Footer from "../../components/Footer";
import "../../styles/blog.css";

const SITE_URL = "https://chalre.in";

// ─── Content Block Renderer ───────────────────────────────────────────────────
function renderBlock(block, index) {
  switch (block.type) {
    case "paragraph":
      return <p key={index} className="blog-content__paragraph">{block.text}</p>;
    case "heading2":
      return <h2 key={index} className="blog-content__h2">{block.text}</h2>;
    case "heading3":
      return <h3 key={index} className="blog-content__h3">{block.text}</h3>;
    case "list":
      return (
        <ul key={index} className="blog-content__list">
          {block.items.map((item, i) => (
            <li key={i} className="blog-content__list-item">{item}</li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

// ─── JSON-LD: BlogPosting ─────────────────────────────────────────────────────
function BlogPostingJsonLd({ post, url, readingTime }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    author: {
      "@type": "Organization",
      name: "ChalRe",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "ChalRe",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/favicon.png`,
      },
    },
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    image: `${SITE_URL}${post.coverImage}`,
    keywords: post.keywords.join(", "),
    timeRequired: readingTime,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── JSON-LD: BreadcrumbList ──────────────────────────────────────────────────
function BreadcrumbJsonLd({ post }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBlogBySlug(slug).then((found) => {
      if (!found) {
        navigate("/blog", { replace: true });
        return;
      }
      setPost(found);
      getRelatedPosts(found.slug, found.category).then(setRelatedPosts);
      setLoading(false);
    });
  }, [slug, navigate]);

  if (loading || !post) {
    return (
      <div className="blog-loading" aria-live="polite">
        <div className="blog-loading__spinner" />
        <p>Loading article…</p>
      </div>
    );
  }

  const canonicalUrl = `${SITE_URL}/blog/${post.slug}`;
  const readingTime = calculateReadingTime(post.content);

  return (
    <>
      <Helmet>
        <title>{post.title} – ChalRe Blog</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.keywords.join(", ")} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${post.title} – ChalRe Blog`} />
        <meta property="og:description" content={post.metaDescription} />
        <meta property="og:image" content={`${SITE_URL}${post.coverImage}`} />
        <meta property="article:published_time" content={post.publishDate} />
        <meta property="article:author" content="ChalRe Team" />
        <meta property="article:section" content={post.category} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${post.title} – ChalRe Blog`} />
        <meta name="twitter:description" content={post.metaDescription} />
        <meta name="twitter:image" content={`${SITE_URL}${post.coverImage}`} />
      </Helmet>

      {/* JSON-LD structured data */}
      <BlogPostingJsonLd post={post} url={canonicalUrl} readingTime={readingTime} />
      <BreadcrumbJsonLd post={post} />

      <div className="blog-post-page">
        <article className="blog-post-wrapper">

          {/* ── Breadcrumb ── */}
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <ol className="blog-breadcrumb__list">
              <li>
                <Link to="/" className="blog-breadcrumb__link">Home</Link>
              </li>
              <li aria-hidden="true" className="blog-breadcrumb__sep">›</li>
              <li>
                <Link to="/blog" className="blog-breadcrumb__link">Blog</Link>
              </li>
              <li aria-hidden="true" className="blog-breadcrumb__sep">›</li>
              <li aria-current="page" className="blog-breadcrumb__current">
                {post.title}
              </li>
            </ol>
          </nav>

          {/* ── Post Header ── */}
          <header className="blog-post-header">
            <span className="blog-category-badge blog-category-badge--large">
              {post.category}
            </span>
            <h1 className="blog-post-title">{post.title}</h1>
            <BlogMeta post={post} />
          </header>

          {/* ── Cover Image ── */}
          <div className="blog-post-cover-wrap">
            <img
              src={post.coverImage}
              alt={post.title}
              className="blog-post-cover"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* ── Content ── */}
          <section className="blog-post-content" aria-label="Article content">
            {post.content.map((block, i) => renderBlock(block, i))}
          </section>

          {/* ── CTA ── */}
          <aside className="blog-post-cta" aria-label="Call to action">
            <div className="blog-post-cta__inner">
              <p className="blog-post-cta__heading">Ready to travel smarter?</p>
              <p className="blog-post-cta__sub">
                ChalRe is launching soon on Google Play. Find affordable rides near you — or share your empty seats and earn.
              </p>
              <div className="blog-post-cta__actions">
                <Link to="/search" className="blog-post-cta__btn blog-post-cta__btn--primary">
                  Find a Ride
                </Link>
                <Link to="/offer" className="blog-post-cta__btn blog-post-cta__btn--secondary">
                  Offer a Ride
                </Link>
              </div>
            </div>
          </aside>

          {/* ── Back Link ── */}
          <footer className="blog-post-footer">
            <Link to="/blog" className="blog-post-back">
              ← Back to Blog
            </Link>
          </footer>
        </article>

        {/* ── Related Articles ── */}
        {relatedPosts.length > 0 && (
          <section className="blog-related" aria-label="Related articles">
            <div className="blog-related__inner">
              <h2 className="blog-related__title">Related Articles</h2>
              <div className="blog-related__grid">
                {relatedPosts.map((rp) => (
                  <BlogCard key={rp.id} post={rp} />
                ))}
              </div>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </>
  );
}
