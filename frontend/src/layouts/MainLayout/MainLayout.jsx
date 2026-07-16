import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "../../components/Sidebar/Sidebar";
import Navbar from "../../components/Navbar/Navbar";
import Loader from "../../components/Loader/Loader";
import ChangePasswordModal from "../../components/ChangePasswordModal/ChangePasswordModal";

import useForcePasswordChange from "../../hooks/useForcePasswordChange";

import "./MainLayout.css";

function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { loading, mustChangePassword, refreshProfile } =
    useForcePasswordChange();

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      <div className="layout-content">
        <Navbar
          setSidebarCollapsed={setSidebarCollapsed}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal
        isOpen={mustChangePassword}
        mustChangePassword={mustChangePassword}
        onClose={() => {}}
        onSuccess={refreshProfile}
      />
    </div>
  );
}

export default MainLayout;
