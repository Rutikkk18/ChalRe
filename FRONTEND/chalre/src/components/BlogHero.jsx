// src/components/BlogHero.jsx
// Hero section for the /blog list page.
// Contains the H1, subtitle, and category filter pills.

import "../styles/blog.css";

const ALL_CATEGORIES = [
  "All",
  "Travel Tips",
  "App Guide",
  "Student Life",
  "Commute",
  "Driver Tips",
];

export default function BlogHero({ activeCategory, onCategoryChange }) {
  return (
    <header className="blog-hero">
      <div className="blog-hero__inner">
        <div className="blog-hero__badge">ChalRe Blog</div>
        <h1 className="blog-hero__title">Travel Smarter Together</h1>
        <p className="blog-hero__subtitle">
          Ride sharing tips, travel guides, and stories from the ChalRe community.
        </p>

        <nav className="blog-filter-pills" aria-label="Filter blog posts by category">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`blog-filter-pill${activeCategory === cat ? " blog-filter-pill--active" : ""}`}
              onClick={() => onCategoryChange(cat)}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
