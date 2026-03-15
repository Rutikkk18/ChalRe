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

        @media (max-width: 1024px) {
          .main-layout__content {
            padding-top: 90px;
          }
        }

        @media (max-width: 900px) {
          .main-layout__content {
            padding-top: 90px;
          }
        }

        /* Mobile ≤768px: now 2 rows (logo + links row), ~75px total */
        @media (max-width: 768px) {
          .main-layout__content {
            padding-top: 90px;
          }
        }

        @media (max-width: 480px) {
          .main-layout__content {
            padding-top: 85px;
          }
        }

        @media (max-width: 360px) {
          .main-layout__content {
            padding-top: 80px;
          }
        }
      `}</style>
    </>
  );
}