/**
 * timeFormatter.js — Web (ChalRe)
 *
 * DISPLAY-ONLY utility. Converts HH:mm (24-hour) strings to 12-hour AM/PM
 * format for rendering in the UI.
 *
 * ⚠️  NEVER use this for:
 *   - API payloads (always send raw HH:mm)
 *   - new Date() construction
 *   - Duration / filter / expiry calculations
 *   - Offer Ride form inputs (CustomTimePicker / <input type="time">)
 *
 * Examples:
 *   formatTime12h("09:00") → "9:00 AM"
 *   formatTime12h("12:00") → "12:00 PM"
 *   formatTime12h("13:30") → "1:30 PM"
 *   formatTime12h("18:45") → "6:45 PM"
 *   formatTime12h("23:59") → "11:59 PM"
 *   formatTime12h("00:00") → "12:00 AM"
 *   formatTime12h(null)    → "—"
 */
export function formatTime12h(time) {
  if (!time) return "—";
  try {
    const [h, m] = time.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return time; // safe fallback — return raw value
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  } catch {
    return time; // absolute fallback — never crash
  }
}
