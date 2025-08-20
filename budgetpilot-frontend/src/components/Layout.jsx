import React from "react";
import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="page-wrapper">
      <header className="header"></header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer"></footer>
    </div>
  );
}

export default Layout;
