import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    const pageTitle = "Page Not Found — Gene Expression Explorer";
    const pageDesc =
      "The page you're looking for doesn't exist. Return to the Gene Expression Explorer dashboard.";

    const getMeta = (selector: string) => document.querySelector(selector) as HTMLMetaElement | null;
    const setMeta = (selector: string, value: string) => {
      const el = getMeta(selector);
      if (el) el.setAttribute("content", value);
    };

    const prev = {
      title: document.title,
      desc: getMeta('meta[name="description"]')?.getAttribute("content") ?? null,
      ogTitle: getMeta('meta[property="og:title"]')?.getAttribute("content") ?? null,
      ogDesc: getMeta('meta[property="og:description"]')?.getAttribute("content") ?? null,
      twTitle: getMeta('meta[name="twitter:title"]')?.getAttribute("content") ?? null,
      twDesc: getMeta('meta[name="twitter:description"]')?.getAttribute("content") ?? null,
    };

    document.title = pageTitle;
    setMeta('meta[name="description"]', pageDesc);
    setMeta('meta[property="og:title"]', pageTitle);
    setMeta('meta[property="og:description"]', pageDesc);
    setMeta('meta[name="twitter:title"]', pageTitle);
    setMeta('meta[name="twitter:description"]', pageDesc);

    return () => {
      document.title = prev.title;
      if (prev.desc) setMeta('meta[name="description"]', prev.desc);
      if (prev.ogTitle) setMeta('meta[property="og:title"]', prev.ogTitle);
      if (prev.ogDesc) setMeta('meta[property="og:description"]', prev.ogDesc);
      if (prev.twTitle) setMeta('meta[name="twitter:title"]', prev.twTitle);
      if (prev.twDesc) setMeta('meta[name="twitter:description"]', prev.twDesc);
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
