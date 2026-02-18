import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { logWarn } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logWarn("NotFound.404", { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <Link to="/" className="text-indigo-500 hover:text-indigo-400 underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
