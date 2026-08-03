/**
 * readingTime.js
 * Calculates estimated reading time from a blog post's content blocks.
 * Content is stored as an array of typed blocks (paragraph, heading2, heading3, list).
 * Average reading speed: 200 words per minute.
 */

const WORDS_PER_MINUTE = 200;

/**
 * Extracts all text from a content block array and estimates reading time.
 * @param {Array} contentBlocks - Array of { type, text?, items? } objects
 * @returns {string} e.g. "4 min read"
 */
export function calculateReadingTime(contentBlocks) {
  if (!Array.isArray(contentBlocks) || contentBlocks.length === 0) {
    return "1 min read";
  }

  let totalWords = 0;

  for (const block of contentBlocks) {
    if (block.text) {
      totalWords += countWords(block.text);
    }
    if (Array.isArray(block.items)) {
      for (const item of block.items) {
        totalWords += countWords(item);
      }
    }
  }

  const minutes = Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}
