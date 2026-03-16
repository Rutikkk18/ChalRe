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
        /* Minimal — just clears the fixed navbar. Each page handles its own spacing. */
        /* Desktop: navbar = 72px + 8px top offset = 80px */
        .main-layout__content {
          padding-top: 82px;
        }

        @media (max-width: 1024px) {
          .main-layout__content {
            padding-top: 82px;
          }
        }

        /* Mobile ≤768px: navbar is 2 rows ~65px + 8px = ~73px */
        @media (max-width: 768px) {
          .main-layout__content {
            padding-top: 75px;
          }
        }

        @media (max-width: 480px) {
          .main-layout__content {
            padding-top: 70px;
          }
        }

        @media (max-width: 360px) {
          .main-layout__content {
            padding-top: 68px;
          }
        }
      `}</style>
    </>
  );
}