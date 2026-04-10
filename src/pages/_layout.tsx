import { Outlet, useLocation } from "react-router-dom";
import { LiveDataProvider } from "@/contexts/LiveDataContext";
import { NodeListProvider } from "@/contexts/NodeListContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";

const IndexLayout = () => {
  const location = useLocation();
  const isStandalonePublicPage = location.pathname === "/";
  const instanceMatch = location.pathname.match(/^\/instance\/([^/]+)/);
  const instanceUUID = instanceMatch?.[1]
    ? decodeURIComponent(instanceMatch[1])
    : undefined;

  const content = (
    <div className="layout flex min-h-screen min-h-[100dvh] w-full flex-col bg-background">
      <main className="main-content mx-auto my-1 flex w-full max-w-[1600px] flex-1 min-h-0 flex-col">
        {!isStandalonePublicPage ? <NavBar /> : null}
        <Outlet />
      </main>
      {!isStandalonePublicPage ? <Footer /> : null}
    </div>
  );

  return (
    <NodeListProvider>
      {location.pathname === "/" ? (
        <LiveDataProvider>{content}</LiveDataProvider>
      ) : instanceUUID ? (
        <LiveDataProvider uuid={instanceUUID}>{content}</LiveDataProvider>
      ) : (
        content
      )}
    </NodeListProvider>
  );
};

export default IndexLayout;
