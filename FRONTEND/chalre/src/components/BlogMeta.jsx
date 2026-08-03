// src/components/BlogMeta.jsx
// Displays author, publish date, and auto-calculated reading time for a post.
// Intentionally lightweight — no avatars, no icons library overhead.

import { calculateReadingTime } from "../utils/readingTime";
import "../styles/blog.css";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogMeta({ post, compact = false }) {
  const readingTime = calculateReadingTime(post.content);

  return (
    <div className={`blog-meta${compact ? " blog-meta--compact" : ""}`}>
      <span className="blog-meta__author">By {post.author}</span>
      <span className="blog-meta__dot" aria-hidden="true">·</span>
      <time className="blog-meta__date" dateTime={post.publishDate}>
        {formatDate(post.publishDate)}
      </time>
      <span className="blog-meta__dot" aria-hidden="true">·</span>
      <span className="blog-meta__reading-time">{readingTime}</span>
    </div>
  );
}
