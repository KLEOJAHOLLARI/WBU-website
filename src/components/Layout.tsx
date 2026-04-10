import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {/* Add top padding only for non-home pages since home has full-bleed hero */}
      <main className={`flex-1 ${isHome ? "" : "pt-16"}`}>{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
