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
        /* Just clear the fixed navbar height — page CSS handles internal spacing */
        /* Desktop: navbar height 72px + top 8px = 80px */
        .main-layout__content {
          padding-top: 85px;
        }

        @media (max-width: 1024px) {
          .main-layout__content {
            padding-top: 85px;
          }
        }

        /* Mobile ≤768px: navbar is now 2 rows ~65px + top 8px = ~73px */
        @media (max-width: 768px) {
          .main-layout__content {
            padding-top: 80px;
          }
        }

        @media (max-width: 480px) {
          .main-layout__content {
            padding-top: 75px;
          }
        }

        @media (max-width: 360px) {
          .main-layout__content {
            padding-top: 72px;
          }
        }
      `}</style>
    </>
  );
}