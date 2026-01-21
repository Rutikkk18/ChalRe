import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? "admin-link active" : "admin-link";
    };

    return (
        <div className="admin-layout">
            {/* Rewrite Navbar for Admin or reuse global? reuse Global for now but maybe simplified */}
            <Navbar />

            <div className="admin-container">
                {/* Sidebar */}
                <aside className="admin-sidebar">
                    <h3>Admin Panel</h3>
                    <nav>
                        <Link to="/admin/dashboard" className={isActive("/admin/dashboard")}>
                            Dashboard
                        </Link>
                        <Link to="/admin/verifications" className={isActive("/admin/verifications") || location.pathname.startsWith("/admin/verifications") ? "admin-link active" : "admin-link"}>
                            Driver Verifications
                        </Link>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>

            <style>{`
        .admin-container {
          display: flex;
          min-height: calc(100vh - 60px); /* Adjust based on navbar height */
          background-color: #f8f9fa;
        }

        .admin-sidebar {
          width: 250px;
          background-color: #fff;
          border-right: 1px solid #e0e0e0;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }

        .admin-sidebar h3 {
          margin-bottom: 20px;
          font-size: 1.2rem;
          color: #333;
          font-weight: 600;
          padding-left: 10px;
        }

        .admin-link {
          display: block;
          padding: 10px 15px;
          margin-bottom: 5px;
          text-decoration: none;
          color: #555;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .admin-link:hover {
          background-color: #f0f0f0;
          color: #333;
        }

        .admin-link.active {
          background-color: #e6f4ea; /* Light green theme */
          color: #1b5e20;
          font-weight: 500;
        }

        .admin-content {
          flex: 1;
          padding: 30px;
          overflow-y: auto;
        }
        
        @media (max-width: 768px) {
          .admin-container {
            flex-direction: column;
          }
          .admin-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
          }
        }
      `}</style>
        </div>
    );
}
