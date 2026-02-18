import { useState, useRef, useEffect } from "react";
import "../styles/CustomDatePicker.css";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function CustomDatePicker({ value, onChange, placeholder = "Date" }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  const selected = parseDate(value);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth());
  const [mode, setMode] = useState("days"); // "days" | "months" | "years"
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setMode("days");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1; // Monday = 0
  };

  const isSameDay = (a, b) =>
    a && b &&
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  const isBeforeToday = (date) => date < today;

  const handleDayClick = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    if (isBeforeToday(d)) return;
    const str = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(str);
    setOpen(false);
    setMode("days");
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const formatDisplay = () => {
    if (!selected) return "";
    return `${String(selected.getDate()).padStart(2, "0")} ${MONTHS[selected.getMonth()].slice(0, 3)} ${selected.getFullYear()}`;
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="cdp-cell empty" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const disabled = isBeforeToday(date);
      const isToday = isSameDay(date, today);
      const isSelected = selected && isSameDay(date, selected);

      cells.push(
        <button
          key={d}
          className={`cdp-cell day
            ${disabled ? "disabled" : ""}
            ${isToday ? "today" : ""}
            ${isSelected ? "selected" : ""}
          `}
          onClick={() => !disabled && handleDayClick(d)}
          disabled={disabled}
          type="button"
        >
          {d}
        </button>
      );
    }

    return cells;
  };

  const currentYear = today.getFullYear();
  const yearRange = Array.from({ length: 5 }, (_, i) => currentYear + i);

  return (
    <div className="cdp-wrapper" ref={ref}>
      <div
        className={`cdp-trigger ${open ? "active" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <svg className="cdp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span className={`cdp-value ${!value ? "placeholder" : ""}`}>
          {value ? formatDisplay() : placeholder}
        </span>
      </div>

      {open && (
        <div className="cdp-dropdown">
          {/* Header */}
          <div className="cdp-header">
            <button className="cdp-nav" onClick={prevMonth} type="button" disabled={mode !== "days"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <div className="cdp-header-labels">
              <button
                className="cdp-month-label"
                onClick={() => setMode(mode === "months" ? "days" : "months")}
                type="button"
              >
                {MONTHS[viewMonth]}
              </button>
              <button
                className="cdp-year-label"
                onClick={() => setMode(mode === "years" ? "days" : "years")}
                type="button"
              >
                {viewYear}
              </button>
            </div>

            <button className="cdp-nav" onClick={nextMonth} type="button" disabled={mode !== "days"}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Mode: Days */}
          {mode === "days" && (
            <>
              <div className="cdp-weekdays">
                {DAYS.map(d => <div key={d} className="cdp-weekday">{d}</div>)}
              </div>
              <div className="cdp-grid">
                {renderDays()}
              </div>
              <div className="cdp-footer">
                <button
                  className="cdp-today-btn"
                  type="button"
                  onClick={() => {
                    const str = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                    onChange(str);
                    setViewYear(today.getFullYear());
                    setViewMonth(today.getMonth());
                    setOpen(false);
                  }}
                >
                  Today
                </button>
                {value && (
                  <button
                    className="cdp-clear-btn"
                    type="button"
                    onClick={() => { onChange(""); setOpen(false); }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}

          {/* Mode: Months */}
          {mode === "months" && (
            <div className="cdp-months-grid">
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  className={`cdp-month-cell ${i === viewMonth ? "selected" : ""}`}
                  type="button"
                  onClick={() => { setViewMonth(i); setMode("days"); }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Mode: Years */}
          {mode === "years" && (
            <div className="cdp-years-grid">
              {yearRange.map(y => (
                <button
                  key={y}
                  className={`cdp-year-cell ${y === viewYear ? "selected" : ""}`}
                  type="button"
                  onClick={() => { setViewYear(y); setMode("days"); }}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}