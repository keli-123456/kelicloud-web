import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { Outlet, useLocation } from "react-router-dom";
import { NodeListProvider } from "@/contexts/NodeListContext";

const IndexLayout = () => {
  // 使用我们的LiveDataContext
  const InnerLayout = () => {
    const location = useLocation();
    const isStandalonePublicPage = location.pathname === "/";
    return (
      <>
        <div
          className="layout flex min-h-screen w-full flex-col bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_32%),linear-gradient(180deg,_var(--background)_0%,_var(--accent-1)_100%)]"
        >
          <main
            className="main-content mx-auto my-1 h-full w-full max-w-[1600px]"
          >
            {!isStandalonePublicPage ? <NavBar /> : null}
            <Outlet />
          </main>
          {!isStandalonePublicPage ? <Footer /> : null}
        </div>
      </>
    );
  };

  return (
    <LiveDataProvider>
      <NodeListProvider>
        <InnerLayout />
      </NodeListProvider>
    </LiveDataProvider>
  );
};

export default IndexLayout;
