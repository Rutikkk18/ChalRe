import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <>
      <Navbar />
      <main className="main-layout__content">
        <Outlet />
      </main>
      <style>{`
        /* Desktop: navbar single row, height 4.5rem (72px) + top 8px offset */
        .main-layout__content {
          padding-top: 90px;
        }

        /* Large tablet: navbar still single row */
        @media (max-width: 1024px) {
          .main-layout__content {
            padding-top: 90px;
          }
        }

        /* Tablet: navbar starts feeling tighter */
        @media (max-width: 900px) {
          .main-layout__content {
            padding-top: 95px;
          }
        }

        /* Mobile ≤768px: navbar wraps into 3 rows
           logo (~32px) + gap(12px) + links (~20px) + gap(12px) + button (~40px)
           + padding top/bottom (28px) + top offset (8px) ≈ 152px */
        @media (max-width: 768px) {
          .main-layout__content {
            padding-top: 160px;
          }
        }

        /* Small mobile ≤480px: same 3 rows, padding tightens to 12px ≈ 148px */
        @media (max-width: 480px) {
          .main-layout__content {
            padding-top: 155px;
          }
        }

        /* Very small screens e.g. older/budget phones */
        @media (max-width: 360px) {
          .main-layout__content {
            padding-top: 160px;
          }
        }
      `}</style>
    </>
  );
}