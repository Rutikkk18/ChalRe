// src/pages/Blog/BlogList.jsx
// Route: /blog
// Displays all blog posts in a responsive card grid with category filtering.
// SEO managed via react-helmet-async.

import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { getBlogPosts } from "../../data/blogs";
import BlogCard from "../../components/BlogCard";
import BlogHero from "../../components/BlogHero";
import Footer from "../../components/Footer";
import "../../styles/blog.css";

const SITE_URL = "https://chalre.in";

export default function BlogList() {
  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    getBlogPosts().then(setPosts);
  }, []);

  const filteredPosts =
    activeCategory === "All"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  return (
    <>
      <Helmet>
        <title>ChalRe Blog – Ride Sharing Tips &amp; Travel Guides</title>
        <meta
          name="description"
          content="Explore ride sharing tips, travel guides, student commute advice, and driver earning strategies from the ChalRe team. Travel smarter across Maharashtra."
        />
        <link rel="canonical" href={`${SITE_URL}/blog`} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta property="og:title" content="ChalRe Blog – Ride Sharing Tips &amp; Travel Guides" />
        <meta
          property="og:description"
          content="Explore ride sharing tips, travel guides, student commute advice, and driver earning strategies from the ChalRe team."
        />
        <meta property="og:image" content={`${SITE_URL}/preview.png`} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ChalRe Blog – Ride Sharing Tips &amp; Travel Guides" />
        <meta
          name="twitter:description"
          content="Explore ride sharing tips, travel guides, student commute advice, and driver earning strategies from the ChalRe team."
        />
        <meta name="twitter:image" content={`${SITE_URL}/preview.png`} />
      </Helmet>

      <div className="blog-page-wrapper">
        <BlogHero
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <main className="blog-main" id="blog-content">
          {filteredPosts.length > 0 ? (
            <section className="blog-grid-section">
              <div className="blog-grid">
                {filteredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : (
            <div className="blog-empty">
              <p>No articles in this category yet. Check back soon.</p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}
