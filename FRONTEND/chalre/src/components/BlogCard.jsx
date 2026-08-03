// src/components/BlogCard.jsx
// Reusable card for the blog list grid and related posts section.
// Uses lazy image loading. Cover image uses a shared placeholder for Phase 1.

import { Link } from "react-router-dom";
import BlogMeta from "./BlogMeta";
import "../styles/blog.css";

export default function BlogCard({ post }) {
  return (
    <article className="blog-card" aria-label={post.title}>
      <Link to={`/blog/${post.slug}`} className="blog-card__image-link" tabIndex={-1} aria-hidden="true">
        <div className="blog-card__image-wrap">
          <img
            src={post.coverImage}
            alt={post.title}
            className="blog-card__cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </Link>

      <div className="blog-card__body">
        <span className="blog-category-badge">{post.category}</span>

        <h2 className="blog-card__title">
          <Link to={`/blog/${post.slug}`} className="blog-card__title-link">
            {post.title}
          </Link>
        </h2>

        <p className="blog-card__excerpt">{post.excerpt}</p>

        <div className="blog-card__footer">
          <BlogMeta post={post} compact />
          <Link
            to={`/blog/${post.slug}`}
            className="blog-card__read-more"
            aria-label={`Read more about ${post.title}`}
          >
            Read More →
          </Link>
        </div>
      </div>
    </article>
  );
}
