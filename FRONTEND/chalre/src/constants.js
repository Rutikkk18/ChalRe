// src/constants.js
// ─────────────────────────────────────────────────────────────────
// Adaptive Ride Listing — product configuration
// ─────────────────────────────────────────────────────────────────

/**
 * If the total number of active/searchable rides is at or below this
 * threshold, the Search page automatically displays all rides in a
 * paginated list so the app never feels empty at early stage.
 *
 * Once the platform exceeds this number the page reverts to
 * search-only mode automatically — no code change required.
 */
export const ACTIVE_RIDE_THRESHOLD = 40;

/** Number of ride cards shown on the first render in Auto List Mode. */
export const INITIAL_LOAD = 5;

/** Number of additional cards revealed on each "Load More" click. */
export const LOAD_MORE_BATCH = 5;
