import type { MetadataRoute } from "next";

const SITE_URL = "https://aurisai.com";

// Static route map for crawlers. Keep in sync with the app/ directory when pages
// are added or removed.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/how-it-works", "/specs", "/about", "/privacy", "/terms"];
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
